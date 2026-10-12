import { useState, useEffect } from 'react';
import { Routes, Route, Link, Navigate, useNavigate } from 'react-router-dom';
import api from './api';
import { useAuth } from './context/AuthContext';

function Guard({ children, admin = false }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (admin && user.role !== 'ADMIN') return <Navigate to="/books" replace />;
  return children;
}

function Shell({ children }) {
  const { user, signOut } = useAuth();
  return <><header><Link className="brand" to="/">📚 ShelfWise</Link><nav><Link to="/books">Books</Link>{user&&<Link to="/my-books">My loans</Link>}{user?.role==='ADMIN'&&<Link to="/admin">Admin</Link>}<Link to="/assistant">AI Assistant</Link>{user?<button className="outline" onClick={()=>{signOut();location.href='/';}}>Sign out</button>:<><Link to="/login">Login</Link><Link className="nav-cta" to="/register">Register</Link></>}</nav></header><main>{children}</main><footer>ShelfWise · Library Management System · React + Spring Boot</footer></>}
function Home(){return <section className="hero"><div><span className="eyebrow">YOUR NEXT CHAPTER STARTS HERE</span><h1>A smarter home<br/>for every book.</h1><p>Discover the catalogue, borrow books, and keep track of your reading—all in one place.</p><div className="actions"><Link className="button" to="/books">Explore books</Link><Link className="button secondary" to="/assistant">Ask the library assistant</Link></div></div><div className="hero-art"><div className="book b1">READ<br/>MORE</div><div className="book b2">STORIES</div><div className="book b3">IDEAS</div><div className="plant">✦</div></div></section>}
function Login({ register = false }) {
  const { signIn } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  function change(e) { setForm({...form,[e.target.name]:e.target.value}) }
  async function submit(e) { e.preventDefault(); setError(''); if(form.username.trim().length<3)return setError('Username must contain at least 3 characters.'); if(form.password.length<8)return setError('Password must contain at least 8 characters.'); if(register&&!/^\S+@\S+\.\S+$/.test(form.email))return setError('Enter a valid email address.'); setBusy(true); try{const{data}=await api.post('/auth/'+(register?'register':'login'),register?form:{username:form.username,password:form.password}); signIn(data); nav('/books')} catch(err){setError(err.response?.data?.message||'Could not connect to the server. Is Spring Boot running?')} finally{setBusy(false)}}
  return <section className="auth card"><span className="eyebrow">WELCOME TO SHELFWISE</span><h2>{register?'Create your account':'Good to see you again'}</h2><p>{register?'Join the library community.':'Sign in to borrow books and view your loans.'}</p><form onSubmit={submit}><label>Username<input name="username" value={form.username} onChange={change} required minLength="3" autoComplete="username"/></label>{register&&<label>Email<input name="email" type="email" value={form.email} onChange={change} required autoComplete="email"/></label>}<label>Password<input name="password" type="password" value={form.password} onChange={change} required minLength="8" autoComplete={register?'new-password':'current-password'}/></label>{error&&<p className="error">{error}</p>}<button className="button" disabled={busy}>{busy?'Please wait…':register?'Create account':'Login'}</button></form></section>}
