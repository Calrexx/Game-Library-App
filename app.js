const express = require('express');
const libraryRouter = require('./routes/gamelibrary');
const logger = require('./middleware/logger');
const app = express();
const port = 3000;

app.use(express.json());
app.use(logger);
app.use('/gamelibrary', libraryRouter);

// 404
app.use((req, res) => {
  res.status(404).json({ hata: 'Bulunamadı', url: req.url });
});

// hata handler
app.use((err, req, res, next) => {
  const durum = err && err.durum ? err.durum : 500;
  const mesaj = err && err.mesaj ? err.mesaj : 'Sunucu Hatası';

  console.error(`[${durum}] ${mesaj}`);

  res.status(durum).json({
    basarili: false,
    hata: mesaj
  });
});

app.listen(port, () => {
  console.log(`basarili, http://localhost:${port}`);
});

