const fs = require('node:fs');
const path = require('node:path');

const storagePath = path.join(__dirname, 'gamelibrary.json');
const BLOB_KEY = 'games';

let games = null;      // in-memory copy
let store = null;      // Blobs store, only set on Netlify
let pending = Promise.resolve();

function writeFile(next) {
  const tmp = `${storagePath}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
  fs.renameSync(tmp, storagePath);
}

function readFile() {
  if (!fs.existsSync(storagePath)) { writeFile([]); return []; }
  const data = JSON.parse(fs.readFileSync(storagePath, 'utf8'));
  if (!Array.isArray(data)) throw new TypeError('Game library data must be an array.');
  return data;
}

module.exports = {
  // Called once by the Netlify server entry before it handles requests
  async connectBlobs(blobStore) {
    store = blobStore;
    games = (await store.get(BLOB_KEY, { type: 'json' })) ?? [];
  },
  getGames() {
    if (games === null) games = readFile();   // local: lazy-load the file
    return games;
  },
  saveGames(next) {
    games = next;
    if (store) {
      pending = pending.then(() => store.setJSON(BLOB_KEY, next)); // saves run one at a time, in order
    } else {
      writeFile(next);
    }
    return games;
  },
  flush() { return pending; }
};