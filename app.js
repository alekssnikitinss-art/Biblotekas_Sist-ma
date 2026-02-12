// app.js — Uses Flask API backend with PostgreSQL database
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
  location.reload();
}

// ============================================================================
// AUTHENTICATION
// ============================================================================

async function registerUser(username, password) {
  const response = await fetch(`${API_BASE}/auth/register`, {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({username, password})
  });
  const data = await response.json();
  if(!response.ok) throw new Error(data.error || 'Registration failed');
  return data;
}

async function loginUser(username,password){
  const response = await fetch(`${API_BASE}/auth/login`,{
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({username,password})
  });
  const data = await response.json();
  if(!response.ok) throw new Error(data.error || 'Login failed');
  sessionStorage.setItem('user_session', JSON.stringify(data.user));
  return data;
}

// ============================================================================
// BOOK CRUD
// ============================================================================

async function loadBooks(){
  try {
    const res = await fetch(`${API_BASE}/books`);
    const data = await res.json();
    if(!res.ok) throw new Error(data.error || 'Load books failed');
    return data;
  } catch(e) { console.error(e); return []; }
}

async function searchBooks(query){
  try{
    const url = query ? `${API_BASE}/books?search=${encodeURIComponent(query)}` : `${API_BASE}/books`;
    const res = await fetch(url);
    const data = await res.json();
    if(!res.ok) return [];
    return data;
  } catch(e){ console.error(e); return []; }
}

async function addBook(book){ // {title,author,isbn,image}
  const res = await fetch(`${API_BASE}/books`,{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify(book)
  });
  const data = await res.json();
  if(!res.ok) throw new Error(data.error || 'Add book failed');
  return data;
}

async function updateBook(id,data){
  const res = await fetch(`${API_BASE}/books/${id}`,{
    method:'PUT',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify(data)
  });
  const result = await res.json();
  if(!res.ok) throw new Error(result.error || 'Update failed');
  return result;
}

async function deleteBook(id){
  const res = await fetch(`${API_BASE}/books/${id}`,{method:'DELETE'});
  const data = await res.json();
  if(!res.ok) throw new Error(data.error || 'Delete failed');
  return data;
}

// ============================================================================
// BOOK ACTIONS
// ============================================================================

async function reserveBook(id, username){
  const res = await fetch(`${API_BASE}/books/${id}/reserve`,{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({username})
  });
  const data = await res.json();
  if(!res.ok) throw new Error(data.error || 'Reserve failed');
  return data;
}

async function borrowBook(id, username){
  const res = await fetch(`${API_BASE}/books/${id}/borrow`,{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({username})
  });
  const data = await res.json();
  if(!res.ok) throw new Error(data.error || 'Borrow failed');
  return data;
}

async function returnBook(id, username){
  const res = await fetch(`${API_BASE}/books/${id}/return`,{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({username})
  });
  const data = await res.json();
  if(!res.ok) throw new Error(data.error || 'Return failed');
  return data;
}

// ============================================================================
// RENDER FUNCTIONS
// ============================================================================

