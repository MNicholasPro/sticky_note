// main.js
const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const Store = require('electron-store');

const store = new Store({ name: 'notes-data' });

let win;
let tray;

// --- Create the main window
function createWindow() {
  win = new BrowserWindow({
    width: 900,
    height: 650,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      enableRemoteModule: false
    },
    show: false,
    skipTaskbar: false,
    title: 'Electron 便签'
  });

  win.loadFile('index.html');

  win.once('ready-to-show', () => {
    win.show();
  });

  // Hide instead of close
  win.on('close', e => {
    e.preventDefault();
    win.hide();
  });
}

// --- Tray icon and menu
function createTray() {
  const iconPath = path.join(__dirname, 'assets', 'icon.png');
  const icon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
  tray = new Tray(icon);

  const updateCounts = () => {
    const counts = { todo: 0, redo: 0, done: 0 };
    const notes = store.get('notes', []);
    notes.forEach(n => {
      if (n.status === 'todo') counts.todo++;
      if (n.status === 'redo') counts.redo++;
      if (n.status === 'done') counts.done++;
    });
    tray.setToolTip(`待做 ${counts.todo} | 再做 ${counts.redo} | 完成 ${counts.done}`);
  };

  updateCounts();

  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: '显示 / 隐藏', click: () => win.isVisible() ? win.hide() : win.show() },
      { label: '退出', click: () => app.quit() }
    ])
  );

  // Update counts when notes change
  ipcMain.on('notes-updated', updateCounts);
}

// --- IPC – Persistence
ipcMain.handle('load-notes', () => store.get('notes', []));

ipcMain.handle('save-notes', (e, notes) => {
  store.set('notes', notes);
  return true;
});

// --- App lifecycle
app.whenReady().then(() => {
  createWindow();
  createTray();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  // On macOS, keep the app running until user quits explicitly
  if (process.platform !== 'darwin') app.quit();
});