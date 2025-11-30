@echo off
echo ========================================
echo   清理后端构建缓存
echo ========================================

echo 正在清理 dist 目录...
if exist "dist" rmdir /s /q "dist"

echo 正在重新生成 Prisma Client...
call npx prisma generate

echo.
echo ========================================
echo   清理完成！
echo ========================================
echo.
pause
