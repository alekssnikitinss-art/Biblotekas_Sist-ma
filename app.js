
  // app.js — Bibliotēka (Frontend JS)  
// ============================================================================
// API Base URL (Flask backend)
const API_BASE = window.location.hostname === 'localhost' 
  ? 'http://localhost:5000/api'
  : 'https://biblioteka-backend-4i2b.onrender.com/api';

// ============================================================================
// SESSION MANAGEMENT
// ============================================================================
function currentUser() {
  const session = sessionStorage.getItem('user_session');
  return session ? JSON.parse(session) : null;
}

function logout() {
  sessionStorage.removeItem('user_session');
  window.location.reload();
}

// ============================================================================
// AUTHENTICATION
// ============================================================================
async function registerUser(username, password) {
  try {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Reģistrācija neizdevās');
    return data;
  } catch (e) { throw e; }
}

async function loginUser(username, password) {
  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login neizdevās');

    sessionStorage.setItem('user_session', JSON.stringify(data.user));
    return data;
  } catch(e){ throw e; }
}

// ============================================================================
// BOOK CRUD
// ============================================================================
async function loadBooks() {
  try {
    const res = await fetch(`${API_BASE}/books`);
    const data = await res.json();
    if (!res.ok) console.error('Kļūda ielādējot grāmatas:', data);
    return data || [];
  } catch(e){ console.error(e); return []; }
}

async function addBook({title, author, isbn, image}) {
  try {
    const res = await fetch(`${API_BASE}/books`, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({title, author, isbn, image})
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Grāmatu pievienot neizdevās');
    return data;
  } catch(e){ throw e; }
}

async function updateBook(id, data) {
  try {
    const res = await fetch(`${API_BASE}/books/${id}`, {
      method:'PUT',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify(data)
    });
    const r = await res.json();
    if(!res.ok) throw new Error(r.error || 'Neizdevās atjaunināt');
    return r;
  } catch(e){ throw e; }
}

async function deleteBook(id) {
  try {
    const res = await fetch(`${API_BASE}/books/${id}`, { method:'DELETE' });
    const r = await res.json();
    if(!res.ok) throw new Error(r.error || 'Neizdevās dzēst');
    return r;
  } catch(e){ throw e; }
}

// ============================================================================
// BOOK ACTIONS
// ============================================================================
async function reserveBook(id, username) {
  try {
    const res = await fetch(`${API_BASE}/books/${id}/reserve`, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({username})
    });
    const data = await res.json();
    if(!res.ok) throw new Error(data.error || 'Rezervēt neizdevās');
    return data;
  } catch(e){ throw e; }
}

async function borrowBook(id, username) {
  try {
    const res = await fetch(`${API_BASE}/books/${id}/borrow`, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({username})
    });
    const data = await res.json();
    if(!res.ok) throw new Error(data.error || 'Aizņemt neizdevās');
    return data;
  } catch(e){ throw e; }
}

async function returnBook(id, username) {
  try {
    const res = await fetch(`${API_BASE}/books/${id}/return`, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({username})
    });
    const data = await res.json();
    if(!res.ok) throw new Error(data.error || 'Atgriezt neizdevās');
    return data;
  } catch(e){ throw e; }
}

// ============================================================================
// RENDERING FUNCTIONS
// ============================================================================
async function renderBooksUser(query='') {
  const container = document.getElementById('books-user');
  if(!container) return;
  container.innerHTML = '<p>Loading...</p>';
  const items = await loadBooks();
  const usr = currentUser();
  container.innerHTML = '';

  items.filter(b => !query || b.title.toLowerCase().includes(query.toLowerCase()) || (b.author && b.author.toLowerCase().includes(query.toLowerCase())))
       .forEach(b => {
    const div = document.createElement('div');
    div.className = 'book';

    let buttons = '';
    // Admin vienmēr redz atgriezt
    if(usr){
      if(usr.role === 'admin' && b.status === 'borrowed') {
        buttons = `<button onclick="tryReturn(${b.id})">Atgriezt</button>`;
      } else if(b.status === 'available') {
        buttons = `<button onclick="tryReserve(${b.id})">Rezervēt</button>`;
      } else if(b.status === 'borrowed' && b.reserved_by === usr.username) {
        buttons = `<button onclick="tryReturn(${b.id})">Atgriezt</button>`;
      }
    }

    div.innerHTML = `
      <div>${b.image ? `<img src="${b.image}" alt="${b.title}">` : '<div style="width:80px;height:100px;background:#eee;display:flex;align-items:center;justify-content:center">No image</div>'}</div>
      <div style="flex:1">
        <strong>${escapeHtml(b.title)}</strong>
        <div>${escapeHtml(b.author)}</div>
        <div>ISBN: ${escapeHtml(b.isbn||'')}</div>
        <div>Status: ${escapeHtml(b.status)}</div>
        ${buttons}
      </div>
    `;
    container.appendChild(div);
  });
}

