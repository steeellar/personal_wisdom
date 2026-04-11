# Windows 安装和使用指南

## 系统要求

- **Node.js**: >= 22.0.0 (推荐使用 LTS 版本)
- **npm**: >= 8.0.0
- **操作系统**: Windows 10 或更高版本

## 安装 Node.js

1. 访问 [Node.js 官网](https://nodejs.org/)
2. 下载并安装 Node.js 22.x LTS 版本
3. 安装完成后，打开 PowerShell 或 CMD 验证安装：

```powershell
node --version
npm --version
```

## 安装项目依赖

### 方式一：自动安装（推荐）

在项目根目录下，双击运行：

```
scripts\setup.bat
```

或者在命令行中运行：

```powershell
cd C:\path\to\PDFReader
npm run setup
```

### 方式二：手动安装

```powershell
cd C:\path\to\PDFReader

# 1. 安装依赖
npm install

# 2. 构建图标（可选）
node scripts\build-icons.js
```

## 配置国内镜像（可选）

如果下载速度较慢，可以配置淘宝镜像：

```powershell
# 配置 npm 镜像
npm config set registry https://registry.npmmirror.com

# 配置 Electron 镜像
npm config set electron_mirror https://npmmirror.com/mirrors/electron/
```

## 运行应用

### 开发模式

```powershell
# 方式 1: 使用 npm 脚本
npm run dev

# 方式 2: 使用开发脚本
node scripts\dev.js

# 方式 3: 直接双击运行
scripts\dev.bat
```

### 生产模式

```powershell
npm start
```

## 构建 Windows 安装包

### 构建 NSIS 安装包

```powershell
npm run build:win
```

构建完成后，安装包位于 `dist` 目录下，文件名类似：
```
PDF �kt能阅读器 Setup 1.0.0.exe
```

### 构建所有平台

```powershell
npm run build:all
```

## 常见问题

### 问题 1: `npm install` 失败或卡住

**解决方案**：

```powershell
# 清除缓存
npm cache clean --force

# 删除 node_modules
Remove-Item -Recurse -Force node_modules

# 重新安装
npm install
```

### 问题 2: Electron 下载失败

**解决方案**：

```powershell
# 设置 Electron 镜像
npm config set electron_mirror https://npmmirror.com/mirrors/electron/

# 重新安装
npm install electron@28.0.0 --save-dev
```

### 问题 3: 权限错误

**解决方案**：

以管理员身份运行 PowerShell 或 CMD：

```powershell
# 右键点击 PowerShell -> 以管理员身份运行
```

### 问题 4: 构建失败

**解决方案**：

1. 确保 Visual Studio Build Tools 已安装
2. 下载地址：https://visualstudio.microsoft.com/visual-cpp-build-tools/
3. 安装时选择 "Desktop development with C++"

### 问题 5: 杀毒软件拦截

**解决方案**：

1. 将项目目录添加到杀毒软件白名单
2. 或者在构建时暂时关闭杀毒软件

## 开发工具设置

### Visual Studio Code 调试配置

在项目根目录创建 `.vscode/launch.json`：

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Main Process",
      "type": "node",
      "request": "launch",
      "runtimeExecutable": "${workspaceFolder}/node_modules/.bin/electron.cmd",
      "windows": {
        "runtimeExecutable": "${workspaceFolder}/node_modules/.bin/electron.cmd"
      },
      "args": ["${workspaceFolder}"],
      "outputCapture": "std"
    }
  ]
}
```

## 快速命令参考

```powershell
# 安装
npm install

# 开发
npm run dev

# 生产
npm start

# 构建 Windows 版本
npm run build:win
```

## 获取帮助

如果遇到问题：

1. 查看详细日志：`npm install --verbose`
2. 查看 Electron 文档：https://www.electronjs.org/docs
3. 提交 Issue：https://github.com/your-repo/issues
