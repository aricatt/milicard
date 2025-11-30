@echo off
echo ========================================
echo   清理前端构建缓存
echo ========================================

echo 正在清理 .umi 目录...
if exist ".umi" rmdir /s /q ".umi"

echo 正在清理 .umi-production 目录...
if exist ".umi-production" rmdir /s /q ".umi-production"

echo 正在清理 dist 目录...
if exist "dist" rmdir /s /q "dist"

echo 正在清理 node_modules/.cache 目录...
if exist "node_modules\.cache" rmdir /s /q "node_modules\.cache"

echo.
echo ========================================
echo   清理完成！
echo ========================================
echo.
pause
