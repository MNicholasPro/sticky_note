// app.js
const notesContainer = document.getElementById('notes-container');
const addBtn = document.getElementById('add-note');
const modal = document.getElementById('add-note-modal');
const saveBtn = document.getElementById('save-note');
const cancelBtn = document.getElementById('cancel-note');
const stats = document.getElementById('stats');
const themeSel = document.getElementById('theme');
// 获取时间输入框元素
const notifTimeInput = document.getElementById('notif-time-input');

let notes = [];
let editingNoteId = null;

// 1. 初始化时加载保存的时间（如果需要持久化，建议在 preload/main 中处理）
// 这里假设我们从本地存储读取，或者默认为 10:00
async function init() {
  notes = await window.api.loadNotes();

  // 从 localStorage 读取用户保存的通知时间
  const savedTime = localStorage.getItem('notif-time') || '10:00';
  notifTimeInput.value = savedTime;

  // 通知主进程
  window.api.setNotificationTime(savedTime);

  renderNotes();
  updateStats();
}
init();
// 2. 监听时间输入变化
notifTimeInput.addEventListener('change', (e) => {
  const newTime = e.target.value;
  if (newTime) {
    // 保存到本地以便下次启动
    localStorage.setItem('notif-time', newTime);
    // 通过 IPC 发送给主进程
    window.api.setNotificationTime(newTime);
    console.log('通知时间已同步至主进程:', newTime);
  }
  // 简单的视觉反馈
  const originalColor = notifTimeInput.style.borderColor;
  notifTimeInput.style.borderColor = '#4caf50';
  setTimeout(() => notifTimeInput.style.borderColor = originalColor, 1000);
});

// 2. Theme handling
themeSel.addEventListener('change', () => {
  document.body.className = themeSel.value === 'theme3' ? 'themeRandom' : themeSel.value;
});

// --- 新增：监听系统主题变化 ---
window.api.onThemeChanged((theme) => {
  if (theme === 'dark') {
    document.body.className = 'theme-dark';
  } else {

    // 保持用户之前手动选中的主题，或者默认使用 light
    const currentTheme = document.getElementById('theme').value;
    document.body.className = currentTheme === 'theme3' ? 'themeRandom' : currentTheme;
  }
});

// 3. Modal helpers
function openModal(note = null) {
  editingNoteId = note?.id || null;
  document.getElementById('note-title').value = note?.title ?? '';
  document.getElementById('note-content').value = note?.content ?? '';
  document.getElementById('note-level').value = note?.level ?? 'mid';
  document.getElementById('note-status').value = note?.status ?? 'todo';
  modal.classList.remove('hidden');
}
function closeModal() { modal.classList.add('hidden'); }

// 4. Render notes - 核心修改：实现分类计数
function renderNotes() {
  const containers = {
    todo: document.getElementById('todo-container'),
    redo: document.getElementById('redo-container'),
    done: document.getElementById('done-container')
  };

  // 初始化计数器对象
  const counts = { todo: 0, redo: 0, done: 0 };

  // 清空所有容器内容
  Object.values(containers).forEach(container => {
    if (container) container.innerHTML = '';
  });

  notes.forEach(n => {
    // 1. 增加对应分类的计数
    if (counts.hasOwnProperty(n.status)) {
      counts[n.status]++;
    }

    const card = document.createElement('div');
    card.className = `note-card ${n.level}`;
    card.dataset.status = n.status;

    const displayDate = new Date(n.created).toLocaleString('zh-CN', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',   // 修正为 '2-digit'
      minute: '2-digit'  // 修正为 '2-digit'
    });

    card.innerHTML = `
          <div class="status-watermark">${n.status.toUpperCase()}</div>
          <div class="actions">
            <button class="edit" title="编辑">✏️</button>
            <button class="del" title="删除">🗑️</button>
          </div>
          <strong class="title">${n.title}</strong>
          <p class="content" title="${n.content.replace(/"/g, '&quot;')}">${n.content}</p>
          <div class="card-time">${displayDate}</div>
        `;

    card.querySelector('.edit').onclick = () => openModal(n);
    card.querySelector('.del').onclick = () => deleteNote(n.id);

    const targetContainer = containers[n.status];
    if (targetContainer) {
      targetContainer.appendChild(card);
    }
  });

  // 2. 统一更新所有 Badge 的显示
  updateBadges(counts);
}

// 新增：专门负责更新各个分类计数器的函数
function updateBadges(counts) {
  const todoBadge = document.getElementById('todo-count-badge');
  const redoBadge = document.getElementById('redo-count-badge');
  const doneBadge = document.getElementById('done-count-badge');

  if (todoBadge) todoBadge.textContent = counts.todo;
  if (redoBadge) redoBadge.textContent = counts.redo;
  if (doneBadge) doneBadge.textContent = counts.done;
}

// 5. Add / Edit / Delete

addBtn.onclick = (e) => {
  e.stopPropagation(); // 阻止点击新建按钮时触发底层可能的其他事件
  openModal();
};
saveBtn.onclick = (e) => {
  e.stopPropagation(); // 阻止事件向上传播到 modal 遮罩层
  const title = document.getElementById('note-title').value.trim();
  const content = document.getElementById('note-content').value.trim();
  const level = document.getElementById('note-level').value;
  const status = document.getElementById('note-status').value;

  if (!title) return alert('标题不能为空');

  if (editingNoteId) {
    // Edit existing
    const idx = notes.findIndex(n => n.id === editingNoteId);
    notes[idx] = { ...notes[idx], title, content, level, status };
  } else {
    // New
    notes.push({
      id: Date.now(),
      title,
      content,
      level,
      status,
      created: new Date().toISOString()
    });
  }
  window.api.saveNotes(notes);
  window.api.notesUpdated();
  renderNotes();
  updateStats();
  closeModal();
};

cancelBtn.onclick = (e) => {
  e.stopPropagation(); // 阻止事件向上传播
  closeModal();
};

// 6. Delete
function deleteNote(id) {
  notes = notes.filter(n => n.id !== id);
  window.api.saveNotes(notes);
  window.api.notesUpdated();
  renderNotes();
  updateStats();
}

// 7. Stats - 原有的全局统计保持不变，作为补充
function updateStats() {
  const counts = { todo: 0, redo: 0, done: 0 };
  notes.forEach(n => {
    if (counts.hasOwnProperty(n.status)) counts[n.status]++;
  });
  stats.textContent = `待做 ${counts.todo} | 再做 ${counts.redo} | 完成 ${counts.done}`;
}

// 找到 DOM 元素
const darkToggleBtn = document.getElementById('toggle-dark');

// --- 新增：切换暗黑模式的逻辑 ---
darkToggleBtn.onclick = (e) => {
  e.stopPropagation();
  // 逻辑：如果当前是 theme-dark，则切回用户选中的主题；否则切换到 dark
  if (document.body.classList.contains('theme-dark')) {
    const currentTheme = themeSel.value;
    document.body.className = currentTheme === 'theme3' ? 'themeRandom' : currentTheme;
  } else {
    document.body.className = 'theme-dark';
  }
};