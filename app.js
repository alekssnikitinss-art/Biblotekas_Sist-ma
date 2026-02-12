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
  const resp = await fetch(`${API_BASE}/auth/register`, {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({username,password})
  });
  const data = await resp.json();
  if(!resp.ok) throw new Error(data.error || 'Registration failed');
  return data;
}

async function loginUser(username,password){
  const resp = await fetch(`${API_BASE}/auth/login`, {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({username,password})
  });
  const data = await resp.json();
  if(!resp.ok) throw new Error(data.error || 'Login failed');
  sessionStorage.setItem('user_session', JSON.stringify(data.user));
  return data;
}

// ============================================================================
// BOOK CRUD
// ============================================================================

async function loadBooks() {
  try{
    const resp = await fetch(`${API_BASE}/books`);
    const data = await resp.json();
    return resp.ok ? data : [];
  }catch(e){ return []; }
}

async function searchBooks(query){
  try{
    const url = query ? `${API_BASE}/books?search=${encodeURIComponent(query)}` : `${API_BASE}/books`;
    const resp = await fetch(url);
    const data = await resp.json();
    return resp.ok ? data : [];
  }catch(e){ return []; }
}

async function addBook(book){ // {title,author,isbn,image}
  const resp = await fetch(`${API_BASE}/books`, {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify(book)
  });
  const data = await resp.json();
  if(!resp.ok) throw new Error(data.error || 'Failed to add book');
  return data;
}

async function updateBook(id,book){
  const resp = await fetch(`${API_BASE}/books/${id}`, {
    method:'PUT',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify(book)
  });
  const data = await resp.json();
  if(!resp.ok) throw new Error(data.error || 'Failed to update book');
  return data;
}

async function deleteBook(id){
  const resp = await fetch(`${API_BASE}/books/${id}`, {method:'DELETE'});
  const data = await resp.json();
  if(!resp.ok) throw new Error(data.error || 'Failed to delete book');
  return data;
}

// ============================================================================
// BOOK ACTIONS
// ============================================================================

async function reserveBook(id, username){
  const resp = await fetch(`${API_BASE}/books/${id}/reserve`, {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({username})
  });
  const data = await resp.json();
  if(!resp.ok) throw new Error(data.error || 'Failed to reserve');
  return data;
}

async function returnBook(id, username=null){
  const resp = await fetch(`${API_BASE}/books/${id}/return`, {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({username})
  });
  const data = await resp.json();
  if(!resp.ok) throw new Error(data.error || 'Failed to return');
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

  items.forEach(b=>{
    const div = document.createElement('div');
    div.className='book';

    let buttons='';
    if(b.status==='available' && user) buttons=`<button onclick="tryReserve(${b.id})">Rezervēt</button>`;
    if(b.status==='borrowed' && user && b.reserved_by===user.id) buttons=`<button onclick="tryReturn(${b.id})">Atgriezt</button>`;

    div.innerHTML=`
      <div>${b.image ? `<img src="${b.image}" alt="${b.title}">` : '<div style="width:80px;height:100px;background:#eee;display:flex;align-items:center;justify-content:center">No image</div>'}</div>
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
  const container=document.getElementById('books-admin');
  if(!container) return;
  container.innerHTML='<p>Loading...</p>';
  const items = await loadBooks();
  container.innerHTML='';

  items.forEach(b=>{
    const div = document.createElement('div');
    div.className='book';
    div.innerHTML=`
      <div>${b.image ? `<img src="${b.image}" alt="${b.title}">` : '<div style="width:80px;height:100px;background:#eee;display:flex;align-items:center;justify-content:center">No image</div>'}</div>
      <div style="flex:1">
        <strong>${escapeHtml(b.title)}</strong>
        <div>${escapeHtml(b.author)}</div>
        <div>ISBN: ${escapeHtml(b.isbn||'')}</div>
        <div>Status: ${escapeHtml(b.status)}</div>
        <div style="margin-top:6px">
          <button onclick="adminEdit(${b.id})">Rediģēt</button>
          <button onclick="adminDelete(${b.id})">Dzēst</button>
          <button onclick="adminReturn(${b.id})">Atgriezt</button>
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
  if(confirm('Tiešām dzēst?')){
    try{
      await deleteBook(id);
      alert('Grāmata dzēsta ✅');
      renderBooksAdmin();
      renderBooksUser('');
    }catch(e){ alert('Kļūda: '+e.message); }
  }
}

async function adminReturn(id){
  try{
    await returnBook(id,null); // admin atgriež bez username
    alert('Grāmata atgriezta ✅');
    renderBooksAdmin();
    renderBooksUser('');
  }catch(e){ alert('Kļūda: '+e.message); }
}

// ============================================================================
// UI ACTIONS
// ============================================================================

async function tryReserve(id){
  const user = currentUser();
  if(!user){ if(confirm('Nepieciešams pieslēgties. Atvērt User lapu?')) location.href='user.html'; return; }
  try{ await reserveBook(id,user.username); renderBooksUser(''); alert('Rezervēta ✅'); }catch(e){ alert('Kļūda: '+e.message);}
}

async function tryReturn(id){
  const user = currentUser();
  if(!user){ alert('Jābūt pieslēgtam'); return; }
  try{ await returnBook(id,user.username); renderBooksUser(''); alert('Atgriezts ✅'); }catch(e){ alert('Kļūda: '+e.message);}
}

// ============================================================================
// UTILITIES
// ============================================================================

function escapeHtml(s){
  return (s||'').toString().replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function fileToDataURL(file){
  return new Promise((res,rej)=>{
    const reader = new FileReader();
    reader.onload=e=>res(e.target.result);
    reader.onerror=rej;
    reader.readAsDataURL(file);
  });
}

// ============================================================================
// EXPOSE FUNCTIONS
// ============================================================================

window.renderBooksUser=renderBooksUser;
window.renderBooksAdmin=renderBooksAdmin;
window.tryReserve=tryReserve;
window.tryReturn=tryReturn;
window.adminEdit=adminEdit;
window.adminDelete=adminDelete;
window.adminReturn=adminReturn;
window.addBook=addBook;
window.updateBook=updateBook;
window.deleteBook=deleteBook;
window.registerUser=registerUser;
window.loginUser=loginUser;
window.logout=logout;
window.currentUser=currentUser;