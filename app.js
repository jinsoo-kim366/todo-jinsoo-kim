let todos = [];
let nextId = 1;
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
const list = document.getElementById('list');
const empty = document.getElementById('empty');
const summary = document.getElementById('summary');

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text) return;
  todos.push({ id: nextId++, text, done: false });
  input.value = '';
  render();
});

function toggle(id) {
  const todo = todos.find(t => t.id === id);
  todo.done = !todo.done;
  render();
}

function remove(id) {
  todos = todos.filter(t => t.id !== id);
  render();
}

function startEdit(id) {
  editingId = id;
  render();
}

function finishEdit(id, text, save) {
  if (editingId !== id) return;
  editingId = null;
  if (save) {
    const trimmed = text.trim();
    if (trimmed) {
      todos.find(t => t.id === id).text = trimmed;
    } else {
      // 내용을 모두 지우면 할 일도 삭제
      todos = todos.filter(t => t.id !== id);
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

    li.append(checkbox, content, del);
    list.append(li);

    if (editingId === todo.id) {
      content.focus();
      content.select();
    }
  }

  const doneCount = todos.filter(t => t.done).length;
  empty.textContent = emptyMessages[filter];
  empty.style.display = visible.length ? 'none' : 'block';
  summary.textContent = todos.length
    ? `전체 ${todos.length}개 · 완료 ${doneCount}개`
    : '할 일을 추가해 보세요';
}

render();
