const path = require('path');
const fs = require('fs');

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
      preload: path.join(__dirname, 'preload.js')
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

ipcMain.handle('save-api-key', async (_, service, apiKey) => {
  const configPath = path.join(app.getPath('userData'), 'config.json');
  let config = {};

  try {
    if (fs.existsSync(configPath)) {
      config = JSON.parse(await fs.promises.readFile(configPath, 'utf8'));
    }
  } catch (e) {
    console.error('读取配置失败:', e);
  }

  config[service] = apiKey;

  try {
    await fs.promises.writeFile(configPath, JSON.stringify(config, null, 2));
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('load-api-key', async (_, service) => {
  const configPath = path.join(app.getPath('userData'), 'config.json');

  try {
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(await fs.promises.readFile(configPath, 'utf8'));
      return config[service] || '';
    }
  } catch (e) {
    console.error('读取配置失败:', e);
  }

  return '';
});

ipcMain.handle('get-app-version', () => app.getVersion());

ipcMain.handle('open-external', async (_, url) => await shell.openExternal(url));
