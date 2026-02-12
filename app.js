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
  window.location.href = 'user.html';
}

// ============================================================================
// AUTHENTICATION
// ============================================================================
async function registerUser(username, password) {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({username,password})
  });
  const data = await res.json();
  if(!res.ok) throw new Error(data.error || 'Registration failed');
  return data;
}

async function loginUser(username, password) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({username,password})
  });
  const data = await res.json();
  if(!res.ok) throw new Error(data.error || 'Login failed');

  sessionStorage.setItem('user_session', JSON.stringify(data.user));
  return data;
}

// ============================================================================
// BOOK OPERATIONS - CRUD
// ============================================================================
async function loadBooks() {
  try {
    const res = await fetch(`${API_BASE}/books`);
    if(!res.ok) return [];
    return await res.json();
  } catch(e) { console.error(e); return []; }
}

async function searchBooks(query='') {
  try {
    const url = query ? `${API_BASE}/books?search=${encodeURIComponent(query)}` : `${API_BASE}/books`;
    const res = await fetch(url);
    if(!res.ok) return [];
    return await res.json();
  } catch(e) { console.error(e); return []; }
}

async function addBook({title,author,isbn,image}) {
  const res = await fetch(`${API_BASE}/books`, {
    method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({title,author,isbn,image})
  });
  const data = await res.json();
  if(!res.ok) throw new Error(data.error || 'Failed to add book');
  return data;
}

async function updateBook(id,data) {
  const res = await fetch(`${API_BASE}/books/${id}`, {
    method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data)
  });
  const result = await res.json();
  if(!res.ok) throw new Error(result.error || 'Failed to update book');
  return result;
}

async function deleteBook(id) {
  const res = await fetch(`${API_BASE}/books/${id}`, { method:'DELETE' });
  const data = await res.json();
  if(!res.ok) throw new Error(data.error || 'Failed to delete book');
  return data;
}

// ============================================================================
// BOOK ACTIONS
// ============================================================================
async function reserveBook(id, username) {
  const res = await fetch(`${API_BASE}/books/${id}/reserve`, {
    method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({username})
  });
  const data = await res.json();
  if(!res.ok) throw new Error(data.error || 'Failed to reserve book');
  return data;
}

async function borrowBook(id, username) {
  const res = await fetch(`${API_BASE}/books/${id}/borrow`, {
    method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({username})
  });
  const data = await res.json();
  if(!res.ok) throw new Error(data.error || 'Failed to borrow book');
  return data;
}

async function returnBook(id, username=null) {
  const usr = username || (currentUser() ? currentUser().username : null);
  if(!usr) return alert('Jābūt pieslēgtam');

  const res = await fetch(`${API_BASE}/books/${id}/return`, {
    method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({username:usr})
  });
  const data = await res.json();
  if(!res.ok) throw new Error(data.error || 'Failed to return book');
  return data;
}