async function renderBooksUser(query){
  const container = document.getElementById('books-user');
  if(!container) return;
  container.innerHTML = '<p>Loading...</p>';
  const user = currentUser();
  const items = await searchBooks(query);
  container.innerHTML = '';

  items.forEach(b => {
    const div = document.createElement('div');
    div.className='book';

    let buttons='';
    if(b.status==='available' && user){
      buttons=`<button onclick="tryReserve(${b.id})">Rezervēt</button>`;
    }
    if((b.status==='reserved' || b.status==='borrowed') && user && b.reserved_by===user.username){
      buttons=`<button onclick="tryReturn(${b.id})">Atgriezt</button>`;
    }

    div.innerHTML=`
      <div>
        ${b.image ? `<img src="${b.image}" alt="${b.title}">` :
        '<div style="width:80px;height:100px;background:#eee;display:flex;align-items:center;justify-content:center">No image</div>'}
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

async function renderBooksAdmin(){
  const container = document.getElementById('books-admin');
  if(!container) return;
  container.innerHTML='<p>Loading...</p>';
  const items = await loadBooks();
  container.innerHTML='';

  items.forEach(b=>{
    const div = document.createElement('div');
    div.className='book';
    div.innerHTML=`
      <div>
        ${b.image ? `<img src="${b.image}" alt="${b.title}">` :
        '<div style="width:80px;height:100px;background:#eee;display:flex;align-items:center;justify-content:center">No image</div>'}
      </div>
      <div style="flex:1">
        <strong>${escapeHtml(b.title)}</strong>
        <div>${escapeHtml(b.author)}</div>
        <div>ISBN: ${escapeHtml(b.isbn||'')}</div>
        <div>Status: ${escapeHtml(b.status)}</div>
        <div style="margin-top:6px">
          <button onclick="adminEdit(${b.id})">Rediģēt</button>
          <button onclick="adminDelete(${b.id})">Dzēst</button>
          ${b.status==='reserved'||b.status==='borrowed' ? `<button onclick="adminReturn(${b.id})">Atgriezt</button>` : ''}
        </div>
      </div>
    `;
    container.appendChild(div);
  });
}

// ============================================================================
// ADMIN FUNCTIONS
// ============================================================================

async function adminEdit(id){
  const books = await loadBooks();
  const b = books.find(x=>x.id===id);
  if(!b) return;
  document.getElementById('book-id').value=b.id;
  document.getElementById('title').value=b.title;
  document.getElementById('author').value=b.author;
  document.getElementById('isbn').value=b.isbn||'';
}

async function adminDelete(id){
  if(!confirm('Tiešām dzēst?')) return;
  try{
    await deleteBook(id);
    alert('Grāmata dzēsta ✅');
    renderBooksAdmin();
    renderBooksUser('');
  } catch(e){ alert('Kļūda: '+e.message); }
}

async function adminReturn(id){
  const books = await loadBooks();
  const b = books.find(x=>x.id===id);
  if(!b){ alert('Grāmata nav atrasta'); return; }
  const username = b.borrowed_by || b.reserved_by;
  if(!username){ alert('Nav lietotāja, kam atgriezt grāmatu'); return; }

  try{
    await returnBook(id, username);
    alert(`Grāmata atgriezta ✅ (${username})`);
    renderBooksAdmin();
    renderBooksUser('');
  } catch(e){ alert('Kļūda: '+e.message); }
}

// ============================================================================
// USER ACTIONS
// ============================================================================

async function tryReserve(id){
  const user = currentUser();
  if(!user){ alert('Jābūt pieslēgtam'); return; }
  try{
    await reserveBook(id, user.username);
    alert('Rezervēta ✅');
    renderBooksUser('');
    renderBooksAdmin();
  } catch(e){ alert('Kļūda: '+e.message); }
}

async function tryReturn(id){
  const user = currentUser();
  if(!user){ alert('Jābūt pieslēgtam'); return; }
  try{
    await returnBook(id, user.username);
    alert('Atgriezts ✅');
    renderBooksUser('');
    renderBooksAdmin();
  } catch(e){ alert('Kļūda: '+e.message); }
}

// ============================================================================
// UTILITIES
// ============================================================================

function escapeHtml(s){ return (s||'').toString().replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

function fileToDataURL(file){
  return new Promise((resolve,reject)=>{
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ============================================================================
// EXPOSE FUNCTIONS
// ============================================================================

window.renderBooksUser = renderBooksUser;
window.renderBooksAdmin = renderBooksAdmin;
window.adminEdit = adminEdit;
window.adminDelete = adminDelete;
window.adminReturn = adminReturn;
window.tryReserve = tryReserve;
window.tryReturn = tryReturn;
window.addBook = addBook;
window.updateBook = updateBook;
window.deleteBook = deleteBook;
window.registerUser = registerUser;
window.loginUser = loginUser;
window.logout = logout;
window.currentUser = currentUser;