# PDF 智能阅读器 - 快速开始

## 系统要求

- **macOS**: 10.13 (High Sierra) 或更高版本
- **Windows**: Windows 10 或更高版本
- **Node.js**: 18.0.0 或更高版本

## 快速开始

### 1. 安装依赖

```bash
# 使用自动设置脚本
./scripts/setup.sh

# 或者手动安装
npm install
```

### 2. 开发模式运行

```bash
npm run dev
```

### 3. 构建应用

```bash
# macOS
npm run build:mac

# Windows
npm run build:win

# 所有平台
npm run build:all
```

构建完成后，安装包位于 `dist` 目录。

## 使用指南

### 首次使用

1. 启动应用
2. 在右上角输入你的 **火山引擎 API Key**
3. 拖拽 PDF 文件到左侧，或点击「选择 PDF」按钮
4. 等待 PDF 加载完成
5. 在右下角输入框提问

### 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Cmd/Ctrl + O` | 打开 PDF 文件 |
| `Cmd/Ctrl + +` | 放大 |
| `Cmd/Ctrl + -` | 缩小 |
| `Cmd/Ctrl + 0` | 重置缩放 |
| `F12` | 开发者工具 |

### 获取 API Key

1. 访问 [火山引擎方舟平台](https://www.volcengine.com/product/ark)
2. 注册账号并登录
3. 创建应用，获取 API Key
4. 在应用中输入 API Key

## 常见问题

### Q: 安装依赖时出错？

确保你的 Node.js 版本 >= 18.0.0：
```bash
node --version
```

### Q: 构建时提示缺少图标？

运行图标构建脚本：
```bash
node scripts/build-icons.js
```

或者手动准备图标文件：
- macOS: `assets/icon.icns`
- Windows: `assets/icon.ico`

### Q: API 调用失败？

1. 检查 API Key 是否正确
2. 确认网络连接正常
3. 查看控制台错误信息（F12）

## 技术支持

如有问题，请提交 Issue 或联系开发者。

## 许可证

MIT License
