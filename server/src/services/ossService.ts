import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

interface OSSConfig {
  region: string;
  accessKeyId: string;
  accessKeySecret: string;
  bucket: string;
  endpoint?: string;
}

class OSSService {
  private client: any = null;
  private config: OSSConfig | null = null;
  private useLocalStorage: boolean = true;
  private localUploadPath: string;

  constructor() {
    this.localUploadPath = process.env.UPLOAD_PATH || './uploads/point-visits';
    this.initializeClient();
  }

  private initializeClient() {
    const region = process.env.OSS_REGION;
    const accessKeyId = process.env.OSS_ACCESS_KEY_ID;
    const accessKeySecret = process.env.OSS_ACCESS_KEY_SECRET;
    const bucket = process.env.OSS_BUCKET;
    const endpoint = process.env.OSS_ENDPOINT;

    if (!region || !accessKeyId || !accessKeySecret || !bucket) {
      console.warn('OSS configuration is incomplete. Using local file storage as fallback.');
      this.useLocalStorage = true;
      this.ensureUploadDirectory();
      return;
    }

    try {
      // 动态导入 ali-oss，如果未安装则使用本地存储
      const OSS = require('ali-oss');
      this.config = {
        region,
        accessKeyId,
        accessKeySecret,
        bucket,
        endpoint,
      };
      this.client = new OSS(this.config);
      this.useLocalStorage = false;
      console.log('OSS client initialized successfully');
    } catch (error) {
      console.warn('ali-oss module not found. Using local file storage as fallback.');
      this.useLocalStorage = true;
      this.ensureUploadDirectory();
    }
  }

  private ensureUploadDirectory() {
    if (!fs.existsSync(this.localUploadPath)) {
      fs.mkdirSync(this.localUploadPath, { recursive: true });
      console.log(`Created local upload directory: ${this.localUploadPath}`);
    }
  }

  /**
   * Upload file buffer to OSS
   * @param buffer File buffer
   * @param originalName Original filename
   * @param folder Folder path in OSS (e.g., 'point-visits')
   * @returns OSS file URL
   */
  async uploadFile(buffer: Buffer, originalName: string, folder: string = 'uploads'): Promise<string> {
    const ext = path.extname(originalName);
    const filename = `${uuidv4()}${ext}`;
    const objectName = `${folder}/${filename}`;

    // 使用本地存储
    if (this.useLocalStorage) {
      try {
        const folderPath = path.join(this.localUploadPath, folder);
        if (!fs.existsSync(folderPath)) {
          fs.mkdirSync(folderPath, { recursive: true });
        }
        
        const filePath = path.join(folderPath, filename);
        fs.writeFileSync(filePath, buffer);
        
        // 返回相对URL路径
        const baseUrl = process.env.BASE_URL || 'http://localhost:6801';
        return `${baseUrl}/uploads/${folder}/${filename}`;
      } catch (error) {
        console.error('Failed to save file locally:', error);
        throw new Error('Failed to save file locally');
      }
    }

    // 使用OSS
    try {
      const result = await this.client.put(objectName, buffer);
      
      // 根据环境变量决定返回签名URL还是普通URL
      // OSS_USE_SIGNED_URL=true: 返回签名URL（私有Bucket）
      // OSS_USE_SIGNED_URL=false: 返回普通URL（公共读Bucket）
      const useSignedUrl = process.env.OSS_USE_SIGNED_URL !== 'false';
      
      if (useSignedUrl) {
        return this.getSignedUrl(objectName);
      } else {
        return result.url; // 公共读Bucket的普通URL
      }
    } catch (error) {
      console.error('Failed to upload file to OSS:', error);
      throw new Error('Failed to upload file to OSS');
    }
  }

  /**
   * Upload multiple files to OSS
   * @param files Array of file buffers with original names
   * @param folder Folder path in OSS
   * @returns Array of OSS file URLs
   */
  async uploadFiles(
    files: Array<{ buffer: Buffer; originalName: string }>,
    folder: string = 'uploads'
  ): Promise<string[]> {
    const uploadPromises = files.map((file) => this.uploadFile(file.buffer, file.originalName, folder));
    return Promise.all(uploadPromises);
  }

