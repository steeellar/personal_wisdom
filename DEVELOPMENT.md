# PDF 智能阅读器 - 开发文档

## 技术栈

- **Electron**: 跨平台桌面应用框架 (v28.0.0)
- **PDF.js**: Mozilla 的 PDF 渲染引擎 (v3.11.174)
- **Tailwind CSS**: 实用优先的 CSS 框架
- **字节火山引擎**: Kimi API 提供 AI 能力

## 架构设计

### 进程模型

```
┌─────────────────────────────────────────────┐
│           Electron Main Process             │
│  ┌─────────────────────────────────────┐   │
│  │  main.js                            │   │
│  │  - 窗口管理                         │   │
│  │  - 菜单管理                         │   │
│  │  - 文件操作 IPC                     │   │
│  │  - API Key 管理                     │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
                      │
                      │ contextBridge
                      │
┌─────────────────────────────────────────────┐
│         Electron Renderer Process           │
│  ┌─────────────────────────────────────┐   │
│  │  index.html                         │   │
│  │  - PDF 渲染 (PDF.js)                │   │
│  │  - 聊天界面                         │   │
│  │  - 事件处理                         │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

### 安全设计

1. **Context Isolation**: 启用 `contextIsolation`，渲染进程无法直接访问 Node.js API
2. **Preload Script**: 通过 `preload.js` 暴露安全的 IPC 接口
3. **API Key 存储**: 存储在用户数据目录，不暴露在代码中
4. **CSP**: 内容安全策略防止 XSS

## 文件结构

```
PDFReader/
├── main.js              # 主进程入口
├── preload.js           # 预加载脚本（安全桥接）
├── index.html           # 渲染进程页面
├── package.json         # 项目配置
├── README.md            # 项目说明
├── QUICKSTART.md        # 快速开始指南
├── DEVELOPMENT.md       # 开发文档（本文档）
├── .gitignore           # Git 忽略配置
├── assets/              # 资源文件
│   ├── icon.svg         # SVG 图标源文件
│   └── ...              # 生成的图标文件
└── scripts/             # 脚本工具
    ├── setup.sh         # 自动设置脚本
    ├── dev.js           # 开发服务器
    └── build-icons.js   # 图标构建工具
```

## IPC 通信

### 主进程暴露的方法

| 方法 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `selectPDF` | - | `{name, path, data}` | 选择 PDF 文件 |
| `saveAPIKey` | `service, apiKey` | `{success}` | 保存 API Key |
| `loadAPIKey` | `service` | `apiKey` | 加载 API Key |
| `getAppVersion` | - | `version` | 获取应用版本 |
| `openExternal` | `url` | - | 打开外部链接 |

### 渲染进程调用示例

```javascript
// 选择 PDF 文件
const file = await window.electronAPI.selectPDF();

// 保存 API Key
await window.electronAPI.saveAPIKey('bytedance', 'your-api-key');

// 加载 API Key
const apiKey = await window.electronAPI.loadAPIKey('bytedance');
```

## 构建配置

### electron-builder 配置

```json
{
  "appId": "com.pdfreader.app",
  "productName": "PDF 智能阅读器",
  "directories": {
    "output": "dist"
  },
  "mac": {
    "category": "public.app-category.productivity",
    "target": ["dmg"]
  },
  "win": {
    "target": ["nsis"]
  }
}
```

## 开发调试

### 启动开发模式

```bash
# 使用 npm 脚本
npm run dev

# 或使用开发脚本
node scripts/dev.js
```

### 调试主进程

```bash
# 使用 VS Code 调试配置
# 或使用命令行
node --inspect-brk node_modules/.bin/electron .
```

### 调试渲染进程

1. 启动开发模式
2. 按 `F12` 打开开发者工具
3. 在 Console/Network 等面板调试

## 性能优化

### PDF 渲染优化

- 使用 `requestAnimationFrame` 优化渲染
- 延迟加载非可视区域页面
- 使用 Canvas 缓存已渲染页面

### 内存管理

- 及时释放 PDF 文档对象
- 限制聊天历史记录数量
- 使用 WeakMap 存储临时数据

## 安全最佳实践

1. **不要禁用 `contextIsolation`**
2. **验证所有 IPC 输入**
3. **使用 CSP 限制资源加载**
4. **及时更新 Electron 版本**
5. **对敏感数据进行加密存储**

## 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

## 更新日志

### v1.0.0 (2024-XX-XX)

- ✨ 初始版本发布
- 📖 PDF 阅读功能
- 🤖 AI 问答集成
- 💻 跨平台支持
