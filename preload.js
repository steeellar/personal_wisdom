const { contextBridge, ipcRenderer } = require('electron');

// 暴露安全的 API 给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 文件操作
  selectPDF: () => ipcRenderer.invoke('select-pdf'),
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  loadFolder: (path) => ipcRenderer.invoke('load-folder', path),
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),

  // API Key 管理
  saveAPIKey: (service, apiKey) => ipcRenderer.invoke('save-api-key', service, apiKey),
  loadAPIKey: (service) => ipcRenderer.invoke('load-api-key', service),
  saveConfig: (configData) => ipcRenderer.invoke('save-config', configData),

  // 应用信息
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),

  // 知识库索引
  buildKnowledgeIndex: (files, indexEntries, basePath) => ipcRenderer.invoke('build-knowledge-index', { files, indexEntries, basePath }),
  loadKnowledgeIndex: (folderPath) => ipcRenderer.invoke('load-knowledge-index', folderPath),
  getFileHash: (filePath) => ipcRenderer.invoke('get-file-hash', filePath),
  getFile: (filePath) => ipcRenderer.invoke('get-file', filePath),
  getIndexPath: (folderPath) => ipcRenderer.invoke('get-index-path', folderPath),
  openIndexDir: (folderPath) => ipcRenderer.invoke('open-index-dir', folderPath),

  // 平台信息
  platform: process.platform
});

// 通知主进程页面已加载
window.addEventListener('DOMContentLoaded', () => {
  ipcRenderer.send('renderer-ready');
});