  /**
   * Delete file from OSS or local storage
   * @param url File URL
   */
  async deleteFile(url: string): Promise<void> {
    // 使用本地存储
    if (this.useLocalStorage) {
      try {
        const filePath = this.extractLocalPathFromUrl(url);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (error) {
        console.error('Failed to delete local file:', error);
      }
      return;
    }

    // 使用OSS
    try {
      const objectName = this.extractObjectNameFromUrl(url);
      await this.client.delete(objectName);
    } catch (error) {
      console.error('Failed to delete file from OSS:', error);
      throw new Error('Failed to delete file from OSS');
    }
  }

  /**
   * Delete multiple files from OSS or local storage
   * @param urls Array of file URLs
   */
  async deleteFiles(urls: string[]): Promise<void> {
    // 使用本地存储
    if (this.useLocalStorage) {
      for (const url of urls) {
        try {
          await this.deleteFile(url);
        } catch (error) {
          console.error('Failed to delete local file:', url, error);
        }
      }
      return;
    }

    // 使用OSS
    try {
      const objectNames = urls.map((url) => this.extractObjectNameFromUrl(url));
      await this.client.deleteMulti(objectNames);
    } catch (error) {
      console.error('Failed to delete files from OSS:', error);
      throw new Error('Failed to delete files from OSS');
    }
  }

  /**
   * Extract object name from OSS URL
   * @param url OSS file URL
   * @returns Object name
   */
  private extractObjectNameFromUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      // Remove leading slash
      return urlObj.pathname.substring(1);
    } catch (error) {
      // If URL parsing fails, assume it's already an object name
      return url;
    }
  }

  /**
   * Extract local file path from URL
   * @param url Local file URL
   * @returns Local file path
   */
  private extractLocalPathFromUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      // Extract path after /uploads/point-visits/
      const relativePath = urlObj.pathname.replace('/uploads/point-visits/', '');
      return path.join(this.localUploadPath, relativePath);
    } catch (error) {
      // If URL parsing fails, try to extract from string
      const match = url.match(/\/uploads\/point-visits\/(.+)$/);
      if (match) {
        return path.join(this.localUploadPath, match[1]);
      }
      return url;
    }
  }

  /**
   * Check if file storage is available (OSS or local)
   */
  isAvailable(): boolean {
    return true; // 总是可用，因为有本地存储作为备选
  }

  /**
   * Check if using OSS or local storage
   */
  isUsingOSS(): boolean {
    return !this.useLocalStorage;
  }

  /**
   * Generate signed URL for private bucket access
   * @param objectName Object name in OSS
   * @param expiresInSeconds URL expiration time in seconds (default: 24 hours)
   * @returns Signed URL
   */
  getSignedUrl(objectName: string, expiresInSeconds: number = 86400): string {
    if (this.useLocalStorage) {
      // 本地存储直接返回URL
      const baseUrl = process.env.BASE_URL || 'http://localhost:6801';
      return `${baseUrl}/uploads/${objectName}`;
    }

    try {
      // 生成OSS签名URL（默认24小时有效）
      const url = this.client.signatureUrl(objectName, {
        expires: expiresInSeconds,
      });
      return url;
    } catch (error) {
      console.error('Failed to generate signed URL:', error);
      // 如果签名失败，返回普通URL（适用于公共读Bucket）
      return `https://${this.config?.bucket}.${this.config?.endpoint}/${objectName}`;
    }
  }

  /**
   * Refresh signed URLs for existing image URLs
   * @param urls Array of existing URLs (signed or unsigned)
   * @returns Array of fresh signed URLs
   */
  async refreshSignedUrls(urls: string[]): Promise<string[]> {
    if (this.useLocalStorage) {
      return urls; // 本地存储URL不需要刷新
    }

    return urls.map(url => {
      try {
        // 从URL提取objectName
        const objectName = this.extractObjectNameFromUrl(url);
        return this.getSignedUrl(objectName);
      } catch (error) {
        console.error('Failed to refresh signed URL:', url, error);
        return url; // 失败时返回原URL
      }
    });
  }
}

export default new OSSService();
