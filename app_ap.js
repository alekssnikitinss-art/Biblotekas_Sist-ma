// app.js — Uses Flask API backend with PostgreSQL database
// API Base URL (change based on environment)
const API_BASE = window.location.hostname === 'localhost' 
  ? 'http://localhost:5000/api'
  : '/api';

// ============================================================================
// SESSION MANAGEMENT
// ============================================================================

function currentUser() {
  const session = sessionStorage.getItem('user_session');
  return session ? JSON.parse(session) : null;
}

function logout() {
  sessionStorage.removeItem('user_session');
  window.location.href = 'user.html';
}

// ============================================================================
// AUTHENTICATION
// ============================================================================

async function registerUser(username, password) {
  try {
    const response = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Registration failed');
    }
    
    return data;
  } catch (error) {
    throw error;
  }
}

async function loginUser(username, password) {
  try {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Login failed');
    }
    
    // Save session
    sessionStorage.setItem('user_session', JSON.stringify(data.user));
    return data;
  } catch (error) {
    throw error;
  }
}

// ============================================================================
// BOOK OPERATIONS - CRUD
// ============================================================================

async function loadBooks() {
  try {
    const response = await fetch(`${API_BASE}/books`);
    const data = await response.json();
    
    if (!response.ok) {
      console.error('Error loading books:', data);
      return [];
    }
    
    return data;
  } catch (error) {
    console.error('Load books error:', error);
    return [];
  }
}

async function searchBooks(query) {
  try {
    const url = query 
      ? `${API_BASE}/books?search=${encodeURIComponent(query)}`
      : `${API_BASE}/books`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (!response.ok) {
      return [];
    }
    
    return data;
  } catch (error) {
    console.error('Search error:', error);
    return [];
  }
}

async function addBook({ title, author, isbn, image }) {
  try {
    const response = await fetch(`${API_BASE}/books`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, author, isbn, image })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to add book');
    }
    
    return data;
  } catch (error) {
    throw error;
  }
}

async function updateBook(id, data) {
  try {
    const response = await fetch(`${API_BASE}/books/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || 'Failed to update book');
    }
    
    return result;
  } catch (error) {
    throw error;
  }
}

async function deleteBook(id) {
  try {
    const response = await fetch(`${API_BASE}/books/${id}`, {
      method: 'DELETE'
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to delete book');
    }
    
    return data;
  } catch (error) {
    throw error;
  }
}

// ============================================================================
// BOOK ACTIONS
// ============================================================================

async function reserveBook(id, username) {
  try {
    const response = await fetch(`${API_BASE}/books/${id}/reserve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to reserve book');
    }
    
    return data;
  } catch (error) {
    throw error;
  }
}

async function borrowBook(id, username) {
  try {
    const response = await fetch(`${API_BASE}/books/${id}/borrow`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to borrow book');
    }
    
    return data;
  } catch (error) {
    throw error;
  }
}

async function returnBook(id, username) {
  try {
    const response = await fetch(`${API_BASE}/books/${id}/return`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to return book');
    }
    
    return data;
  } catch (error) {
    throw error;
  }
}

// ============================================================================
// RENDERING FUNCTIONS
// ============================================================================

async function renderBooks(query) {
  const container = document.getElementById('books');
  if (!container) return;
  
  container.innerHTML = '<p>Loading...</p>';
  const items = await searchBooks(query);
  container.innerHTML = '';
  
  items.forEach(b => {
    const div = document.createElement('div');
    div.className = 'book';
    div.innerHTML = `
      <div>
        ${b.image 
          ? `<img src="${b.image}" alt="${b.title}">` 
          : '<div style="width:80px;height:100px;background:#eee;display:flex;align-items:center;justify-content:center">No image</div>'
        }
      </div>
      <div style="flex:1">
        <strong>${escapeHtml(b.title)}</strong>
        <div>${escapeHtml(b.author)}</div>
        <div>ISBN: ${escapeHtml(b.isbn || '')}</div>
        <div>Status: ${escapeHtml(b.status)}</div>
      </div>
    `;
    container.appendChild(div);
  });
}