// ============================================================================
// RENDER FUNCTIONS
// ============================================================================
function escapeHtml(s){ return (s||'').toString().replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

async function renderBooks(query='') {
  const container = document.getElementById('books');
  if(!container) return;
  container.innerHTML='<p>Loading...</p>';
  const items = await searchBooks(query);
  container.innerHTML='';
  items.forEach(b=>{
    const div = document.createElement('div');
    div.className='book';
    div.innerHTML=`
      <div>${b.image ? `<img src="${b.image}" alt="${b.title}">`
        : '<div style="width:80px;height:100px;background:#eee;display:flex;align-items:center;justify-content:center">No image</div>'}</div>
      <div style="flex:1">
        <strong>${escapeHtml(b.title)}</strong>
        <div>${escapeHtml(b.author)}</div>
        <div>ISBN: ${escapeHtml(b.isbn||'')}</div>
        <div>Status: ${escapeHtml(b.status)}</div>
      </div>
    `;
    container.appendChild(div);
  });
}

async function renderBooksUser(query='') {
  const container = document.getElementById('books-user');
  if(!container) return;
  container.innerHTML='<p>Loading...</p>';
  const user = currentUser();
  const items = await searchBooks(query);
  container.innerHTML='';
  items.forEach(b=>{
    const div = document.createElement('div');
    div.className='book';
    let buttons='';
    if(b.status==='available' && user) buttons=`<button onclick="tryReserve(${b.id})">Rezervēt</button>`;
    if(b.status==='borrowed' && user && b.reserved_by===user.id) buttons=`<button onclick="tryReturn(${b.id})">Atgriezt</button>`;
    div.innerHTML=`
      <div>${b.image ? `<img src="${b.image}" alt="${b.title}">`
        : '<div style="width:80px;height:100px;background:#eee;display:flex;align-items:center;justify-content:center">No image</div>'}</div>
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
  if(!container) return;
  container.innerHTML='<p>Loading...</p>';
  const allBooks = await loadBooks(); // visu grāmatu ielāde

  container.innerHTML='';
  allBooks.forEach(b=>{
    const div = document.createElement('div');
    div.className='book';
    div.innerHTML=`
      <div>${b.image ? `<img src="${b.image}" alt="${b.title}">`
        : '<div style="width:80px;height:100px;background:#eee;display:flex;align-items:center;justify-content:center">No image</div>'}</div>
      <div style="flex:1">
        <strong>${escapeHtml(b.title)}</strong>
        <div>${escapeHtml(b.author)}</div>
        <div>ISBN: ${escapeHtml(b.isbn||'')}</div>
        <div>Status: ${escapeHtml(b.status)}</div>
        <div style="margin-top:6px">
          <button onclick="adminEdit(${b.id})">Rediģēt</button>
          <button onclick="adminDelete(${b.id})">Dzēst</button>
          ${b.status==='reserved' ? `<button onclick="returnBook(${b.id}, '${b.reserved_by}')">Atgriezt</button>` : ''}
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
      alert('Grāmata dzēsta');
      renderBooksAdmin();
    }catch(e){ alert('Kļūda: '+e.message); }
  }
}

// ============================================================================
// UI ACTIONS
// ============================================================================
async function tryReserve(id){
  const usr=currentUser();
  if(!usr) return confirm('Lai rezervētu, pieslēdzies!') ? location.href='user.html' : null;
  try{ await reserveBook(id, usr.username); alert('Rezervēta ✅'); renderBooksUser(''); }catch(e){alert('Kļūda: '+e.message);}
}

async function tryReturn(id){
  try{ await returnBook(id); alert('Atgriezts ✅'); renderBooksUser(''); renderBooksAdmin(); }catch(e){alert('Kļūda: '+e.message);}
}

// ============================================================================
// FILE UTILS
// ============================================================================
function fileToDataURL(file){ return new Promise((resolve,reject)=>{ const reader=new FileReader(); reader.onload=e=>resolve(e.target.result); reader.onerror=reject; reader.readAsDataURL(file); }); }

// ============================================================================
// INIT ADD / UPDATE BUTTON
// ============================================================================
document.getElementById('btn-add').onclick=async()=>{
  const id=document.getElementById('book-id').value;
  const title=document.getElementById('title').value;
  const author=document.getElementById('author').value;
  const isbn=document.getElementById('isbn').value;
  const file=document.getElementById('image-file').files[0];
  const image=file?await fileToDataURL(file):null;

  if(id){ await updateBook(id,{title,author,isbn,image}); alert('Grāmata atjaunināta'); }
  else{ await addBook({title,author,isbn,image}); alert('Grāmata pievienota'); }

  renderBooksAdmin();
  document.getElementById('book-id').value='';
  document.getElementById('title').value='';
  document.getElementById('author').value='';
  document.getElementById('isbn').value='';
  document.getElementById('image-file').value='';
};

// ============================================================================
// EXPORT / WINDOW
// ============================================================================
window.renderBooks=renderBooks;
window.renderBooksUser=renderBooksUser;
window.renderBooksAdmin=renderBooksAdmin;
window.tryReserve=tryReserve;
window.tryReturn=tryReturn;
window.adminEdit=adminEdit;
window.adminDelete=adminDelete;
window.addBook=addBook;
window.updateBook=updateBook;
window.deleteBook=deleteBook;
window.registerUser=registerUser;
window.loginUser=loginUser;
window.logout=logout;
window.currentUser=currentUser;