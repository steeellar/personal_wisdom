const { contextBridge, ipcRenderer } = require('electron');

// 暴露安全的 API 给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 文件操作
  selectPDF: () => ipcRenderer.invoke('select-pdf'),

  // API Key 管理
  saveAPIKey: (service, apiKey) => ipcRenderer.invoke('save-api-key', service, apiKey),
  loadAPIKey: (service) => ipcRenderer.invoke('load-api-key', service),

  // 应用信息
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),

  // 平台信息
  platform: process.platform
});

// 通知主进程页面已加载
window.addEventListener('DOMContentLoaded', () => {
  ipcRenderer.send('renderer-ready');
});
