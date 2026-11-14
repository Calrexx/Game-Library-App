import { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownUp,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Gamepad2,
  LibraryBig,
  LockKeyhole,
  LogOut,
  Mail,
  Plus,
  Search,
  Sparkles,
  Star,
  StickyNote,
  Trash2,
  UserRound,
  X
} from 'lucide-react';

const ACCOUNT_KEY = 'checkpoint.accounts';
const SESSION_KEY = 'checkpoint.session';
const ADMIN_ACCOUNT = {
  name: 'Alex Morgan',
  email: 'admin123@testmail.com',
  password: 'admin123'
};

const gameColors = [
  'from-orange-950 via-red-950 to-stone-950',
  'from-amber-950 via-stone-900 to-zinc-950',
  'from-sky-950 via-indigo-950 to-slate-950',
  'from-emerald-950 via-teal-950 to-stone-950',
  'from-violet-950 via-purple-950 to-zinc-950'
];

function mapGame(game) {
  const colorIndex = Math.abs(Number(game.id) || 0) % gameColors.length;
  return {
    id: game.id,
    title: game.baslik,
    category: game.kategori,
    color: gameColors[colorIndex],
    finished: game.tamamlandi ?? false,
    rating: game.puan ?? null,
    notes: game.notlar ?? '',
    added: game.yayinTarihi || new Date().toISOString()
  };
}

async function requestApi(path, options) {
  let response;
  try {
    response = await fetch(path, options);
  } catch (error) {
    throw new Error('Could not connect to the game server. Make sure the Express backend is running.');
  }

  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error('The game server returned an invalid response.');
  }

  if (!response.ok) {
    throw new Error(result.hatalar?.join(' ') || result.hata || 'The game request failed.');
  }
  return result;
}

async function fetchGames() {
  const games = [];
  let page = 1;
  let totalPages = 1;
  do {
    const result = await requestApi(`/gamelibrary?limit=20&sayfa=${page}`);
    games.push(...result.data.map(mapGame));
    totalPages = result.toplamSayfa;
    page += 1;
  } while (page <= totalPages);
  return games;
}

function readAccounts() {
  const saved = localStorage.getItem(ACCOUNT_KEY);
  if (!saved) {
    const accounts = [ADMIN_ACCOUNT];
    localStorage.setItem(ACCOUNT_KEY, JSON.stringify(accounts));
    return accounts;
  }
  return JSON.parse(saved);
}

