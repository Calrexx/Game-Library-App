import { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownUp,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Gamepad2,
  LibraryBig,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Star,
  StickyNote,
  Trash2,
  X
} from 'lucide-react';

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

function App() {
  const [games, setGames] = useState([]);
  const [gamesLoading, setGamesLoading] = useState(false);
  const [selectedGame, setSelectedGame] = useState(null);
  const [showAddGame, setShowAddGame] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All games');
  const [sortNewest, setSortNewest] = useState(true);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    localStorage.removeItem('checkpoint.accounts');
    localStorage.removeItem('checkpoint.session');
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
  }, []);

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
      title: 'baslik',
      category: 'kategori',
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
      return true;
    } catch (error) {
      setNotice(error.message);
      return false;
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
            className="side-link active"
          >
            <LibraryBig size={18} />
            <span>My library</span>
            <span className="nav-count">{games.length}</span>
          </button>
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-tip">
            <Sparkles size={16} />
            <p>Your next favorite<br />is one game away.</p>
            <span>Keep your adventures close.</span>
          </div>
        </div>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <div className="breadcrumb"><span>Workspace</span><span className="crumb-slash">/</span><strong>My library</strong></div>
          <div className="topbar-right">
            <span className="date-label">{new Intl.DateTimeFormat('en', { weekday: 'short', month: 'short', day: 'numeric' }).format(new Date())}</span>
          </div>
        </header>

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
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [title, setTitle] = useState(game.title);
  const [category, setCategory] = useState(game.category);
  const [editError, setEditError] = useState('');
  const [isSavingDetails, setIsSavingDetails] = useState(false);
  useEffect(() => setNotes(game.notes || ''), [game.id, game.notes]);
  useEffect(() => {
    setTitle(game.title);
    setCategory(game.category);
    setIsEditingDetails(false);
  }, [game.id, game.title, game.category]);

  function saveNotes() {
    onUpdate(game.id, { notes });
  }

  function cancelDetailsEdit() {
    setTitle(game.title);
    setCategory(game.category);
    setEditError('');
    setIsEditingDetails(false);
  }

  async function saveGameDetails(event) {
    event.preventDefault();
    const trimmedTitle = title.trim();
    const trimmedCategory = category.trim();
    if (!trimmedTitle) {
      setEditError('Give your game a title first.');
      return;
    }
    if (trimmedTitle.length > 75) {
      setEditError('Game titles can be up to 75 characters.');
      return;
    }
    if (!trimmedCategory) {
      setEditError('Give your game a category first.');
      return;
    }

    setEditError('');
    setIsSavingDetails(true);
    try {
      const saved = await onUpdate(game.id, { title: trimmedTitle, category: trimmedCategory });
      if (saved) setIsEditingDetails(false);
    } finally {
      setIsSavingDetails(false);
    }
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
          <div className="game-details-toolbar">
            <span className="detail-label">GAME DETAILS</span>
            {isEditingDetails ? (
              <button className="text-button" type="button" onClick={cancelDetailsEdit}>Cancel</button>
            ) : (
              <button className="text-button" type="button" onClick={() => setIsEditingDetails(true)}><Pencil size={13} /> Edit</button>
            )}
          </div>
          {isEditingDetails && (
            <form className="game-details-form" onSubmit={saveGameDetails}>
              <label className="form-field">
                <span className="form-label">GAME TITLE</span>
                <input
                  className="plain-input"
                  autoFocus
                  maxLength={75}
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  aria-label="Game title"
                />
              </label>
              <label className="form-field">
                <span className="form-label">CATEGORY</span>
                <input
                  className="plain-input"
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  aria-label="Game category"
                />
              </label>
              {editError && <div className="form-error game-details-error">{editError}</div>}
              <div className="game-details-form-actions">
                <button className="primary-button game-details-save" type="submit" disabled={isSavingDetails}>
                  {isSavingDetails ? 'Saving...' : 'Save changes'} <Check size={14} />
                </button>
              </div>
            </form>
          )}
          <div className="detail-divider" />
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
          <div className="notes-heading"><div><span className="detail-label"><StickyNote size={13} /> PLAYTHROUGH NOTES</span><p className="detail-hint">Keep the little things you want to remember.</p></div></div>
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
          <button className="add-submit" type="submit">Add to my library <ChevronRight size={17} /></button>
          <button className="cancel-add" type="button" onClick={onClose}>Maybe later</button>
        </form>
      </section>
    </div>
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
