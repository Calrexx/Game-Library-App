const express = require('express');
const router = express.Router();
const gamelibrary = require('../data/gamelibrary');
const libDogrula = require('../middleware/dogrula');

router.get('/', (req, res) => {
  const {
    sayfa = 1,
    limit = 5,
    kategori,
    ara,
    siralama = 'tarih'
  } = req.query;

  const sayfaNo = Math.max(1, Number(sayfa) || 1);
  const limitNo = Math.min(20, Math.max(1, Number(limit) || 5));
  const games = gamelibrary.getGames();
  let sonuc = kategori
    ? games.filter((game) => game.kategori === kategori)
    : [...games];

  if (ara) {
    const kucuk = ara.toLowerCase();
    sonuc = sonuc.filter((game) =>
      game.baslik.toLowerCase().includes(kucuk) ||
      game.kategori.toLowerCase().includes(kucuk)
    );
  }

  if (siralama === 'baslik') {
    sonuc.sort((a, b) => a.baslik.localeCompare(b.baslik, 'tr'));
  } else {
    sonuc.sort((a, b) => new Date(b.yayinTarihi) - new Date(a.yayinTarihi));
  }

  const toplam = sonuc.length;
  const toplamSayfa = Math.max(1, Math.ceil(toplam / limitNo));
  const baslangic = (sayfaNo - 1) * limitNo;

  res.json({
    basarili: true,
    sayfa: sayfaNo,
    limit: limitNo,
    toplam,
    toplamSayfa,
    oncekiSayfa: sayfaNo > 1 ? sayfaNo - 1 : null,
    sonrakiSayfa: sayfaNo < toplamSayfa ? sayfaNo + 1 : null,
    data: sonuc.slice(baslangic, baslangic + limitNo)
  });
});

router.post('/', libDogrula, (req, res) => {
  const {
    baslik,
    kategori = 'genel',
    tamamlandi = false,
    puan = null,
    notlar = ''
  } = req.body;

  if (puan !== null && !tamamlandi) {
    return res.status(400).json({
      basarili: false,
      hatalar: ['Yalnızca tamamlanmış oyunlara puan verilebilir.']
    });
  }

  const games = gamelibrary.getGames();
  const now = new Date().toISOString();
  const newGame = {
    id: Math.max(0, ...games.map((game) => Number(game.id) || 0)) + 1,
    baslik: baslik.trim(),
    kategori: kategori.trim(),
    tamamlandi,
    puan,
    notlar,
    yayinTarihi: now,
    guncellendi: now
  };

  gamelibrary.saveGames([...games, newGame]);

  res.status(201).json({
    basarili: true,
    mesaj: 'Oyun kütüphaneye eklendi',
    data: newGame
  });
});

router.put('/:id', libDogrula, (req, res) => {
  const id = Number(req.params.id);
  const games = gamelibrary.getGames();
  const index = games.findIndex((game) => game.id === id);

  if (index === -1) {
    return res.status(404).json({ hata: 'Oyun bulunamadi' });
  }

  const currentGame = games[index];
  const tamamlandi = req.body.tamamlandi ?? currentGame.tamamlandi;
  if (req.body.tamamlandi === false && req.body.puan != null) {
    return res.status(400).json({
      basarili: false,
      hatalar: ['Tamamlanmamış oyunlara puan verilemez.']
    });
  }

  const puan = req.body.tamamlandi === false
    ? null
    : req.body.puan ?? currentGame.puan;
  if (puan !== null && !tamamlandi) {
    return res.status(400).json({
      basarili: false,
      hatalar: ['Yalnızca tamamlanmış oyunlara puan verilebilir.']
    });
  }

  const updatedGame = {
    ...currentGame,
    ...req.body,
    tamamlandi,
    puan,
    id: currentGame.id,
    guncellendi: new Date().toISOString()
  };
  games[index] = updatedGame;
  gamelibrary.saveGames(games);

  res.json({ basarili: true, data: updatedGame });
});

router.delete('/:id', (req, res) => {
  const id = Number(req.params.id);
  const games = gamelibrary.getGames();
  const game = games.find((item) => item.id === id);

  if (!game) {
    return res.status(404).json({ hata: 'Oyun bulunamadi' });
  }

  gamelibrary.saveGames(games.filter((item) => item.id !== id));
  res.json({ basarili: true, mesaj: 'Oyun silindi', silinen: game });
});

module.exports = router;
