const API_BASE = window.location.hostname === 'localhost'
  ? 'http://localhost:5000/api'
  : 'https://biblioteka-backend-4i2b.onrender.com/api';

// SESSION
function currentUser() {
  const session = sessionStorage.getItem('user_session');
  return session ? JSON.parse(session) : null;
}

function logout() {
  sessionStorage.removeItem('user_session');
  window.location.href = 'user.html';
}

// AUTH
async function registerUser(username, password) {
  try {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Registration failed');
    return data;
  } catch (e) {
    throw e;
  }
}

async function loginUser(username, password) {
  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    sessionStorage.setItem('user_session', JSON.stringify(data.user));
    return data;
  } catch (e) {
    throw e;
  }
}

// BOOK CRUD
async function loadBooks() {
  try {
    const res = await fetch(`${API_BASE}/books`);
    const data = await res.json();
    if (!res.ok) return [];
    return data;
  } catch (e) {
    console.error(e);
    return [];
  }
}

async function searchBooks(query) {
  try {
    const url = query
      ? `${API_BASE}/books?search=${encodeURIComponent(query)}`
      : `${API_BASE}/books`;
    const res = await fetch(url);
    const data = await res.json();
    if (!res.ok) return [];
    return data;
  } catch (e) {
    console.error(e);
    return [];
  }
}

async function addBook({ title, author, isbn, image }) {
  const res = await fetch(`${API_BASE}/books`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, author, isbn, image })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to add book');
  return data;
}

async function updateBook(id, data) {
  const res = await fetch(`${API_BASE}/books/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  const result = await res.json();
  if (!res.ok) throw new Error(result.error || 'Failed to update book');
  return result;
}

async function deleteBook(id) {
  const res = await fetch(`${API_BASE}/books/${id}`, {
    method: 'DELETE'
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to delete book');
  return data;
}

// BOOK ACTIONS
async function reserveBook(id, username) {
  const res = await fetch(`${API_BASE}/books/${id}/reserve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to reserve book');
  return data;
}

async function borrowBook(id, username) {
  const res = await fetch(`${API_BASE}/books/${id}/borrow`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to borrow book');
  return data;
}

async function returnBook(id, username) {
  const res = await fetch(`${API_BASE}/books/${id}/return`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to return book');
  return data;
}

// RENDER USER
async function renderBooksUser(query) {
  const container = document.getElementById('books-user');
  if (!container) return;

  container.innerHTML = 'Loading...';
  const user = currentUser();
  const items = await searchBooks(query);
  container.innerHTML = '';

  items.forEach(b => {
    const div = document.createElement('div');
    div.className = 'book';

    let btns = '';

    if (user) {
      if (b.status === 'available') {
        btns = `<button onclick="tryReserve(${b.id})">Rezervēt</button>`;
      } else if (b.status === 'reserved' && b.reserved_by === user.id) {
        btns = `<button onclick="tryBorrow(${b.id})">Aizņemties</button>`;
      } else if (
        b.status === 'borrowed' &&
        (b.reserved_by === user.id || user.role === 'admin')
      ) {
        btns = `<button onclick="tryReturn(${b.id})">Atgriezt</button>`;
      }
    }

    div.innerHTML = `
      ${b.image ? `<img src="${b.image}" alt="${escapeHtml(b.title)}">` : `<div>No image</div>`}
      <h3>${escapeHtml(b.title)}</h3>
      <p>${escapeHtml(b.author)}</p>
      <p>Status: ${escapeHtml(b.status)}</p>
      ${btns}
    `;

    container.appendChild(div);
  });
}

// RENDER ADMIN
async function renderBooksAdmin() {
  const container = document.getElementById('books-admin');
  if (!container) return;

  container.innerHTML = 'Loading...';
  const items = await loadBooks();
  container.innerHTML = '';

  items.forEach(b => {
    const div = document.createElement('div');
    div.className = 'book';

    let returnBtn = '';
    if (b.status === 'borrowed') {
      returnBtn = `<button onclick="tryReturn(${b.id})">Atgriezt</button>`;
    }

    div.innerHTML = `
      ${b.image ? `<img src="${b.image}" alt="${escapeHtml(b.title)}">` : `<div>No image</div>`}
      <h3>${escapeHtml(b.title)}</h3>
      <p>${escapeHtml(b.author)}</p>
      <p>ISBN: ${escapeHtml(b.isbn || '')}</p>
      <p>Status: ${escapeHtml(b.status)}</p>
      <button onclick="adminEdit(${b.id})">Rediģēt</button>
      <button onclick="adminDelete(${b.id})">Dzēst</button>
      ${returnBtn}
    `;

    container.appendChild(div);
  });
}

// ADMIN HELPERS
async function adminEdit(id) {
  const books = await loadBooks();
  const b = books.find(x => x.id === id);
  if (!b) return;

  document.getElementById('book-id').value = b.id;
  document.getElementById('title').value = b.title;
  document.getElementById('author').value = b.author;
  document.getElementById('isbn').value = b.isbn || '';
}

async function adminDelete(id) {
  if (!confirm('Tiešām dzēst?')) return;

  try {
    await deleteBook(id);
    alert('Grāmata dzēsta');
    renderBooksAdmin();
  } catch (e) {
    alert('Kļūda: ' + e.message);
  }
}

// USER ACTIONS
async function tryReserve(id) {
  const usr = currentUser();
  if (!usr) {
    if (confirm('Lai rezervētu, nepieciešams pieslēgties.\nAtvērt User lapu?')) {
      location.href = 'user.html';
    }
    return;
  }

  try {
    await reserveBook(id, usr.username);
    alert('Rezervēta ');
    renderBooksUser('');
    renderBooksAdmin();
  } catch (e) {
    alert('Kļūda: ' + e.message);
  }
}

async function tryBorrow(id) {
  const usr = currentUser();
  if (!usr) {
    alert('Jābūt pieslēgtam');
    return;
  }

  try {
    await borrowBook(id, usr.username);
    alert('Grāmata aizņemta ');
    renderBooksUser('');
    renderBooksAdmin();
  } catch (e) {
    alert('Kļūda: ' + e.message);
  }
}

async function tryReturn(id) {
  const usr = currentUser();
  if (!usr) {
    alert('Jābūt pieslēgtam');
    return;
  }

  try {
    await returnBook(id, usr.username);
    alert('Atgriezts ');
    renderBooksUser('');
    renderBooksAdmin();
  } catch (e) {
    alert('Kļūda: ' + e.message);
  }
}

// UTIL
function escapeHtml(s) {
  return (s || '')
    .toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// EXPOSE FUNCTIONS
window.renderBooksUser = renderBooksUser;
window.renderBooksAdmin = renderBooksAdmin;
window.tryReserve = tryReserve;
window.tryBorrow = tryBorrow;
window.tryReturn = tryReturn;
window.adminEdit = adminEdit;
window.adminDelete = adminDelete;
window.addBook = addBook;
window.updateBook = updateBook;
window.deleteBook = deleteBook;
window.registerUser = registerUser;
window.loginUser = loginUser;
window.logout = logout;
window.currentUser = currentUser;