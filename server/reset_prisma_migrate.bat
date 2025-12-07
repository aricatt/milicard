@echo off
setlocal enabledelayedexpansion

echo.
echo =============================================
echo Prisma 迁移基线重置脚本
echo 将从现有数据库创建新的迁移基线
echo 保留数据库数据，清空旧迁移历史
echo =============================================
echo.

REM 检查 Node.js 是否安装
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js 未找到，请先安装 Node.js
    pause
    exit /b 1
)

REM 检查 npm 是否安装
npm --version >nul 2>&1
if errorlevel 1 (
    echo ❌ npm 未找到，请先安装 npm
    pause
    exit /b 1
)

echo ✅ 检测到 Node.js 和 npm

REM 提示用户确认
echo.
set /p confirm=⚠️  此操作将清空本地迁移历史并从现有数据库创建新的基线迁移。是否继续？(y/N): 
if /i not "!confirm!"=="y" (
    echo ❌ 操作已取消
    pause
    exit /b 0
)

echo.
echo 1/6. 备份数据库...
echo pg_dump -h localhost -p 5437 -d milicard_dev -U postgres > milicard_dev_backup_!date:~0,4!!date:~5,2!!date:~8,2!_!time:~0,2!!time:~3,2!!time:~6,2!.sql
pg_dump -h localhost -p 5437 -d milicard_dev -U postgres > "milicard_dev_backup_%date:~0,4%%date:~5,2%%date:~8,2%_%time:~0,2%%time:~3,2%%time:~6,2%.sql" 2>nul
if errorlevel 1 (
    echo ⚠️  备份失败（可能需要输入密码或数据库连接问题）
    echo    但继续执行...
)

echo.
echo 2/6. 从现有数据库反向生成 schema.prisma...
npx prisma db pull
if errorlevel 1 (
    echo ❌ prisma db pull 失败
    pause
    exit /b 1
)

echo.
echo 3/6. 清空本地迁移目录...
if exist prisma\migrations (
    rd /s /q prisma\migrations
    if errorlevel 1 (
        echo ❌ 无法删除 prisma\migrations 目录
        pause
        exit /b 1
    )
)
mkdir prisma\migrations >nul 2>&1

echo.
echo 4/6. 生成初始迁移 SQL 文件...
set temp_migration_dir=prisma\migrations\temp_migration
mkdir "!temp_migration_dir!" >nul 2>&1

REM 生成迁移 SQL
npx prisma migrate diff --from-empty --to-schema-datamodel prisma\schema.prisma --script > "!temp_migration_dir!\migration.sql"
if errorlevel 1 (
    echo ❌ 生成迁移 SQL 失败
    pause
    exit /b 1
)

REM 创建时间戳目录
for /f "tokens=2 delims==" %%a in ('wmic OS Get localdatetime /value') do set "dt=%%a"
set "YY=%dt:~2,2%" & set "YYYY=%dt:~0,4%" & set "MM=%dt:~4,2%" & set "DD=%dt:~6,2%" & set "HH=%dt:~8,2%" & set "Min=%dt:~10,2%" & set "Sec=%dt:~12,2%"
set timestamp=!YYYY!!MM!!DD!!HH!!Min!!Sec!

set init_migration_dir=prisma\migrations\!timestamp!_init_from_db
mkdir "!init_migration_dir!" >nul 2>&1

copy "!temp_migration_dir!\migration.sql" "!init_migration_dir!\migration.sql" >nul 2>&1
if errorlevel 1 (
    echo ❌ 复制迁移文件失败
    pause
    exit /b 1
)

REM 创建 steps.json
echo {} > "!init_migration_dir!\steps.json"

REM 清理临时目录
rd /s /q "!temp_migration_dir!"

echo.
echo 5/6. 清空数据库中的 _prisma_migrations 表...
echo 正在连接数据库并清空 _prisma_migrations 表...
echo | set /p="DELETE FROM _prisma_migrations;" | psql -h localhost -p 5437 -d milicard_dev -U postgres 2>nul
if errorlevel 1 (
    echo ⚠️  清空 _prisma_migrations 表失败（可能需要手动执行）
    echo    请在数据库中执行: DELETE FROM _prisma_migrations;
)

echo.
echo 6/6. 标记初始迁移为已应用...
set migration_name=!timestamp!_init_from_db
npx prisma migrate resolve --applied "!migration_name!"
if errorlevel 1 (
    echo ❌ 标记迁移为已应用失败
    pause
    exit /b 1
)

echo.
echo =============================================
echo ✅ 操作完成！
echo.
echo 📁 本地迁移目录已重建
echo 🗃️  数据库结构已与 schema.prisma 同步
echo 💾 数据库数据已保留
echo 🔄 现在可以正常使用 npx prisma migrate dev
echo =============================================
echo.
echo 📝 生成的初始迁移: !init_migration_dir!
echo 📝 迁移已标记为应用: !migration_name!
echo.

pause