async function renderBooksAdmin() {
  const container = document.getElementById('books-admin');
  if(!container) return;
  container.innerHTML = '<p>Loading...</p>';
  const items = await loadBooks();
  container.innerHTML = '';

  items.forEach(b => {
    const div = document.createElement('div');
    div.className = 'book';
    div.innerHTML = `
      <div>${b.image ? `<img src="${b.image}" alt="${b.title}">` : '<div style="width:80px;height:100px;background:#eee;display:flex;align-items:center;justify-content:center">No image</div>'}</div>
      <div style="flex:1">
        <strong>${escapeHtml(b.title)}</strong>
        <div>${escapeHtml(b.author)}</div>
        <div>ISBN: ${escapeHtml(b.isbn||'')}</div>
        <div>Status: ${escapeHtml(b.status)}</div>
        <div style="margin-top:6px">
          <button onclick="adminEdit(${b.id})">Rediģēt</button>
          <button onclick="adminDelete(${b.id})">Dzēst</button>
          ${b.status === 'borrowed' ? `<button onclick="tryReturn(${b.id})">Atgriezt</button>` : ''}
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
  if(!b) return;
  document.getElementById('book-id').value = b.id;
  document.getElementById('title').value = b.title;
  document.getElementById('author').value = b.author;
  document.getElementById('isbn').value = b.isbn||'';
}

async function adminDelete(id) {
  if(confirm('Tiešām dzēst?')){
    try {
      await deleteBook(id);
      alert('Grāmata dzēsta ✅');
      renderBooksAdmin();
    } catch(e){ alert('Kļūda: '+e.message); }
  }
}

// ============================================================================
// USER ACTIONS
// ============================================================================
async function tryReturn(id) {
  const usr = currentUser();
  if(!usr){ alert('Jābūt pieslēgtam'); return; }
  const books = await loadBooks();
  const book = books.find(b=>b.id===id);
  if(!book){ alert('Grāmata nav atrasta'); return; }

  if(usr.role!=='admin' && book.reserved_by!==usr.username){
    alert('Jums nav tiesību atgriezt šo grāmatu'); return;
  }

  try{
    await returnBook(id, usr.username);
    alert('Atgriezts ✅');
    renderBooksUser('');
    if(usr.role==='admin') renderBooksAdmin();
  } catch(e){ alert('Kļūda: '+e.message); }
}

async function tryReserve(id){
  const usr = currentUser();
  if(!usr){ alert('Jābūt pieslēgtam'); return; }
  const books = await loadBooks();
  const book = books.find(b=>b.id===id);
  if(!book){ alert('Grāmata nav atrasta'); return; }

  if(usr.role!=='admin' && book.status!=='available'){
    alert('Grāmata nav pieejama rezervēšanai'); return;
  }

  try{
    await reserveBook(id, usr.username);
    alert('Rezervēta ✅');
    renderBooksUser('');
    if(usr.role==='admin') renderBooksAdmin();
  } catch(e){ alert('Kļūda: '+e.message); }
}

// ============================================================================
// UTILITIES
// ============================================================================
function escapeHtml(s){
  return (s||'').toString()
           .replace(/&/g,'&amp;')
           .replace(/</g,'&lt;')
           .replace(/>/g,'&gt;');
}

function fileToDataURL(file){
  return new Promise((res,rej)=>{
    const reader = new FileReader();
    reader.onload = e=>res(e.target.result);
    reader.onerror = rej;
    reader.readAsDataURL(file);
  });
}

// ============================================================================
// EXPOSE FUNCTIONS
// ============================================================================
window.currentUser=currentUser;
window.logout=logout;
window.registerUser=registerUser;
window.loginUser=loginUser;
window.renderBooksUser=renderBooksUser;
window.renderBooksAdmin=renderBooksAdmin;
window.tryReturn=tryReturn;
window.tryReserve=tryReserve;
window.adminEdit=adminEdit;
window.adminDelete=adminDelete;
window.addBook=addBook;
window.updateBook=updateBook;
window.deleteBook=deleteBook;