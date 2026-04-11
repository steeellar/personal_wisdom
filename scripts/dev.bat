@echo off
REM PDF 智能阅读器 - Windows 开发脚本

echo.
echo ╔══════════════════════════════════╗
echo ║  PDF 智能阅读器 - 开发模式 (Windows) ║
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

REM 检查依赖
if not exist node_modules (
    echo ❌ 未找到 node_modules，请先运行 npm install
exit /b 1
)

echo ✅ 依赖检查通过
echo.

echo ══ 启动应用 ══
echo.

echo 🚀 正在启动 Electron...
call node node_modules\.bin\electron . --dev

pause
