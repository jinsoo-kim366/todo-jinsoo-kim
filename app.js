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
const dueInput = document.getElementById('due-date');
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
  const { data, error } = await db.from('todos').select('id, text, done, author, due_date')
    .order('due_date', { nullsFirst: false }).order('created_at').order('id');
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
  const due_date = dueInput.value || null;
  clearError();
  const { data, error } = await db.from('todos').insert({ text, author, due_date })
    .select('id, text, done, author, due_date').single();
  if (error) return showError('할 일을 추가하지', error);
  todos.push(data);
  input.value = '';
  dueInput.value = '';
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

// 마감이 가까운 순, 마감일 없는 할 일은 맨 아래 (같으면 추가한 순서)
function byDueDate(a, b) {
  if (a.due_date !== b.due_date) {
    if (!a.due_date) return 1;
    if (!b.due_date) return -1;
    return a.due_date < b.due_date ? -1 : 1;
  }
  return a.id - b.id;
}

function dueLabel(dueDate) {
  const [y, m, d] = dueDate.split('-').map(Number);
  const today = new Date();
  const days = Math.round(
    (new Date(y, m - 1, d) - new Date(today.getFullYear(), today.getMonth(), today.getDate())) / 86400000
  );
  return {
    text: days === 0 ? 'D-day' : days > 0 ? `D-${days}` : `D+${-days}`,
    title: `${m}월 ${d}일 마감`,
    state: days < 0 ? 'overdue' : days <= 2 ? 'soon' : '',
  };
}

function render() {
  list.innerHTML = '';
  const visible = todos.filter(t =>
    filter === 'all' || (filter === 'done' ? t.done : !t.done)
  ).sort(byDueDate);

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
        // 한글 조합 중에 누른 Enter/Esc는 글자 조합을 끝내는 키라서 무시
        if (e.isComposing) return;
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
    if (todo.due_date) {
      const label = dueLabel(todo.due_date);
      const due = document.createElement('span');
      due.className = 'due';
      if (label.state) due.classList.add(label.state);
      due.textContent = label.text;
      due.title = label.title;
      li.append(due);
    }
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
      ? `전체 ${todos.length}개 · 남은 ${todos.length - doneCount}개 · 완료 ${doneCount}개`
      : '할 일을 추가해 보세요';
}

// 공부 조언: 10초마다 부드럽게 다음 조언으로 바뀜
const tips = [
  '25분 집중하고 5분 쉬어 보세요.',
  '큰 일은 30분 안에 끝낼 수 있는 작은 일로 나눠 보세요.',
  '책을 덮고 배운 내용을 떠올려 보면 더 오래 기억나요.',
  '공부할 때는 휴대폰을 다른 방에 두세요.',
  '어제 배운 것을 5분만 다시 보면 훨씬 덜 잊어버려요.',
  '친구에게 설명하듯 말해 보면 모르는 부분이 보여요.',
  '가장 하기 싫은 일을 가장 먼저 해 보세요.',
  '잠을 충분히 자야 배운 내용이 머릿속에 남아요.',
  '시작이 어렵다면 딱 5분만 해 보자고 마음먹어 보세요.',
  '오늘 꼭 끝낼 일 세 가지만 정해 보세요.',
  '한 시간마다 일어나서 물 한 잔 마시고 몸을 움직여 보세요.',
  '틀린 문제는 왜 틀렸는지 한 줄로 적어 두세요.',
];
const TIP_INTERVAL = 10000;
const TIP_FADE = 400;

const tipText = document.getElementById('tip');
const tipDots = document.getElementById('tip-dots');
let tipIndex = Math.floor(Math.random() * tips.length);

for (let i = 0; i < tips.length; i++) {
  tipDots.append(document.createElement('span'));
}

function showTip() {
  tipText.textContent = tips[tipIndex];
  [...tipDots.children].forEach((dot, i) => dot.classList.toggle('active', i === tipIndex));
}

setInterval(() => {
  tipText.classList.add('fade');
  setTimeout(() => {
    tipIndex = (tipIndex + 1) % tips.length;
    showTip();
    tipText.classList.remove('fade');
  }, TIP_FADE);
}, TIP_INTERVAL);

// 화면 색: 누를 때마다 자동 → 라이트 → 다크 순서로 바뀌고, 고른 색은 기억해 둠
const themeButton = document.getElementById('theme');
const themes = ['auto', 'light', 'dark'];
const themeNames = { auto: '자동', light: '라이트', dark: '다크' };
const themeIcons = { auto: '💻', light: '☀️', dark: '🌙' };
let theme = document.documentElement.dataset.theme || 'auto';

function applyTheme() {
  if (theme === 'auto') {
    delete document.documentElement.dataset.theme;
  } else {
    document.documentElement.dataset.theme = theme;
  }
  themeButton.textContent = `${themeIcons[theme]} ${themeNames[theme]}`;
  themeButton.setAttribute('aria-label', `화면 색: ${themeNames[theme]} (누르면 바뀜)`);
  themeButton.title = '누르면 화면 색이 바뀌어요';
}

themeButton.addEventListener('click', () => {
  theme = themes[(themes.indexOf(theme) + 1) % themes.length];
  applyTheme();
  try {
    localStorage.setItem('theme', theme);
  } catch (e) {
    // 저장이 막힌 브라우저에서는 이번에만 적용
  }
});

applyTheme();
showTip();
render();
load();
