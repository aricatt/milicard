import path from 'path';
import fs from 'fs';

type LocaleMessages = Record<string, unknown>;

type DiffResult = {
  missingKeys: string[];
  extraKeys: string[];
  emptyKeys: string[];
};

function isDirectory(p: string): boolean {
  try {
    return fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
}

function listLocaleDirs(localesRoot: string): string[] {
  return fs
    .readdirSync(localesRoot)
    .map((name) => path.join(localesRoot, name))
    .filter((fullPath) => isDirectory(fullPath))
    .map((fullPath) => path.basename(fullPath));
}

function parseLangList(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
}

function filterLangs(allLangs: string[], include: string[], exclude: string[]): string[] {
  let langs = [...allLangs];
  if (include.length) {
    const includeSet = new Set(include);
    langs = langs.filter((l) => includeSet.has(l));
  }
  if (exclude.length) {
    const excludeSet = new Set(exclude);
    langs = langs.filter((l) => !excludeSet.has(l));
  }
  return langs;
}

function listLocaleFiles(localeDir: string): string[] {
  return fs
    .readdirSync(localeDir)
    .filter((name) => name.endsWith('.ts') || name.endsWith('.tsx'))
    .filter((name) => !name.endsWith('.d.ts'))
    .sort();
}

async function loadMessages(modulePath: string): Promise<LocaleMessages> {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require(modulePath);
  const messages: unknown = mod?.default ?? mod;
  if (!messages || typeof messages !== 'object' || Array.isArray(messages)) {
    throw new Error(`Invalid locale module export: ${modulePath}`);
  }
  return messages as LocaleMessages;
}

function toStringKey(value: unknown): string | null {
  if (typeof value === 'string') return value;
  return null;
}

function diffKeys(base: LocaleMessages, target: LocaleMessages): DiffResult {
  const baseKeys = new Set(Object.keys(base));
  const targetKeys = new Set(Object.keys(target));

  const missingKeys: string[] = [];
  const extraKeys: string[] = [];
  const emptyKeys: string[] = [];

  for (const k of baseKeys) {
    if (!targetKeys.has(k)) missingKeys.push(k);
  }

  for (const k of targetKeys) {
    if (!baseKeys.has(k)) extraKeys.push(k);
  }

  for (const k of targetKeys) {
    const v = toStringKey(target[k]);
    if (v === null) continue;
    if (v.trim().length === 0) emptyKeys.push(k);
  }

  missingKeys.sort();
  extraKeys.sort();
  emptyKeys.sort();

  return { missingKeys, extraKeys, emptyKeys };
}

function formatList(items: string[], limit = 50): string {
  const head = items.slice(0, limit);
  const more = items.length > limit ? `\n  ...and ${items.length - limit} more` : '';
  return head.map((x) => `  - ${x}`).join('\n') + more;
}

async function main(): Promise<void> {
  const localesRoot = path.resolve(__dirname, '..', 'src', 'locales');
  const baseLang = 'en-US';
  const baseDir = path.join(localesRoot, baseLang);

  if (!isDirectory(baseDir)) {
    throw new Error(`Base locale directory not found: ${baseDir}`);
  }

  const baseFiles = listLocaleFiles(baseDir);
  if (baseFiles.length === 0) {
    throw new Error(`No locale files found in base locale directory: ${baseDir}`);
  }

  const allLangs = listLocaleDirs(localesRoot).filter((l) => l !== baseLang).sort();
  const includeLangs = parseLangList(process.env.I18N_INCLUDE);
  const excludeLangs = parseLangList(process.env.I18N_EXCLUDE);
  const langs = filterLangs(allLangs, includeLangs, excludeLangs).sort();

  let hasError = false;

  for (const lang of langs) {
    const langDir = path.join(localesRoot, lang);
    const langFiles = listLocaleFiles(langDir);

    const missingFiles = baseFiles.filter((f) => !langFiles.includes(f));
    const extraFiles = langFiles.filter((f) => !baseFiles.includes(f));

    if (missingFiles.length || extraFiles.length) {
      hasError = true;
      // eslint-disable-next-line no-console
      console.error(`\n[i18n-check] Locale "${lang}" file set mismatch:`);
      if (missingFiles.length) {
        // eslint-disable-next-line no-console
        console.error(`Missing files (${missingFiles.length}):\n${formatList(missingFiles)}`);
      }
      if (extraFiles.length) {
        // eslint-disable-next-line no-console
        console.error(`Extra files (${extraFiles.length}):\n${formatList(extraFiles)}`);
      }
    }

    for (const file of baseFiles) {
      const baseFilePath = path.join(baseDir, file);
      const targetFilePath = path.join(langDir, file);

      if (!fs.existsSync(targetFilePath)) continue;

      const baseMessages = await loadMessages(baseFilePath);
      const targetMessages = await loadMessages(targetFilePath);
      const { missingKeys, extraKeys, emptyKeys } = diffKeys(baseMessages, targetMessages);

      if (missingKeys.length || extraKeys.length || emptyKeys.length) {
        hasError = true;
        // eslint-disable-next-line no-console
        console.error(`\n[i18n-check] Locale "${lang}" mismatch in ${file}:`);
        if (missingKeys.length) {
          // eslint-disable-next-line no-console
          console.error(`Missing keys (${missingKeys.length}):\n${formatList(missingKeys)}`);
        }
        if (extraKeys.length) {
          // eslint-disable-next-line no-console
          console.error(`Extra keys (${extraKeys.length}):\n${formatList(extraKeys)}`);
        }
        if (emptyKeys.length) {
          // eslint-disable-next-line no-console
          console.error(`Empty values (${emptyKeys.length}):\n${formatList(emptyKeys)}`);
        }
      }
    }
  }

  if (hasError) {
    process.exit(1);
  }

  // eslint-disable-next-line no-console
  console.log(
    `[i18n-check] OK. Base=${baseLang}, locales checked=${langs.length}: ${langs.join(', ')}`,
  );
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(`[i18n-check] Failed: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
