// main.js
const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, nativeTheme,Notification  } = require('electron');
const path = require('path');
const Store = require('electron-store');

const store = new Store({ name: 'notes-data' });

let mainWindow;
let notificationTime = "10:00"; // 默认时间

let win;
let tray;
let isQuitting = false; // 1. 引入退出标志位

// 模拟一个简单的定时检查逻辑
function setupNotificationTimer() {
  setInterval(() => {
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    // 如果当前时间匹配设置的时间（且秒数为0，防止一分钟内触发多次）
    if (currentTime === notificationTime && now.getSeconds() === 0) {
      sendTaskNotification();
    }
  }, 1000);
}

function sendTaskNotification() {
  // 这里逻辑：从本地存储或通过 IPC 获取任务列表并判断是否有未完成任务
  // 为了演示，我们发送一个通用的提醒
  new Notification({
    title: '📅 任务提醒',
    body: `当前设定的提醒时间已到 (${notificationTime})，记得查看今天的待办事项！`,
  }).show();
}

// 监听前端修改时间的请求
ipcMain.on('set-notification-time', (event, newTime) => {
  notificationTime = newTime;
  console.log(`通知时间已更新为: ${notificationTime}`);
});

// --- Create the main window
function createWindow() {
  win = new BrowserWindow({
    width: 1920,
    height: 1080,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      enableRemoteModule: false
    },
    show: false,
    skipTaskbar: false,
    title: '便签'
  });

  win.loadFile('index.html');

  // --- 新增：监听系统主题变化并通知前端 ---
  nativeTheme.on('updated', () => {
    const isDark = nativeTheme.shouldUseDarkColors;
    win.webContents.send('theme-changed', isDark ? 'dark' : 'light');
  });

  // 初始化时发送一次当前主题
  win.webContents.on('did-finish-load', () => {
    win.webContents.send('theme-changed', nativeTheme.shouldUseDarkColors ? 'dark' : 'light');
  });
  // --------------------------------------

  win.once('ready-to-show', () => {
    win.show();
  });

  // Hide instead of close
  win.on('close', e => {
    // 2. 修改拦截逻辑
    if (!isQuitting) {
      e.preventDefault();
      win.hide();
    }
  });
  setupNotificationTimer(); // 启动定时检查
}

// 3. 监听 app 的退出生命周期
app.on('before-quit', () => {
  isQuitting = true; // 当点击退出时，将标志位设为 true
});

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

app.whenReady().then(createWindow);