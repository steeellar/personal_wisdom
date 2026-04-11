@echo off
REM PDF 智能阅读器 - Windows 设置脚本

echo.
echo ╔══════════════════════════════════╗
echo ║     PDF 智能阅读器 - 设置脚本     ║
echo ╚══════════════════════════════════╝
echo.

echo ══ 环境检查 ══
echo.

REM 检查 Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ 错误: 未找到 Node.js
    echo 请先安装 Node.js: https://nodejs.org/
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo ✅ Node.js 版本: %NODE_VERSION%

REM 检查 npm
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ 错误: 未找到 npm
    exit /b 1
)

for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
echo ✅ npm 版本: %NPM_VERSION%

echo.
echo ══ 安装依赖 ══
echo.

echo 📦 正在安装依赖...
call npm install
if %errorlevel% neq 0 (
    echo ❌ 依赖安装失败
    exit /b 1
)

echo.
echo ══ 构建图标 ══
echo.

echo 🎨 正在构建图标...
if exist scripts\build-icons.js (
    call node scripts\build-icons.js
    if %errorlevel% neq 0 (
        echo ⚠️ 图标构建失败，将使用默认图标
    )
) else (
    echo ⚠️ 未找到 build-icons.js，跳过图标构建
)

echo.
echo ✅ 设置完成!
echo.
echo 可用命令:
echo   npm run dev       - 开发模式
echo   npm start         - 生产模式
echo   npm run build:win - 构建 Windows 版本
echo.

pause
