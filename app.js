// app.js — handles data in localStorage. No server required.
// Book model: {id, title, author, isbn, status, image, reserved_by}

const STORAGE_KEY = 'bib_books_v1';
const USERS_KEY = 'bib_users_v1';

function loadBooks(){
  const raw = localStorage.getItem(STORAGE_KEY);
  if(!raw){
    const sample = [
      {id: genId(), title:'Klasiskā literatūra', author:'Autors A', isbn:'1111', status:'available', image:null, reserved_by:null},
      {id: genId(), title:'Programmēšana Python', author:'Autors B', isbn:'2222', status:'available', image:null, reserved_by:null}
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sample));
    return sample;
  }
  return JSON.parse(raw || '[]');
}

function saveBooks(books){ localStorage.setItem(STORAGE_KEY, JSON.stringify(books)); }

function genId(){ return 'b'+Math.random().toString(36).slice(2,9); }

function addBook({title,author,isbn,image}){
  const books = loadBooks();
  books.push({id: genId(), title, author, isbn, status:'available', image: image||null, reserved_by:null});
  saveBooks(books);
}

function updateBook(id, data){ const books = loadBooks(); const i = books.findIndex(b=>b.id===id); if(i===-1) return; books[i]=Object.assign(books[i], data); saveBooks(books); }

function deleteBook(id){ let books = loadBooks(); books = books.filter(b=>b.id!==id); saveBooks(books); }

function searchBooks(q){ q = (q||'').toLowerCase(); const books = loadBooks(); if(!q) return books; return books.filter(b=> (b.title||'').toLowerCase().includes(q) || (b.author||'').toLowerCase().includes(q)); }

function reserveBook(id, username){ const books = loadBooks(); const b = books.find(x=>x.id===id); if(!b) throw new Error('Book not found'); if(b.status!=='available') throw new Error('Grāmata nav pieejama'); b.status='reserved'; b.reserved_by = username; saveBooks(books); }

function borrowBook(id, username){ const books = loadBooks(); const b = books.find(x=>x.id===id); if(!b) throw new Error('Book not found'); if(b.status==='available' || (b.status==='reserved' && b.reserved_by===username)){ b.status='borrowed'; b.reserved_by = username; saveBooks(books); } else throw new Error('Cannot borrow'); }

function returnBook(id, username){ const books = loadBooks(); const b = books.find(x=>x.id===id); if(!b) throw new Error('Book not found'); if(b.reserved_by===username || b.status==='borrowed'){ b.status='available'; b.reserved_by = null; saveBooks(books); } else throw new Error('You cannot return this book'); }

// User management (simple)
function loadUsers(){ const raw = localStorage.getItem(USERS_KEY); return raw?JSON.parse(raw):[] }
function saveUsers(u){ localStorage.setItem(USERS_KEY, JSON.stringify(u)); }

// Use Web Crypto API to hash passwords (SHA-256) before storing/checking.
async function hashPassword(password){
  if(!password) return '';
  const enc = new TextEncoder();
  const data = enc.encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  const arr = Array.from(new Uint8Array(hash));
  return arr.map(b=>b.toString(16).padStart(2,'0')).join('');
}

// Ensure there's at least one admin user (seed admin/admin) when the app initializes.
async function initAuth(){
  const users = loadUsers();
  if(!users.find(u=>u.role==='admin')){
    const h = await hashPassword('admin');
    users.push({username:'admin', password:h, role:'admin'});
    saveUsers(users);
  }
}

async function registerUser(username,password){ const users = loadUsers(); if(users.find(x=>x.username===username)) throw new Error('Lietotājvārds jau eksistē'); const h = await hashPassword(password); users.push({username, password: h, role:'user'}); saveUsers(users); }

// loginUser supports legacy plain-text stored passwords for backward compatibility
async function loginUser(username,password){ const users = loadUsers(); const u = users.find(x=>x.username===username); if(!u) return false; const h = await hashPassword(password); if(u.password===password || u.password===h){ localStorage.setItem('bib_session', JSON.stringify({username: u.username, role: u.role})); return true } return false }
function logout(){ localStorage.removeItem('bib_session'); }
function currentUser(){ const s = localStorage.getItem('bib_session'); return s?JSON.parse(s):null }

