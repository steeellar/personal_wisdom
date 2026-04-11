# 📦 安装指南

## 快速安装步骤

### 方式一：自动安装（推荐）

```bash
cd /Users/yushijie/project/PDFReader
./scripts/setup.sh
```

### 方式二：手动安装

```bash
cd /Users/yushijie/project/PDFReader

# 1. 安装依赖
npm install

# 2. 构建图标（可选）
node scripts/build-icons.js
```

---

## 常见问题解决

### 问题 1: `npm install` 卡住或超时

**解决方案**:

```bash
# 使用淘宝镜像
npm config set registry https://registry.npmmirror.com

# 或使用华为镜像
npm config set registry https://repo.huaweicloud.com/repository/npm/

# 然后重新安装
npm install
```

### 问题 2: Electron 下载失败

**解决方案**:

```bash
# 设置 Electron 镜像
npm config set electron_mirror https://npmmirror.com/mirrors/electron/

# 然后重新安装 Electron
npm install electron@39.8.0 --save-dev
```

### 问题 3: 权限错误 (macOS/Linux)

**解决方案**:

```bash
# 修改脚本权限
chmod +x scripts/*.sh
chmod +x scripts/*.js

# 如果 npm 全局安装需要 sudo
sudo npm install -g electron
```

### 问题 4: 缺少构建工具 (Windows)

**解决方案**:

```powershell
# 以管理员身份运行 PowerShell
npm install --global windows-build-tools

# 或安装 Visual Studio Build Tools
# 下载地址: https://visualstudio.microsoft.com/visual-cpp-build-tools/
```

---

## 验证安装

运行以下命令验证安装:

```bash
# 检查 Node.js
node --version  # 应 >= 18.0.0

# 检查 npm
npm --version   # 应 >= 8.0.0

# 检查 Electron
npx electron --version  # 应显示 v28.0.0

# 运行应用
npm run dev
```

---

## 获取帮助

如果以上方法都无法解决问题:

1. 查看完整日志: `npm install --verbose`
2. 清除缓存重试:
   ```bash
   npm cache clean --force
   rm -rf node_modules
   npm install
   ```
3. 检查网络连接和代理设置
4. 查看项目文档: `README.md`, `DEVELOPMENT.md`

---

**安装完成后，请阅读 `START.md` 了解如何使用应用。**
