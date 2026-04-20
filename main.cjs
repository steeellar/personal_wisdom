const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Electron 主进程中需要使用内置的 electron 模块
const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');

let mainWindow;
const isDev = process.argv.includes('--dev');

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 600,
    titleBarStyle: 'default',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.cjs')
    }
  });

  mainWindow.loadFile('index.html');

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

ipcMain.handle('select-pdf', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'PDF 文件', extensions: ['pdf'] },
      { name: '所有文件', extensions: ['*'] }
    ]
  });

  if (!result.canceled && result.filePaths.length > 0) {
    const filePath = result.filePaths[0];
    const fileData = await fs.promises.readFile(filePath);
    return { name: path.basename(filePath), path: filePath, data: fileData };
  }
  return null;
});

ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });

  if (!result.canceled && result.filePaths.length > 0) {
    const folderPath = result.filePaths[0];
    const folderStructure = await scanFolder(folderPath);
    // 返回包含文件夹路径和结构的信息
    return {
      folderPath: folderPath,
      structure: folderStructure
    };
  }
  return null;
});

ipcMain.handle('load-folder', async (_, folderPath) => {
  try {
    if (!folderPath) {
      return { success: false, error: '缺少文件夹路径' };
    }

    if (!fs.existsSync(folderPath)) {
      return { success: false, error: '文件夹不存在' };
    }

    const folderStructure = await scanFolder(folderPath);
    return {
      success: true,
      structure: folderStructure,
      folderPath: folderPath
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 递归扫描文件夹
async function scanFolder(folderPath) {
  const items = [];
  const entries = await fs.promises.readdir(folderPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(folderPath, entry.name);

    if (entry.isDirectory()) {
      // 递归扫描子文件夹
      const subItems = await scanFolder(fullPath);
      items.push({
        name: entry.name,
        path: fullPath,
        type: 'folder',
        children: subItems
      });
    } else {
      // 检查文件类型
      const ext = path.extname(entry.name).toLowerCase();
      const supportedTypes = ['.pdf', '.docx', '.md', '.markdown', '.txt'];

      if (supportedTypes.includes(ext)) {
        let fileType = 'other';
        if (ext === '.pdf') fileType = 'pdf';
        else if (ext === '.docx') fileType = 'docx';
        else if (ext === '.md' || ext === '.markdown') fileType = 'markdown';
        else if (ext === '.txt') fileType = 'text';

        items.push({
          name: entry.name,
          path: fullPath,
          type: fileType,
          ext: ext
        });
      }
    }
  }

  // 按类型和名称排序：文件夹在前，然后按文件类型排序，最后按名称排序
  items.sort((a, b) => {
    if (a.type === 'folder' && b.type !== 'folder') return -1;
    if (a.type !== 'folder' && b.type === 'folder') return 1;
    if (a.type === 'folder' && b.type === 'folder') return a.name.localeCompare(b.name);

    // 文件按类型排序
    const typeOrder = { pdf: 1, docx: 2, markdown: 3, text: 4, other: 5 };
    const typeA = typeOrder[a.type] || 5;
    const typeB = typeOrder[b.type] || 5;

    if (typeA !== typeB) return typeA - typeB;
    return a.name.localeCompare(b.name);
  });

  return items;
}

ipcMain.handle('read-file', async (_, filePath) => {
  try {
    const fileData = await fs.promises.readFile(filePath);
    return {
      success: true,
      data: Array.from(fileData),
      name: path.basename(filePath)
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
});

// 保存单个配置项（保留兼容性，但不推荐使用）
ipcMain.handle('save-api-key', async (_, service, apiKey) => {
  const configPath = path.join(app.getPath('userData'), 'config.json');
  let config = {};

  try {
    if (fs.existsSync(configPath)) {
      const content = await fs.promises.readFile(configPath, 'utf8');
      try {
        config = JSON.parse(content);
      } catch (parseError) {
        console.warn('配置文件 JSON 解析失败，将使用新配置:', parseError.message);
        config = {};
      }
    }
  } catch (e) {
    console.error('读取配置失败:', e);
  }

  config[service] = apiKey;

  try {
    if (typeof config[service] !== 'string') {
      config[service] = String(config[service]);
    }
    await fs.promises.writeFile(configPath, JSON.stringify(config, null, 2), 'utf8');
    return { success: true };
  } catch (e) {
    console.error('保存配置失败:', e);
    return { success: false, error: e.message };
  }
});

// 批量保存配置（推荐使用，避免并发写入）
ipcMain.handle('save-config', async (_, configData) => {
  const configPath = path.join(app.getPath('userData'), 'config.json');
  let config = {};

  try {
    if (fs.existsSync(configPath)) {
      const content = await fs.promises.readFile(configPath, 'utf8');
      try {
        config = JSON.parse(content);
      } catch (parseError) {
        console.warn('配置文件 JSON 解析失败，将使用新配置:', parseError.message);
        config = {};
      }
    }
  } catch (e) {
    console.error('读取配置失败:', e);
  }

  // 合并新配置
  Object.assign(config, configData);

  try {
    await fs.promises.writeFile(configPath, JSON.stringify(config, null, 2), 'utf8');
    return { success: true };
  } catch (e) {
    console.error('保存配置失败:', e);
    return { success: false, error: e.message };
  }
});

ipcMain.handle('load-api-key', async (_, service) => {
  const configPath = path.join(app.getPath('userData'), 'config.json');

  try {
    if (fs.existsSync(configPath)) {
      const content = await fs.promises.readFile(configPath, 'utf8');
      try {
        const config = JSON.parse(content);
        const value = config[service];
        // 确保返回的是字符串
        return typeof value === 'string' ? value : '';
      } catch (parseError) {
        console.warn('配置文件 JSON 解析失败:', parseError.message);
        return '';
      }
    }
  } catch (e) {
    console.error('读取配置失败:', e);
  }

  return '';
});

// 获取文件哈希值（用于增量索引）
ipcMain.handle('get-file-hash', async (_, filePath) => {
  try {
    if (!fs.existsSync(filePath)) {
      return { success: false, error: '文件不存在' };
    }
    const hash = calculateFileHash(filePath);
    return { success: true, hash };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-app-version', () => app.getVersion());

ipcMain.handle('open-external', async (_, url) => await shell.openExternal(url));

// 计算文件哈希值
function calculateFileHash(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  const hashSum = crypto.createHash('sha256');
  hashSum.update(fileBuffer);
  return hashSum.digest('hex');
}

// 构建/更新知识库索引
ipcMain.handle('build-knowledge-index', async (_, { files, indexEntries, basePath }) => {
  try {
    // 直接使用传入的 basePath 作为索引位置
    if (!basePath) {
      return { success: false, error: '缺少基础路径' };
    }

    const indexPath = path.join(basePath, '.index.json');

    // 使用 Map 根据 hash 去重
    const indexMap = new Map();
    let deletedCount = 0;

    indexEntries.forEach(entry => {
      const fullPath = entry.path.startsWith(basePath) ? entry.path : path.join(basePath, entry.path);

      // 检查文件是否存在
      if (!fs.existsSync(fullPath)) {
        deletedCount++;
        return; // 跳过已删除的文件
      }

      const hash = calculateFileHash(fullPath);
      const indexItem = {
        path: path.relative(basePath, fullPath),
        hash: hash,
        name: entry.name,
        type: entry.type,
        summary: entry.summary || '',
        keywords: entry.keywords || []
      };
      // 相同 hash 的文件会被覆盖
      indexMap.set(hash, indexItem);
    });

    // 转换为数组
    const index = Array.from(indexMap.values());

    // 保存索引文件
    fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));

    return { success: true, count: index.length, deletedCount, indexPath, basePath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 加载知识库索引
ipcMain.handle('load-knowledge-index', async (_, folderPath) => {
  try {
    if (!folderPath) {
      return { success: false, error: '缺少文件夹路径' };
    }

    const indexPath = path.join(folderPath, '.index.json');

    if (!fs.existsSync(indexPath)) {
      return { success: false, error: '索引文件不存在' };
    }

    const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
    return { success: true, index, indexPath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 获取单个文件内容
ipcMain.handle('get-file', async (_, filePath) => {
  try {
    if (!fs.existsSync(filePath)) {
      return { success: false, error: '文件不存在' };
    }

    const fileData = await fs.promises.readFile(filePath);
    return {
      success: true,
      data: Array.from(fileData),
      name: path.basename(filePath)
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 获取索引文件路径
ipcMain.handle('get-index-path', async (_, folderPath) => {
  if (!folderPath) {
    return { indexDir: '', indexPath: '', exists: false };
  }

  const indexPath = path.join(folderPath, '.index.json');
  return {
    indexDir: folderPath,
    indexPath,
    exists: fs.existsSync(indexPath)
  };
});

// 打开索引目录
ipcMain.handle('open-index-dir', async (_, folderPath) => {
  try {
    if (!folderPath) {
      return { success: false, error: '缺少文件夹路径' };
    }
    await shell.openPath(folderPath);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 获取对话历史目录路径
function getChatHistoryDir() {
  return path.join(app.getPath('userData'), 'chat-histories');
}

// 确保对话历史目录存在
function ensureChatHistoryDir() {
  const dir = getChatHistoryDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

// 根据文件路径生成对话历史文件名
function getChatHistoryFileName(filePath) {
  // 使用文件路径的哈希值作为文件名，避免文件名中的特殊字符问题
  const hash = crypto.createHash('md5').update(filePath).digest('hex');
  return `${hash}.json`;
}

// 保存对话历史
ipcMain.handle('save-chat-history', async (_, { filePath, history }) => {
  try {
    if (!filePath || !history) {
      return { success: false, error: '缺少文件路径或历史记录' };
    }

    ensureChatHistoryDir();
    const chatHistoryFile = path.join(getChatHistoryDir(), getChatHistoryFileName(filePath));

    await fs.promises.writeFile(
      chatHistoryFile,
      JSON.stringify({ filePath, history }, null, 2),
      'utf8'
    );

    return { success: true };
  } catch (error) {
    console.error('保存对话历史失败:', error);
    return { success: false, error: error.message };
  }
});

// 加载对话历史
ipcMain.handle('load-chat-history', async (_, filePath) => {
  try {
    if (!filePath) {
      return { success: false, error: '缺少文件路径' };
    }

    const chatHistoryFile = path.join(getChatHistoryDir(), getChatHistoryFileName(filePath));

    if (!fs.existsSync(chatHistoryFile)) {
      return { success: true, history: [] };
    }

    const content = await fs.promises.readFile(chatHistoryFile, 'utf8');
    const data = JSON.parse(content);

    return { success: true, history: data.history || [] };
  } catch (error) {
    console.error('加载对话历史失败:', error);
    return { success: false, error: error.message };
  }
});

// 删除对话历史
ipcMain.handle('delete-chat-history', async (_, filePath) => {
  try {
    if (!filePath) {
      return { success: false, error: '缺少文件路径' };
    }

    const chatHistoryFile = path.join(getChatHistoryDir(), getChatHistoryFileName(filePath));

    if (fs.existsSync(chatHistoryFile)) {
      await fs.promises.unlink(chatHistoryFile);
    }

    return { success: true };
  } catch (error) {
    console.error('删除对话历史失败:', error);
    return { success: false, error: error.message };
  }
});
