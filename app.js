// app.js
const notesContainer = document.getElementById('notes-container');
const addBtn = document.getElementById('add-note');
const modal = document.getElementById('add-note-modal');
const saveBtn = document.getElementById('save-note');
const cancelBtn = document.getElementById('cancel-note');
const stats = document.getElementById('stats');
const themeSel = document.getElementById('theme');

let notes = [];
let editingNoteId = null;

// 1. Load existing notes
async function init() {
  notes = await window.api.loadNotes();
  renderNotes();
  updateStats();
}
init();

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

// 4. Render notes
function renderNotes() {
  notesContainer.innerHTML = '';

  // --- 核心修改：排序逻辑 ---
  // 定义优先级：todo=0, redo=1, done=2 (数字越小越靠前)
  const priority = { 'todo': 0, 'redo': 1, 'done': 2 };

  // 排序：根据 priority 升序排列
  notes.sort((a, b) => priority[a.status] - priority[b.status]);
  // ------------------------

  notes.forEach(n => {
    const card = document.createElement('div');
    card.className = `note-card ${n.level}`;
    card.dataset.status = n.status;

    // 注意：我们在 HTML 中添加了一个用于显示水印的 span
    // --- 核心修改：为 p 标签添加 title 属性 ---
    card.innerHTML = `
            <div class="status-watermark">${n.status.toUpperCase()}</div>
            <div class="actions">
              <button class="edit" title="编辑">✏️</button>
              <button class="del" title="删除">🗑️</button>
            </div>
            <strong class="title">${n.title}</strong>
            <p class="content" title="${n.content.replace(/"/g, '&quot;')}">${n.content}</p>
          `;
    // ---------------------------------------
    // Edit
    card.querySelector('.edit').onclick = () => openModal(n);
    // Delete
    card.querySelector('.del').onclick = () => deleteNote(n.id);
    notesContainer.appendChild(card);
  });
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

// 7. Stats
function updateStats() {
  const counts = { todo: 0, redo: 0, done: 0 };
  notes.forEach(n => {
    if (n.status === 'todo') counts.todo++;
    if (n.status === 'redo') counts.redo++;
    if (n.status === 'done') counts.done++;
  });
  stats.textContent = `待做 ${counts.todo} | 再做 ${counts.redo} | 完成 ${counts.done}`;
}