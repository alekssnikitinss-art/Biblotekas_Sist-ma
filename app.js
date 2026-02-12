// app.js — Bibliotēkas front-end JS
const API_BASE = window.location.hostname === 'localhost' 
  ? 'http://localhost:5000/api'
  : 'https://biblioteka-backend-4i2b.onrender.com/api';

// ================= SESSION =================
function currentUser() {
  const session = sessionStorage.getItem('user_session');
  return session ? JSON.parse(session) : null;
}
function logout() {
  sessionStorage.removeItem('user_session');
  location.reload();
}

// ================= AUTH =================
async function registerUser(username, password) {
  try {
    const resp = await fetch(`${API_BASE}/auth/register`, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({username,password})
    });
    const data = await resp.json();
    if(!resp.ok) throw new Error(data.error||'Registration failed');
    return data;
  } catch(e){ throw e; }
}

async function loginUser(username, password) {
  try {
    const resp = await fetch(`${API_BASE}/auth/login`, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({username,password})
    });
    const data = await resp.json();
    if(!resp.ok) throw new Error(data.error||'Login failed');
    sessionStorage.setItem('user_session', JSON.stringify(data.user));
    return data;
  } catch(e){ throw e; }
}

// ================= BOOK CRUD =================
async function loadBooks() {
  try {
    const resp = await fetch(`${API_BASE}/books`);
    const data = await resp.json();
    if(!resp.ok) return [];
    return data;
  } catch(e){ console.error(e); return []; }
}

async function addBook({title,author,isbn,image}) {
  const resp = await fetch(`${API_BASE}/books`, {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({title,author,isbn,image})
  });
  const data = await resp.json();
  if(!resp.ok) throw new Error(data.error||'Add failed');
  return data;
}

async function updateBook(id,data) {
  const resp = await fetch(`${API_BASE}/books/${id}`, {
    method:'PUT',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify(data)
  });
  const res = await resp.json();
  if(!resp.ok) throw new Error(res.error||'Update failed');
  return res;
}

async function deleteBook(id) {
  const resp = await fetch(`${API_BASE}/books/${id}`, {method:'DELETE'});
  const data = await resp.json();
  if(!resp.ok) throw new Error(data.error||'Delete failed');
  return data;
}

// ================= BOOK ACTIONS =================
async function reserveBook(id,username){
  const resp = await fetch(`${API_BASE}/books/${id}/reserve`, {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({username})
  });
  const data = await resp.json();
  if(!resp.ok) throw new Error(data.error||'Reserve failed');
  return data;
}

async function returnBook(id,username){
  const resp = await fetch(`${API_BASE}/books/${id}/return`, {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({username})
  });
  const data = await resp.json();
  if(!resp.ok) throw new Error(data.error||'Return failed');
  return data;
}

// ================= RENDER USER =================
async function renderBooksUser(query=''){
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

    if(usr){
      if(b.status==='available') buttons = `<button onclick="tryReserve(${b.id})">Rezervēt</button>`;
      // Admin vienmēr var atgriezt
      else if(b.status==='borrowed' && usr.role==='admin') buttons = `<button onclick="tryReturn(${b.id})">Atgriezt</button>`;
      // Parastie lietotāji tikai savām rezervētām
      else if(b.status==='borrowed' && b.reserved_by===usr.username) buttons = `<button onclick="tryReturn(${b.id})">Atgriezt</button>`;
    }

    div.innerHTML = `
      <div>${b.image?`<img src="${b.image}" alt="${b.title}">`:'<div style="width:80px;height:100px;background:#eee;display:flex;align-items:center;justify-content:center">No image</div>'}</div>
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

// ================= RENDER ADMIN =================
async function renderBooksAdmin(){
  const container = document.getElementById('books-admin');
  if(!container) return;
  container.innerHTML = '<p>Loading...</p>';
  const items = await loadBooks();
  container.innerHTML = '';

  items.forEach(b=>{
    const div = document.createElement('div');
    div.className='book';
    div.innerHTML=`
      <div>${b.image?`<img src="${b.image}" alt="${b.title}">`:'<div style="width:80px;height:100px;background:#eee;display:flex;align-items:center;justify-content:center">No image</div>'}</div>
      <div style="flex:1">
        <strong>${escapeHtml(b.title)}</strong>
        <div>${escapeHtml(b.author)}</div>
        <div>ISBN: ${escapeHtml(b.isbn||'')}</div>
        <div>Status: ${escapeHtml(b.status)}</div>
        <div style="margin-top:6px">
          <button onclick="adminEdit(${b.id})">Rediģēt</button>
          <button onclick="adminDelete(${b.id})">Dzēst</button>
          <button onclick="tryReturn(${b.id})">Atgriezt</button>
        </div>
      </div>
    `;
    container.appendChild(div);
  });
}

// ================= ADMIN FUNCTIONS =================
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
    } catch(e){ alert('Kļūda: '+e.message); }
  }
}

// ================= UI ACTIONS =================
async function tryReserve(id){
  const usr = currentUser();
  if(!usr){ alert('Jābūt pieslēgtam'); return; }
  try{
    await reserveBook(id,usr.username);
    alert('Rezervēta ✅');
    renderBooksUser('');
  }catch(e){alert('Kļūda: '+e.message);}
}

async function tryReturn(id){
  const usr = currentUser();
  if(!usr){ alert('Jābūt pieslēgtam'); return; }
  try{
    const username = usr.role==='admin'?undefined:usr.username;
    await returnBook(id, username);
    alert('Atgriezts ✅');
    renderBooksUser('');
    renderBooksAdmin();
  }catch(e){alert('Kļūda: '+e.message);}
}

// ================= UTIL =================
function escapeHtml(s){
  return (s||'').toString().replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function fileToDataURL(file){
  return new Promise((resolve,reject)=>{
    const reader = new FileReader();
    reader.onload=e=>resolve(e.target.result);
    reader.onerror=reject;
    reader.readAsDataURL(file);
  });
}

// ================= EXPOSE =================
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