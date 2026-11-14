const assert = require('node:assert/strict');
const express = require('express');
const { after, before, test } = require('node:test');
const libraryRouter = require('../routes/gamelibrary');

const app = express();
app.use(express.json());
app.use('/gamelibrary', libraryRouter);

let server;
let baseUrl;

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}/gamelibrary`;
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
});

test('game CRUD supports finished status, scores, and notes', async () => {
  const createdResponse = await fetch(baseUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ baslik: 'Progress test game', kategori: 'RPG' })
  });
  assert.equal(createdResponse.status, 201);
  const created = (await createdResponse.json()).data;

  const prematureScoreResponse = await fetch(`${baseUrl}/${created.id}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ puan: 8 })
  });
  assert.equal(prematureScoreResponse.status, 400);

  const finishedResponse = await fetch(`${baseUrl}/${created.id}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ tamamlandi: true })
  });
  assert.equal((await finishedResponse.json()).data.tamamlandi, true);

  const scoreResponse = await fetch(`${baseUrl}/${created.id}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ puan: 8 })
  });
  assert.equal((await scoreResponse.json()).data.puan, 8);

  const notesResponse = await fetch(`${baseUrl}/${created.id}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ notlar: 'Try a different build next time.' })
  });
  assert.equal((await notesResponse.json()).data.notlar, 'Try a different build next time.');

  const unfinishedResponse = await fetch(`${baseUrl}/${created.id}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ tamamlandi: false })
  });
  const unfinished = (await unfinishedResponse.json()).data;
  assert.equal(unfinished.tamamlandi, false);
  assert.equal(unfinished.puan, null);

  const deletedResponse = await fetch(`${baseUrl}/${created.id}`, { method: 'DELETE' });
  assert.equal(deletedResponse.status, 200);

  const dataModulePath = require.resolve('../data/gamelibrary');
  delete require.cache[dataModulePath];
  const reloadedLibrary = require(dataModulePath);
  assert.equal(reloadedLibrary.getGames().some((game) => game.id === created.id), false);
});