// Render helpers used by pages
function renderBooks(q){ const container = document.getElementById('books'); if(!container) return; const items = searchBooks(q); container.innerHTML=''; items.forEach(b=>{ const div = document.createElement('div'); div.className='book'; div.innerHTML = `<div>${b.image?'<img src="'+b.image+'">':'<div style="width:80px;height:100px;background:#eee;display:flex;align-items:center;justify-content:center">No image</div>'}</div><div style="flex:1"><strong>${escapeHtml(b.title)}</strong><div>${escapeHtml(b.author)}</div><div>ISBN: ${escapeHtml(b.isbn||'')}</div><div>Status: ${escapeHtml(b.status)}</div></div>`; container.appendChild(div); }); }

function renderBooksUser(q){ const container = document.getElementById('books-user'); if(!container) return; const user = currentUser(); const items = searchBooks(q); container.innerHTML=''; items.forEach(b=>{ const div = document.createElement('div'); div.className='book'; const btnReserve = `<button onclick="tryReserve('${b.id}')">Rezervēt</button>`;
  const btnReturn = `<button onclick="tryReturn('${b.id}')">Atgriezt</button>`;
  div.innerHTML = `<div>${b.image?'<img src="'+b.image+'">':'<div style="width:80px;height:100px;background:#eee;display:flex;align-items:center;justify-content:center">No image</div>'}</div><div style="flex:1"><strong>${escapeHtml(b.title)}</strong><div>${escapeHtml(b.author)}</div><div>Status: ${escapeHtml(b.status)}</div>${b.status==='available'?btnReserve:''}${(b.status==='borrowed' && user && b.reserved_by===user.username)?btnReturn:''}</div>`; container.appendChild(div); }); }

function renderBooksAdmin(){ const container = document.getElementById('books-admin'); if(!container) return; const items = loadBooks(); container.innerHTML=''; items.forEach(b=>{ const div=document.createElement('div'); div.className='book'; div.innerHTML = `<div>${b.image?'<img src="'+b.image+'">':'<div style="width:80px;height:100px;background:#eee;display:flex;align-items:center;justify-content:center">No image</div>'}</div><div style="flex:1"><strong>${escapeHtml(b.title)}</strong><div>${escapeHtml(b.author)}</div><div>ISBN: ${escapeHtml(b.isbn||'')}</div><div>Status: ${escapeHtml(b.status)}</div><div style="margin-top:6px"><button onclick="adminEdit('${b.id}')">Rediģēt</button> <button onclick="adminDelete('${b.id}')">Dzēst</button> <button onclick="adminMarkFinished('${b.id}')">Atzīmēt kā pabeigtu</button></div></div>`; container.appendChild(div); }); }

function adminEdit(id){ const books = loadBooks(); const b = books.find(x=>x.id===id); if(!b) return; document.getElementById('book-id').value=b.id; document.getElementById('title').value=b.title; document.getElementById('author').value=b.author; document.getElementById('isbn').value=b.isbn; }
function adminDelete(id){ if(confirm('Tiešām dzēst?')){ deleteBook(id); renderBooksAdmin(); } }
function adminMarkFinished(id){ updateBook(id, {status:'finished'}); renderBooksAdmin(); }

// actions called from UI
function tryReserve(id){ const usr = currentUser(); if(!usr){ if(confirm('Lai rezervētu, nepieciešams pieslēgties. Atvērt User lapu?')) location.href='user.html'; return } try{ reserveBook(id, usr.username); alert('Rezervēta'); renderBooksUser(''); } catch(e){ alert(e.message) } }
function tryReturn(id){ const usr = currentUser(); if(!usr){ alert('Jābūt pieslēgtam'); return } try{ returnBook(id, usr.username); alert('Atgriezts'); renderBooksUser(''); } catch(e){ alert(e.message) } }

// small util
function escapeHtml(s){ return (s||'').toString().replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') }

// Expose some functions globally for inline handlers
window.renderBooks = renderBooks;
window.renderBooksUser = renderBooksUser;
window.renderBooksAdmin = renderBooksAdmin;
window.tryReserve = tryReserve;
window.tryReturn = tryReturn;
window.addBook = addBook;
window.updateBook = updateBook;
window.deleteBook = deleteBook;
window.registerUser = registerUser;
window.loginUser = loginUser;
window.logout = logout;
window.currentUser = currentUser;