function Books() {
  const { user } = useAuth();
  const [page, setPage] = useState(0);
  const [q, setQ] = useState('');
  const [data, setData] = useState({ content: [], totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ title: '', author: '', isbn: '', category: '', quantity: 1 });

  async function load(p = page, query = q) {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/books', {
        params: { page: p, size: 8, q: query.trim() || undefined }
      });
      setData(response.data);
    } catch (e) {
      setError(e.response?.data?.message || 'Unable to load books. Start the backend and database.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(page, q); }, [page]);

  function startEdit(book) {
    setEditing(book.id);
    setForm({ title: book.title, author: book.author, isbn: book.isbn, category: book.category, quantity: book.quantity });
  }

  async function save(e) {
    e.preventDefault();
    try {
      if (editing) await api.put('/books/' + editing, form);
      else await api.post('/books', form);
      setEditing(null);
      setForm({ title: '', author: '', isbn: '', category: '', quantity: 1 });
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Save failed');
    }
  }

  async function remove(id) {
    if (!confirm('Delete this book?')) return;
    try {
      await api.delete('/books/' + id);
      await load();
    } catch (e) {
      setError(e.response?.data?.message || 'Delete failed');
    }
  }

  async function borrow(id) {
    try {
      await api.post('/borrow/' + id);
      setNotice('Book borrowed and saved to your loans.');
      await load();
    } catch (e) {
      setError(e.response?.data?.message || 'Could not borrow book. Please sign in and try again.');
    }
  }

  return <>
    <section className="page-head"><div><span className="eyebrow">THE CATALOGUE</span><h1>Find your next read.</h1><p>Browse books by title, author, category, or ISBN.</p></div></section>
    {user?.role === 'ADMIN' && <section className="card form-card">
      <h3>{editing ? 'Edit book' : 'Add a book'}</h3>
      <form className="book-form" onSubmit={save}>
        {[['title', 'Title'], ['author', 'Author'], ['isbn', 'ISBN'], ['category', 'Category']].map(([name, label]) => <label key={name}>{label}<input value={form[name]} required onChange={e => setForm({ ...form, [name]: e.target.value })} /></label>)}
        <label>Quantity<input type="number" min="0" value={form.quantity} required onChange={e => setForm({ ...form, quantity: Number(e.target.value) })} /></label>
        <button className="button">{editing ? 'Save changes' : 'Add book'}</button>
        {editing && <button type="button" className="button secondary" onClick={() => setEditing(null)}>Cancel</button>}
      </form>
    </section>}
    <section className="catalog">
      <form className="search" onSubmit={e => { e.preventDefault(); setPage(0); load(0, q); }}>
        <input placeholder="Search title, author, category, or ISBN…" value={q} onChange={e => setQ(e.target.value)} />
        <button className="button">Search</button>
      </form>
      {notice && <p className="success">{notice} <Link to="/my-books">View my loans</Link></p>}
      {error && <p className="error">{error}</p>}
      {loading ? <p>Loading books…</p> : <>
        <div className="book-grid">
          {data.content?.map((book, i) => <article className="book-card" key={book.id}>
            <div className={'cover cover-' + (i % 5)}><span>{book.category}</span><strong>{book.title}</strong><small>{book.author}</small></div>
            <div className="book-info"><h3>{book.title}</h3><p>by {book.author}</p><div className="meta"><span>{book.availableQuantity} available</span><span>{book.isbn}</span></div>
              <div className="card-actions">
                {user && <button className="small-button" disabled={!book.availableQuantity} onClick={() => borrow(book.id)}>Borrow</button>}
                {!user && <Link className="small-button" to="/login">Sign in to borrow</Link>}
                {user?.role === 'ADMIN' && <><button className="small-button pale" onClick={() => startEdit(book)}>Edit</button><button className="small-button danger" onClick={() => remove(book.id)}>Delete</button></>}
              </div>
            </div>
          </article>)}
        </div>
        {!data.content?.length && <div className="empty">No books found. {user?.role === 'ADMIN' && 'Add a book above.'}</div>}
        <div className="pagination"><button className="small-button" disabled={page <= 0} onClick={() => setPage(page - 1)}>Previous</button><span>Page {page + 1} of {Math.max(data.totalPages, 1)}</span><button className="small-button" disabled={page + 1 >= data.totalPages} onClick={() => setPage(page + 1)}>Next</button></div>
      </>}
    </section>
  </>;
}

function MyBooks(){const[items,setItems]=useState([]),[error,setError]=useState('');async function load(){try{setItems((await api.get('/borrow/mine')).data)}catch(e){setError(e.response?.data?.message||'Could not load loans')}}useEffect(()=>{load()},[]);async function ret(id){try{await api.post('/borrow/return/'+id);load()}catch(e){setError(e.response?.data?.message||'Return failed')}}return <section className="page"><span className="eyebrow">YOUR READING LIST</span><h1>My loans</h1>{error&&<p className="error">{error}</p>}<div className="card table-wrap"><table><thead><tr><th>Book</th><th>Borrowed</th><th>Due date</th><th>Status</th><th/></tr></thead><tbody>{items.map(x=><tr key={x.id}><td>{x.book?.title}<small>{x.book?.author}</small></td><td>{x.borrowDate}</td><td>{x.dueDate}</td><td><span className={'pill '+(x.returnDate?'returned':'active')}>{x.returnDate?'Returned':new Date(x.dueDate)<new Date()?'Overdue':'Borrowed'}</span></td><td>{!x.returnDate&&<button className="small-button" onClick={()=>ret(x.id)}>Return</button>}</td></tr>)}</tbody></table>{!items.length&&<p className="empty">No borrowing records yet. Explore the catalogue to borrow a book.</p>}</div></section>}
function Admin(){const[items,setItems]=useState([]),[error,setError]=useState('');useEffect(()=>{api.get('/borrow').then(r=>setItems(r.data)).catch(e=>setError(e.response?.data?.message||'Could not load records'))},[]);return <section className="page"><span className="eyebrow">LIBRARIAN WORKSPACE</span><h1>Borrowing overview</h1>{error&&<p className="error">{error}</p>}<div className="card table-wrap"><table><thead><tr><th>Book</th><th>Borrower</th><th>Borrow date</th><th>Due date</th><th>Status</th></tr></thead><tbody>{items.map(x=><tr key={x.id}><td>{x.book?.title}</td><td>{x.user?.username}</td><td>{x.borrowDate}</td><td>{x.dueDate}</td><td>{x.returnDate?'Returned':new Date(x.dueDate)<new Date()?'Overdue':'Borrowed'}</td></tr>)}</tbody></table>{!items.length&&<p className="empty">No borrowing records yet.</p>}</div></section>}
function Assistant(){const[message,setMessage]=useState(''),[messages,setMessages]=useState([{from:'bot',text:'Hello! Ask me about books, authors, categories, or availability in this library.'}]),[busy,setBusy]=useState(false);async function send(e){e.preventDefault();if(!message.trim()||busy)return;const question=message.trim();setMessages(m=>[...m,{from:'user',text:question}]);setMessage('');setBusy(true);try{const r=await api.post('/chat',{message:question});setMessages(m=>[...m,{from:'bot',text:r.data.answer}])}catch{setMessages(m=>[...m,{from:'bot',text:'Sorry, I could not reach the assistant. Please try again.'}])}finally{setBusy(false)}}
return <section className="chat-page"><div className="page-head"><span className="eyebrow">AI + CATALOGUE RETRIEVAL</span><h1>Library assistant</h1><p>Ask about available books, authors, and categories.</p></div><div className="chat-window card"><div className="messages">{messages.map((m,i)=><div className={'message '+m.from} key={i}><b>{m.from==='bot'?'ShelfWise':'You'}</b><div>{m.text}</div></div>)}{busy&&<div className="message bot">Searching the catalogue…</div>}</div><form className="chat-input" onSubmit={send}><input value={message} onChange={e=>setMessage(e.target.value)} placeholder="Ask about a book…"/><button className="button" disabled={busy}>Send</button></form></div><p className="hint">The assistant retrieves matching catalogue records. Configure GEMINI_API_KEY for generated natural-language answers.</p></section>}
export default function App(){return <Shell><Routes><Route path="/" element={<Home/>}/><Route path="/books" element={<Books/>}/><Route path="/login" element={<Login/>}/><Route path="/register" element={<Login register/>}/><Route path="/my-books" element={<Guard><MyBooks/></Guard>}/><Route path="/admin" element={<Guard admin><Admin/></Guard>}/><Route path="/assistant" element={<Assistant/>}/><Route path="*" element={<Navigate to="/" replace/>}/></Routes></Shell>}