function App() {
  const [accounts, setAccounts] = useState(readAccounts);
  const [user, setUser] = useState(() => {
    const session = localStorage.getItem(SESSION_KEY);
    if (!session) return null;
    try {
      return JSON.parse(session);
    } catch {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
  });
  const [games, setGames] = useState([]);
  const [gamesLoading, setGamesLoading] = useState(false);
  const [page, setPage] = useState('library');
  const [authMode, setAuthMode] = useState('login');
  const [selectedGame, setSelectedGame] = useState(null);
  const [showAddGame, setShowAddGame] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All games');
  const [sortNewest, setSortNewest] = useState(true);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    localStorage.setItem(ACCOUNT_KEY, JSON.stringify(accounts));
  }, [accounts]);

  useEffect(() => {
    if (!user?.email) return undefined;
    let active = true;
    setGamesLoading(true);
    fetchGames()
      .then((results) => {
        if (active) setGames(results);
      })
      .catch((error) => {
        if (active) setNotice(error.message);
      })
      .finally(() => {
        if (active) setGamesLoading(false);
      });
    return () => { active = false; };
  }, [user?.email]);

  useEffect(() => {
    if (!notice) return undefined;
    const timeout = window.setTimeout(() => setNotice(''), 3600);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  const filteredGames = useMemo(() => {
    const query = search.trim().toLowerCase();
    return games
      .filter((game) => {
        const matchesQuery = !query ||
          game.title.toLowerCase().includes(query) ||
          game.category.toLowerCase().includes(query);
        const matchesFilter = filter === 'All games' ||
          (filter === 'Playing' && !game.finished) ||
          (filter === 'Finished' && game.finished);
        return matchesQuery && matchesFilter;
      })
      .sort((a, b) => sortNewest
        ? new Date(b.added) - new Date(a.added)
        : a.title.localeCompare(b.title));
  }, [filter, games, search, sortNewest]);

  const finishedCount = games.filter((game) => game.finished).length;
  const averageRating = games.filter((game) => game.finished && game.rating)
    .map((game) => game.rating);
  const average = averageRating.length
    ? (averageRating.reduce((sum, score) => sum + score, 0) / averageRating.length).toFixed(1)
    : '—';

  function signIn(email, password) {
    const normalizedEmail = email.trim().toLowerCase();
    const account = accounts.find((item) =>
      item.email.toLowerCase() === normalizedEmail && item.password === password);
    if (!account) {
      setNotice('That email and password combination does not match.');
      return false;
    }
    const sessionUser = { name: account.name, email: account.email };
    setUser(sessionUser);
    setGames([]);
    localStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser));
    setNotice(`Welcome back, ${account.name.split(' ')[0]}.`);
    return true;
  }

  function register(name, email, password) {
    const normalizedEmail = email.trim().toLowerCase();
    if (accounts.some((account) => account.email.toLowerCase() === normalizedEmail)) {
      setNotice('An account with that email already exists.');
      return false;
    }
    const account = { name: name.trim(), email: normalizedEmail, password };
    const nextAccounts = [...accounts, account];
    setAccounts(nextAccounts);
    const sessionUser = { name: account.name, email: account.email };
    setUser(sessionUser);
    setGames([]);
    localStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser));
    setNotice('Your account is ready. Welcome to Checkpoint.');
    return true;
  }

  function signOut() {
    localStorage.removeItem(SESSION_KEY);
    setUser(null);
    setGames([]);
    setPage('library');
    setSelectedGame(null);
    setNotice('You have been signed out.');
  }

  async function addGame(title, category) {
    try {
      const result = await requestApi('/gamelibrary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baslik: title.trim(), kategori: category })
      });
      const game = mapGame(result.data);
      setGames((items) => [game, ...items]);
      setShowAddGame(false);
      setSelectedGame(game);
      setNotice(`${game.title} added to your library.`);
    } catch (error) {
      setNotice(error.message);
    }
  }

  async function updateGame(id, changes) {
    const fields = {
      finished: 'tamamlandi',
      rating: 'puan',
      notes: 'notlar'
    };
    const body = Object.fromEntries(
      Object.entries(changes).map(([field, value]) => [fields[field], value])
    );
    try {
      const result = await requestApi(`/gamelibrary/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const updatedGame = mapGame(result.data);
      setGames((items) => items.map((game) => game.id === id ? updatedGame : game));
      setSelectedGame((game) => game && game.id === id ? updatedGame : game);
    } catch (error) {
      setNotice(error.message);
    }
  }

  async function deleteGame(id) {
    const game = games.find((item) => item.id === id);
    try {
      await requestApi(`/gamelibrary/${id}`, { method: 'DELETE' });
      setGames((items) => items.filter((item) => item.id !== id));
      setSelectedGame(null);
      setNotice(`${game?.title || 'Game'} removed from your library.`);
    } catch (error) {
      setNotice(error.message);
    }
  }

  if (!user) {
    return (
      <>
        <AuthScreen
          mode={authMode}
          setMode={setAuthMode}
          onLogin={signIn}
          onRegister={register}
        />
        <Toast message={notice} />
      </>
    );
  }

  return (
    <div className="app-shell min-h-screen text-stone-100">
      <aside className="sidebar">
        <a className="brand" href="#" onClick={(event) => event.preventDefault()}>
          <span className="brand-mark"><Gamepad2 size={20} strokeWidth={2.2} /></span>
          <span>checkpoint<span className="brand-period">.</span></span>
        </a>

        <div className="sidebar-label">MENU</div>
        <nav className="side-nav" aria-label="Main navigation">
          <button
            className={`side-link ${page === 'library' ? 'active' : ''}`}
            onClick={() => setPage('library')}
          >
            <LibraryBig size={18} />
            <span>My library</span>
            <span className="nav-count">{games.length}</span>
          </button>
          <button
            className={`side-link ${page === 'profile' ? 'active' : ''}`}
            onClick={() => setPage('profile')}
          >
            <UserRound size={18} />
            <span>Profile</span>
          </button>
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-tip">
            <Sparkles size={16} />
            <p>Your next favorite<br />is one game away.</p>
            <span>Keep your adventures close.</span>
          </div>
          <button className="account-mini" onClick={() => setPage('profile')}>
            <Avatar name={user.name} />
            <span className="account-text"><strong>{user.name}</strong><small>Player account</small></span>
            <ChevronRight size={16} className="text-stone-500" />
          </button>
        </div>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <div className="breadcrumb"><span>Workspace</span><span className="crumb-slash">/</span><strong>{page === 'library' ? 'My library' : 'Profile'}</strong></div>
          <div className="topbar-right">
            <span className="date-label">{new Intl.DateTimeFormat('en', { weekday: 'short', month: 'short', day: 'numeric' }).format(new Date())}</span>
            <button className="avatar-button" onClick={() => setPage('profile')} aria-label="Open profile">
              <Avatar name={user.name} />
            </button>
          </div>
        </header>

        {page === 'library' ? (
          <section className="content-wrap">
            <div className="welcome-row">
              <div>
                <div className="eyebrow"><span className="eyebrow-line" /> YOUR PERSONAL GAME SPACE</div>
                <h1>Every game has<br className="mobile-break" /> a <span>story.</span></h1>
                <p className="page-intro">Keep track of what you play, what you love, and where to pick up next.</p>
              </div>
              <button className="primary-button add-top-button" onClick={() => setShowAddGame(true)}>
                <Plus size={18} /> Add a game
              </button>
            </div>

            <div className="stats-row">
              <StatCard icon={<LibraryBig size={17} />} label="IN YOUR LIBRARY" value={games.length} accent="violet" />
              <StatCard icon={<CheckCircle2 size={17} />} label="FINISHED" value={finishedCount} accent="green" />
              <StatCard icon={<Star size={17} />} label="YOUR AVG. SCORE" value={average} accent="amber" />
              <div className="stat-note"><span className="note-dot" /> Your library, your journey.</div>
            </div>

            <div className="library-heading">
              <div>
                <div className="section-title-row"><h2>Game library</h2><span className="count-pill">{games.length}</span></div>
                <p className="section-subtitle">A little progress adds up to a lot of adventure.</p>
              </div>
              <button className="text-button" onClick={() => setSortNewest((value) => !value)}>
                <ArrowDownUp size={15} /> {sortNewest ? 'Recently added' : 'A to Z'}
              </button>
            </div>

            <div className="library-controls">
              <div className="filter-tabs" role="tablist" aria-label="Filter games">
                {['All games', 'Playing', 'Finished'].map((tab) => (
                  <button
                    key={tab}
                    className={`filter-tab ${filter === tab ? 'selected' : ''}`}
                    onClick={() => setFilter(tab)}
                    role="tab"
                    aria-selected={filter === tab}
                  >
                    {tab}
                    {tab === 'Finished' && finishedCount > 0 && <span>{finishedCount}</span>}
                  </button>
                ))}
              </div>
              <label className="search-field">
                <Search size={16} />
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find a game..." />
                <kbd>/</kbd>
              </label>
            </div>

            {gamesLoading ? (
              <div className="empty-state"><span className="empty-icon"><Gamepad2 size={23} /></span><h3>Loading your library</h3><p>Getting your games from the server...</p></div>
            ) : filteredGames.length ? (
              <div className="game-grid">
                {filteredGames.map((game, index) => (
                  <GameCard key={game.id} game={game} index={index} onClick={() => setSelectedGame(game)} />
                ))}
                <button className="add-game-card" onClick={() => setShowAddGame(true)}>
                  <span className="add-game-icon"><Plus size={19} /></span>
                  <strong>Add a new game</strong>
                  <span>Make room for another adventure</span>
                </button>
              </div>
            ) : (
              <div className="empty-state">
                <span className="empty-icon"><Gamepad2 size={23} /></span>
                <h3>{search ? 'No games found' : `No ${filter.toLowerCase()} yet`}</h3>
                <p>{search ? 'Try another title or category.' : 'Add a game and keep your next adventure in one place.'}</p>
                {!search && <button className="primary-button" onClick={() => setShowAddGame(true)}><Plus size={17} /> Add a game</button>}
              </div>
            )}
            <footer className="page-footer"><span>CHECKPOINT</span><span>Made for your next great adventure <span className="footer-spark">✳</span></span></footer>
          </section>
        ) : (
          <ProfilePage
            user={user}
            games={games}
            onSignOut={signOut}
            onUpdateName={(name) => {
              const nextUser = { ...user, name };
              setUser(nextUser);
              localStorage.setItem(SESSION_KEY, JSON.stringify(nextUser));
              const nextAccounts = accounts.map((account) =>
                account.email === user.email ? { ...account, name } : account);
              setAccounts(nextAccounts);
              setNotice('Profile updated.');
            }}
          />
        )}
      </main>

      {selectedGame && (
        <GameDetails
          game={games.find((item) => item.id === selectedGame.id) || selectedGame}
          onClose={() => setSelectedGame(null)}
          onUpdate={updateGame}
          onDelete={deleteGame}
        />
      )}
      {showAddGame && <AddGameModal onClose={() => setShowAddGame(false)} onAdd={addGame} />}
      <Toast message={notice} />
    </div>
  );
}

function AuthScreen({ mode, setMode, onLogin, onRegister }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const isRegister = mode === 'register';

  function submit(event) {
    event.preventDefault();
    setError('');
    if (isRegister && name.trim().length < 2) {
      setError('Please enter your name.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setError('Your password must be at least 6 characters.');
      return;
    }
    const success = isRegister
      ? onRegister(name, email, password)
      : onLogin(email, password);
    if (!success) setError(isRegister ? 'An account with that email already exists.' : 'That email and password combination does not match.');
  }

  return (
    <main className="auth-page min-h-screen">
      <div className="auth-grain" />
      <div className="auth-shell">
        <div className="auth-brand"><span className="brand-mark"><Gamepad2 size={20} /></span>checkpoint<span className="brand-period">.</span></div>
        <div className="auth-content">
          <div className="auth-art">
            <div className="art-glow" />
            <div className="art-caption"><span className="art-overline">YOUR GAMES. YOUR STORY.</span><h2>Make every<br />playthrough <em>count.</em></h2><p>A home for every world you explore and every moment you want to remember.</p></div>
            <div className="art-card art-card-back"><span>✦</span><small>NEW QUEST</small></div>
            <div className="art-card art-card-front"><Gamepad2 size={35} /><span>PLAYER ONE</span><strong>Adventure<br />awaits.</strong></div>
            <div className="art-coordinate">40°42'51.1"N&nbsp; 74°00'21.4"W</div>
          </div>
          <div className="auth-form-wrap">
            <div className="auth-form-inner">
              <div className="auth-mobile-brand"><span className="brand-mark"><Gamepad2 size={20} /></span>checkpoint<span className="brand-period">.</span></div>
              <div className="form-eyebrow">{isRegister ? 'START YOUR JOURNEY' : 'WELCOME BACK'}</div>
              <h1>{isRegister ? 'Create your account' : 'Good to see you.'}</h1>
              <p className="auth-subtitle">{isRegister ? 'Your library is waiting. Let’s get you set up.' : 'Pick up right where your next adventure begins.'}</p>
              <div className="auth-switch"><span>{isRegister ? 'Already have an account?' : 'New to Checkpoint?'}</span><button onClick={() => { setMode(isRegister ? 'login' : 'register'); setError(''); }}> {isRegister ? 'Sign in' : 'Create account'}</button></div>
              <form className="auth-form" onSubmit={submit}>
                {isRegister && <FormField icon={<UserRound size={16} />} label="YOUR NAME" value={name} onChange={setName} placeholder="How should we call you?" autoComplete="name" />}
                <FormField icon={<Mail size={16} />} label="EMAIL ADDRESS" value={email} onChange={setEmail} placeholder="you@example.com" type="email" autoComplete="email" />
                <FormField icon={<LockKeyhole size={16} />} label="PASSWORD" value={password} onChange={setPassword} placeholder="At least 6 characters" type="password" autoComplete={isRegister ? 'new-password' : 'current-password'} />
                {error && <div className="form-error">{error}</div>}
                <button type="submit" className="auth-submit">{isRegister ? 'Create account' : 'Sign in'} <ChevronRight size={17} /></button>
              </form>
              <div className="auth-legal">By continuing, you agree to keep your adventures yours. <span>·</span> <b>Local demo</b></div>
            </div>
          </div>
        </div>
        <div className="auth-footer"><span>© 2025 CHECKPOINT</span><span>YOUR PERSONAL GAME SPACE</span></div>
      </div>
    </main>
  );
}

function FormField({ icon, label, value, onChange, placeholder, type = 'text', autoComplete }) {
  return (
    <label className="form-field">
      <span className="form-label">{label}</span>
      <span className="form-input-wrap">{icon}<input value={value} onChange={(event) => onChange(event.target.value)} type={type} placeholder={placeholder} autoComplete={autoComplete} required /></span>
    </label>
  );
}

function Avatar({ name }) {
  const initials = name.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase();
  return <span className="avatar">{initials}</span>;
}

function StatCard({ icon, label, value, accent }) {
  return <div className={`stat-card stat-${accent}`}><span className="stat-icon">{icon}</span><div><span className="stat-label">{label}</span><strong>{value}</strong></div></div>;
}

function GameCard({ game, index, onClick }) {
  return (
    <button className="game-card" onClick={onClick} style={{ '--card-delay': `${index * 55}ms` }}>
      <div className={`game-cover bg-gradient-to-br ${game.color}`}>
        <span className="game-category">{game.category}</span>
        <span className={`game-status ${game.finished ? 'status-finished' : 'status-playing'}`}>
          {game.finished ? <><Check size={11} /> FINISHED</> : <><span className="playing-dot" /> PLAYING</>}
        </span>
        <div className="cover-title"><strong>{game.title}</strong><span>View game details <ChevronRight size={14} /></span></div>
        {game.finished && game.rating && <span className="cover-rating"><Star size={12} fill="currentColor" /> {game.rating}</span>}
      </div>
      <div className="game-card-meta"><span><Clock3 size={13} /> Added {formatDate(game.added)}</span><ChevronRight size={15} /></div>
    </button>
  );
}

function GameDetails({ game, onClose, onUpdate, onDelete }) {
  const [notes, setNotes] = useState(game.notes || '');
  const [confirmDelete, setConfirmDelete] = useState(false);
  useEffect(() => setNotes(game.notes || ''), [game.id, game.notes]);

  function saveNotes() {
    onUpdate(game.id, { notes });
  }

  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="detail-modal" role="dialog" aria-modal="true" aria-labelledby="detail-title">
        <button className="modal-close" onClick={onClose} aria-label="Close details"><X size={19} /></button>
        <div className={`detail-hero bg-gradient-to-br ${game.color}`}>
          <span className="detail-category">{game.category}</span>
          <h2 id="detail-title">{game.title}</h2>
          <p>Added to your library {formatDate(game.added)}</p>
        </div>
        <div className="detail-body">
          <div className="detail-status-row">
            <div><span className="detail-label">YOUR PROGRESS</span><span className={`detail-progress ${game.finished ? 'done' : ''}`}>{game.finished ? <><CheckCircle2 size={16} /> Finished</> : <><span className="playing-dot" /> In progress</>}</span></div>
            <button
              className={`finish-toggle ${game.finished ? 'is-finished' : ''}`}
              onClick={() => onUpdate(game.id, { finished: !game.finished, rating: game.finished ? null : game.rating })}
            >
              {game.finished ? <><Check size={15} /> Mark as playing</> : <><CheckCircle2 size={15} /> Mark as finished</>}
            </button>
          </div>

          <div className="detail-divider" />
          <div className="detail-section">
            <div><span className="detail-label">YOUR SCORE</span><p className="detail-hint">{game.finished ? 'How much did you love this one?' : 'Finish the game to leave a score.'}</p></div>
            {game.finished ? (
              <div className="rating-control" aria-label="Score this game from 1 to 10">
                {Array.from({ length: 10 }, (_, index) => index + 1).map((score) => (
                  <button key={score} className={game.rating === score ? 'active' : ''} onClick={() => onUpdate(game.id, { rating: score })} aria-label={`Score ${score} out of 10`}>{score}</button>
                ))}
              </div>
            ) : <div className="locked-score"><Star size={15} /> — / 10</div>}
          </div>

          <div className="detail-divider" />
          <div className="notes-heading"><div><span className="detail-label"><StickyNote size={13} /> PLAYTHROUGH NOTES</span><p className="detail-hint">Keep the little things you want to remember.</p></div><span className="notes-private">ONLY YOU</span></div>
          <textarea className="notes-area" value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={1200} placeholder="A quest to finish, a build to try, a detail you don't want to forget..." />
          <div className="notes-actions"><span>{notes.length}/1200 characters</span><button className="save-notes-button" onClick={saveNotes}><Check size={14} /> Save notes</button></div>

          <div className="detail-footer">
            {confirmDelete ? <div className="delete-confirm"><span>Remove this game?</span><button onClick={() => onDelete(game.id)}>Yes, delete</button><button onClick={() => setConfirmDelete(false)}>Cancel</button></div> : <button className="delete-button" onClick={() => setConfirmDelete(true)}><Trash2 size={15} /> Remove from library</button>}
            <span>Changes are saved on this device</span>
          </div>
        </div>
      </section>
    </div>
  );
}

function AddGameModal({ onClose, onAdd }) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Action');
  const [error, setError] = useState('');
  const categories = ['Action', 'Action RPG', 'Adventure', 'Indie', 'Platformer', 'Puzzle', 'Roguelike', 'RPG', 'Simulation', 'Strategy', 'Other'];

  function submit(event) {
    event.preventDefault();
    if (!title.trim()) {
      setError('Give your game a title first.');
      return;
    }
    if (title.trim().length > 75) {
      setError('Game titles can be up to 75 characters.');
      return;
    }
    onAdd(title, category);
  }

  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="add-modal" role="dialog" aria-modal="true" aria-labelledby="add-title">
        <div className="add-modal-head"><span className="add-modal-icon"><Plus size={19} /></span><button className="modal-close" onClick={onClose} aria-label="Close"><X size={18} /></button><div className="form-eyebrow">GROW YOUR COLLECTION</div><h2 id="add-title">Add a new game</h2><p>Start a new chapter in your library.</p></div>
        <form className="add-form" onSubmit={submit}>
          <label className="form-field"><span className="form-label">GAME TITLE</span><input className="plain-input" autoFocus maxLength={75} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. The Legend of Zelda" /></label>
          <label className="form-field"><span className="form-label">CATEGORY</span><select className="plain-input" value={category} onChange={(event) => setCategory(event.target.value)}>{categories.map((item) => <option key={item}>{item}</option>)}</select></label>
          {error && <div className="form-error">{error}</div>}
          <button className="auth-submit" type="submit">Add to my library <ChevronRight size={17} /></button>
          <button className="cancel-add" type="button" onClick={onClose}>Maybe later</button>
        </form>
      </section>
    </div>
  );
}

function ProfilePage({ user, games, onSignOut, onUpdateName }) {
  const [name, setName] = useState(user.name);
  const completed = games.filter((game) => game.finished).length;
  const totalNotes = games.filter((game) => game.notes?.trim()).length;

  return (
    <section className="content-wrap profile-wrap">
      <div className="eyebrow"><span className="eyebrow-line" /> PLAYER CARD</div>
      <h1>Your <span>profile.</span></h1>
      <p className="page-intro">A little about the player behind the save file.</p>
      <div className="profile-layout">
        <div className="profile-card">
          <div className="profile-cover"><div className="profile-orbit orbit-one" /><div className="profile-orbit orbit-two" /><Gamepad2 size={41} /></div>
          <div className="profile-card-body"><Avatar name={user.name} /><div className="profile-name"><h2>{user.name}</h2><span><span className="online-dot" /> PLAYER SINCE TODAY</span></div><div className="profile-bio">Collector of worlds, stories, and side quests.</div><div className="profile-card-stats"><div><strong>{games.length}</strong><span>GAMES</span></div><div><strong>{completed}</strong><span>FINISHED</span></div><div><strong>{totalNotes}</strong><span>NOTES</span></div></div></div>
        </div>
        <div className="profile-settings">
          <div className="settings-title"><div><span className="form-eyebrow">ACCOUNT DETAILS</span><h2>Player settings</h2></div><span className="settings-lock"><LockKeyhole size={14} /> PRIVATE</span></div>
          <label className="form-field"><span className="form-label">DISPLAY NAME</span><input className="plain-input" value={name} onChange={(event) => setName(event.target.value)} maxLength={40} /></label>
          <label className="form-field"><span className="form-label">EMAIL ADDRESS</span><div className="readonly-input"><Mail size={15} />{user.email}<span>VERIFIED</span></div></label>
          <button className="primary-button save-profile" onClick={() => name.trim() && onUpdateName(name.trim())}>Save changes <Check size={15} /></button>
          <div className="settings-divider" />
          <div className="signout-row"><div><strong>Ready to log off?</strong><span>Your library will be right here when you return.</span></div><button onClick={onSignOut}><LogOut size={15} /> Sign out</button></div>
        </div>
      </div>
      <div className="local-notice"><LockKeyhole size={16} /><span><strong>Your data stays on this device.</strong> Your demo account and library are saved in this browser’s local storage.</span></div>
      <footer className="page-footer"><span>CHECKPOINT</span><span>Made for your next great adventure <span className="footer-spark">✳</span></span></footer>
    </section>
  );
}

function Toast({ message }) {
  if (!message) return null;
  return <div className="toast-message"><CheckCircle2 size={17} />{message}</div>;
}

function formatDate(value) {
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
}

export default App;
