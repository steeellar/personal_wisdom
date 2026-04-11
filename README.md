# PDF 智能阅读器

一个基于 Electron 的跨平台 PDF 阅读器，支持 AI 智能问答功能。

## 功能特性

- 📖 **PDF 阅读**：支持拖拽上传、缩放、多页浏览
- 🤖 **AI 问答**：基于字节火山引擎 Kimi 模型的智能问答
- 🔒 **本地存储**：API Key 安全存储在本地
- 💻 **跨平台**：支持 macOS 和 Windows

## 安装使用

### 开发模式

```bash
# 安装依赖
npm install

# 启动开发模式
npm run dev
```

### 构建安装包

```bash
# 构建 macOS 版本
npm run build:mac

# 构建 Windows 版本
npm run build:win

# 构建所有平台
npm run build:all
```

构建完成后，安装包位于 `dist` 目录下。

## 使用方法

1. 启动应用后，在右侧输入你的火山引擎 API Key
2. 拖拽 PDF 文件到左侧区域，或点击「选择 PDF」按钮
3. 等待 PDF 加载完成
4. 在右下角输入框中输入问题，AI 将基于 PDF 内容回答

## 获取 API Key

1. 访问 [火山引擎方舟平台](https://www.volcengine.com/product/ark)
2. 注册并创建应用
3. 在控制台获取 API Key

## 技术栈

- Electron：跨平台桌面应用框架
- PDF.js：PDF 渲染引擎
- Tailwind CSS：UI 样式
- 字节火山引擎 Kimi API：AI 问答

## 许可证

MIT License
