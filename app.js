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
  notes.forEach(n => {
    const card = document.createElement('div');
    card.className = `note-card ${n.level}`;
    card.dataset.status = n.status;
    card.innerHTML = `
          <strong>${n.title}</strong>
          <p>${n.content}</p>
          <div class="actions">
            <button class="edit" title="编辑">✏️</button>
            <button class="del" title="删除">🗑️</button>
          </div>
        `;
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