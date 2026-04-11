# 🚀 快速开始指南

## 项目概述

这是一个基于 Electron 的跨平台 PDF 阅读器，支持 AI 智能问答功能。

**核心功能**:
- 📖 PDF 阅读 (拖拽上传、缩放、多页浏览)
- 🤖 AI 问答 (字节火山引擎 Kimi 模型)
- 💻 跨平台 (macOS & Windows)
- 🔒 本地存储 (API Key 安全存储)

---

## 📋 文件结构

```
PDFReader/
├── main.js              # Electron 主进程
├── preload.js           # 安全预加载脚本
├── index.html           # 应用界面
├── package.json         # 项目配置
├── README.md            # 项目说明
├── QUICKSTART.md        # 使用指南
├── DEVELOPMENT.md       # 开发文档
├── START.md             # 本文档
├── assets/              # 图标资源
│   ├── icon.svg
│   └── ...
└── scripts/             # 工具脚本
    ├── setup.sh
    ├── dev.js
    └── build-icons.js
```

---

## 🛠️ 开发环境

### 系统要求

- **Node.js**: >= 18.0.0
- **npm**: >= 8.0.0
- **操作系统**: macOS 10.13+ / Windows 10+

### 快速设置

```bash
# 1. 进入项目目录
cd /Users/yushijie/project/PDFReader

# 2. 运行自动设置脚本
./scripts/setup.sh

# 或者手动安装
npm install
```

---

## 🚀 运行应用

### 开发模式

```bash
# 方式 1: 使用 npm 脚本
npm run dev

# 方式 2: 使用开发脚本
node scripts/dev.js
```

### 生产模式

```bash
npm start
```

---

## 📦 构建应用

### macOS

```bash
npm run build:mac
```

输出: `dist/PDF 智能阅读器-x.x.x.dmg`

### Windows

```bash
npm run build:win
```

输出: `dist/PDF 智能阅读器 x.x.x.exe`

### 所有平台

```bash
npm run build:all
```

---

## 🔧 配置说明

### API Key 存储

- 位置: `~/Library/Application Support/PDFReader/config.json` (macOS)
- 位置: `%APPDATA%/PDFReader/config.json` (Windows)
- 格式: `{ "bytedance": "your-api-key" }`

### 开发配置

编辑 `package.json` 中的 `build` 字段:

```json
{
  "build": {
    "appId": "com.yourcompany.pdfreader",
    "productName": "PDF 智能阅读器",
    "directories": {
      "output": "dist"
    }
  }
}
```

---

## 🐛 调试

### 主进程调试

```bash
# VS Code 配置
# .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Main Process",
      "type": "node",
      "request": "launch",
      "runtimeExecutable": "${workspaceFolder}/node_modules/.bin/electron",
      "args": ["."],
      "env": {
        "NODE_ENV": "development"
      }
    }
  ]
}
```

### 渲染进程调试

1. 启动开发模式: `npm run dev`
2. 按 `F12` 打开开发者工具
3. 在 Console / Network 面板调试

---

## 📚 参考文档

- [Electron 文档](https://www.electronjs.org/docs)
- [PDF.js 文档](https://mozilla.github.io/pdf.js/)
- [Tailwind CSS 文档](https://tailwindcss.com/docs)
- [火山引擎方舟平台](https://www.volcengine.com/product/ark)

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

## 📄 许可证

MIT License

---

**快速命令参考**:

```bash
# 设置
./scripts/setup.sh

# 开发
npm run dev

# 构建
npm run build:mac
npm run build:win
```

**开始使用** → 运行 `./scripts/setup.sh` 然后 `npm run dev` 🚀