async function renderBooksUser(query) {
  const container = document.getElementById('books-user');
  if (!container) return;
  
  container.innerHTML = '<p>Loading...</p>';
  const user = currentUser();
  const items = await searchBooks(query);
  container.innerHTML = '';
  
  items.forEach(b => {
    const div = document.createElement('div');
    div.className = 'book';
    
    let buttons = '';
    if (b.status === 'available' && user) {
      buttons = `<button onclick="tryReserve(${b.id})">Rezervēt</button>`;
    }
    if (b.status === 'borrowed' && user && b.reserved_by === user.id) {
      buttons = `<button onclick="tryReturn(${b.id})">Atgriezt</button>`;
    }
    
    div.innerHTML = `
      <div>
        ${b.image 
          ? `<img src="${b.image}" alt="${b.title}">` 
          : '<div style="width:80px;height:100px;background:#eee;display:flex;align-items:center;justify-content:center">No image</div>'
        }
      </div>
      <div style="flex:1">
        <strong>${escapeHtml(b.title)}</strong>
        <div>${escapeHtml(b.author)}</div>
        <div>Status: ${escapeHtml(b.status)}</div>
        ${buttons}
      </div>
    `;
    container.appendChild(div);
  });
}

async function renderBooksAdmin() {
  const container = document.getElementById('books-admin');
  if (!container) return;
  
  container.innerHTML = '<p>Loading...</p>';
  const items = await loadBooks();
  container.innerHTML = '';
  
  items.forEach(b => {
    const div = document.createElement('div');
    div.className = 'book';
    div.innerHTML = `
      <div>
        ${b.image 
          ? `<img src="${b.image}" alt="${b.title}">` 
          : '<div style="width:80px;height:100px;background:#eee;display:flex;align-items:center;justify-content:center">No image</div>'
        }
      </div>
      <div style="flex:1">
        <strong>${escapeHtml(b.title)}</strong>
        <div>${escapeHtml(b.author)}</div>
        <div>ISBN: ${escapeHtml(b.isbn || '')}</div>
        <div>Status: ${escapeHtml(b.status)}</div>
        <div style="margin-top:6px">
          <button onclick="adminEdit(${b.id})">Rediģēt</button>
          <button onclick="adminDelete(${b.id})">Dzēst</button>
        </div>
      </div>
    `;
    container.appendChild(div);
  });
}

// ============================================================================
// ADMIN FUNCTIONS
// ============================================================================

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
  if (confirm('Tiešām dzēst?')) {
    try {
      await deleteBook(id);
      alert('Grāmata dzēsta');
      renderBooksAdmin();
    } catch (error) {
      alert('Kļūda: ' + error.message);
    }
  }
}

// ============================================================================
// UI ACTIONS
// ============================================================================

async function tryReserve(id) {
  const usr = currentUser();
  if (!usr) {
    if (confirm('Lai rezervētu, nepieciešams pieslēgties. Atvērt User lapu?')) {
      location.href = 'user.html';
    }
    return;
  }
  
  try {
    await reserveBook(id, usr.username);
    alert('Rezervēta ✅');
    renderBooksUser('');
  } catch (error) {
    alert('Kļūda: ' + error.message);
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
    alert('Atgriezts ✅');
    renderBooksUser('');
  } catch (error) {
    alert('Kļūda: ' + error.message);
  }
}

// ============================================================================
// UTILITIES
// ============================================================================

function escapeHtml(s) {
  return (s || '').toString()
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

// ============================================================================
// EXPOSE FUNCTIONS
// ============================================================================

window.renderBooks = renderBooks;
window.renderBooksUser = renderBooksUser;
window.renderBooksAdmin = renderBooksAdmin;
window.tryReserve = tryReserve;
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