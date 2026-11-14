const fs = require('node:fs');
const path = require('node:path');

const storagePath = path.join(__dirname, 'gamelibrary.json');


function writeGames(games) {
  const temporaryPath = `${storagePath}.tmp`;
  fs.writeFileSync(temporaryPath, `${JSON.stringify(games, null, 2)}\n`, 'utf8');
  fs.renameSync(temporaryPath, storagePath);
}

function readGames() {
  if (!fs.existsSync(storagePath)) {
    const emptyGames = [];
    writeGames(emptyGames);
    return emptyGames;
  }

  const games = JSON.parse(fs.readFileSync(storagePath, 'utf8'));
  if (!Array.isArray(games)) {
    throw new TypeError('Game library data must be an array.');
  }
  return games;
}

let games = readGames();

module.exports = {
  getGames() {
    return games;
  },
  saveGames(nextGames) {
    writeGames(nextGames);
    games = nextGames;
    return games;
  }
};
