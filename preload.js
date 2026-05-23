// preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  loadNotes: () => ipcRenderer.invoke('load-notes'),
  saveNotes: (notes) => ipcRenderer.send('save-notes', notes),
  notesUpdated: () => ipcRenderer.send('notes-updated'),
  onThemeChanged: (callback) => ipcRenderer.on('theme-changed', (event, theme) => callback(theme)),

  // 新增：暴露设置时间的接口
  setNotificationTime: (time) => ipcRenderer.send('set-notification-time', time)
});