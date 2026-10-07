const db = supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

let todos = [];
let loading = true;
let filter = 'all';
let editingId = null;

const filterButtons = document.querySelectorAll('#filters button');
const emptyMessages = {
  all: '아직 할 일이 없어요.',
  active: '진행 중인 할 일이 없어요.',
  done: '완료한 할 일이 없어요.',
};

const form = document.getElementById('add-form');
const input = document.getElementById('new-todo');
const authorInput = document.getElementById('author');
const list = document.getElementById('list');
const empty = document.getElementById('empty');
const summary = document.getElementById('summary');
const errorBox = document.getElementById('error');

function showError(action, error) {
  errorBox.textContent = `${action} 실패했어요: ${error.message}`;
  errorBox.hidden = false;
}

function clearError() {
  errorBox.hidden = true;
}

async function load() {
  const { data, error } = await db.from('todos').select('id, text, done, author').order('created_at').order('id');
  loading = false;
  if (error) {
    showError('할 일을 불러오지', error);
  } else {
    todos = data;
  }
  render();
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text) return;
  const author = authorInput.value.trim() || null;
  clearError();
  const { data, error } = await db.from('todos').insert({ text, author }).select('id, text, done, author').single();
  if (error) return showError('할 일을 추가하지', error);
  todos.push(data);
  input.value = '';
  render();
});

async function toggle(id) {
  const todo = todos.find(t => t.id === id);
  clearError();
  const { error } = await db.from('todos').update({ done: !todo.done }).eq('id', id);
  if (error) {
    showError('완료 상태를 바꾸지', error);
  } else {
    todo.done = !todo.done;
  }
  render();
}

async function remove(id) {
  clearError();
  const { error } = await db.from('todos').delete().eq('id', id);
  if (error) return showError('할 일을 삭제하지', error);
  todos = todos.filter(t => t.id !== id);
  render();
}

async function rename(id, text) {
  clearError();
  const { error } = await db.from('todos').update({ text }).eq('id', id);
  if (error) return showError('할 일을 수정하지', error);
  todos.find(t => t.id === id).text = text;
}

function startEdit(id) {
  editingId = id;
  render();
}

async function finishEdit(id, text, save) {
  if (editingId !== id) return;
  editingId = null;
  const trimmed = text.trim();
  if (save && trimmed !== todos.find(t => t.id === id).text) {
    if (trimmed) {
      await rename(id, trimmed);
    } else {
      // 내용을 모두 지우면 할 일도 삭제
      return remove(id);
    }
  }
  render();
}

filterButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    filter = btn.dataset.filter;
    filterButtons.forEach(b => b.classList.toggle('active', b === btn));
    render();
  });
});

function render() {
  list.innerHTML = '';
  const visible = todos.filter(t =>
    filter === 'all' || (filter === 'done' ? t.done : !t.done)
  );

  for (const todo of visible) {
    const li = document.createElement('li');
    if (todo.done) li.classList.add('done');

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = todo.done;
    checkbox.setAttribute('aria-label', '완료 표시');
    checkbox.addEventListener('change', () => toggle(todo.id));

    let content;
    if (editingId === todo.id) {
      content = document.createElement('input');
      content.type = 'text';
      content.className = 'edit';
      content.value = todo.text;
      content.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') finishEdit(todo.id, content.value, true);
        if (e.key === 'Escape') finishEdit(todo.id, content.value, false);
      });
      content.addEventListener('blur', () => finishEdit(todo.id, content.value, true));
    } else {
      content = document.createElement('span');
      content.className = 'text';
      content.textContent = todo.text;
      content.title = '더블클릭해서 수정';
      content.addEventListener('dblclick', () => startEdit(todo.id));
    }

    const del = document.createElement('button');
    del.className = 'delete';
    del.textContent = '×';
    del.setAttribute('aria-label', '삭제');
    del.addEventListener('click', () => remove(todo.id));

    li.append(checkbox, content);
    if (todo.author) {
      const author = document.createElement('span');
      author.className = 'author';
      author.textContent = todo.author;
      author.title = `작성자: ${todo.author}`;
      li.append(author);
    }
    li.append(del);
    list.append(li);

    if (editingId === todo.id) {
      content.focus();
      content.select();
    }
  }

  const doneCount = todos.filter(t => t.done).length;
  empty.textContent = emptyMessages[filter];
  empty.style.display = visible.length || loading ? 'none' : 'block';
  summary.textContent = loading
    ? '불러오는 중…'
    : todos.length
      ? `전체 ${todos.length}개 · 완료 ${doneCount}개`
      : '할 일을 추가해 보세요';
}

render();
load();
