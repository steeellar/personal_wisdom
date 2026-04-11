#!/bin/bash

# PDF 智能阅读器 - 快速设置脚本

set -e

echo "📄 PDF 智能阅读器 - 设置脚本"
echo "=============================="
echo ""

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 错误: 未找到 Node.js"
    echo "请先安装 Node.js: https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node --version)
echo "✅ Node.js 版本: $NODE_VERSION"

# 检查 npm
if ! command -v npm &> /dev/null; then
    echo "❌ 错误: 未找到 npm"
    exit 1
fi

NPM_VERSION=$(npm --version)
echo "✅ npm 版本: $NPM_VERSION"

echo ""
echo "📦 安装依赖..."
npm install

echo ""
echo "🎨 构建图标..."
if command -v node &> /dev/null; then
    node scripts/build-icons.js || echo "⚠️ 图标构建失败，将使用默认图标"
fi

echo ""
echo "✅ 设置完成!"
echo ""
echo "可用命令:"
echo "  npm run dev       - 开发模式"
echo "  npm start         - 生产模式"
echo "  npm run build:mac - 构建 macOS 版本"
echo "  npm run build:win - 构建 Windows 版本"
echo ""
