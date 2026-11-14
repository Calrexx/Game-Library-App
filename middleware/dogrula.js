const libDogrula = (req, res, next) => {
  const body = req.body;
  const hatalar = [];
  const alanlar = ['baslik', 'kategori', 'tamamlandi', 'puan', 'notlar'];

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return res.status(400).json({ basarili: false, hatalar: ['Geçersiz istek gövdesi.'] });
  }

  if (Object.keys(body).some((alan) => !alanlar.includes(alan))) {
    hatalar.push('Desteklenmeyen alan gönderildi.');
  }

  if (req.method === 'POST' && (!body.baslik || typeof body.baslik !== 'string' || !body.baslik.trim())) {
    hatalar.push('İsim boş olamaz.');
  }

  if (body.baslik !== undefined && (typeof body.baslik !== 'string' || !body.baslik.trim())) {
    hatalar.push('İsim boş olamaz.');
  }

  if (body.baslik && body.baslik.length > 75) {
    hatalar.push('başlık belli bir karakter limitinden daha uzun.');
  }

  if (body.kategori !== undefined && (typeof body.kategori !== 'string' || !body.kategori.trim())) {
    hatalar.push('kategori boş olamaz.');
  }

  if (body.tamamlandi !== undefined && typeof body.tamamlandi !== 'boolean') {
    hatalar.push('Tamamlandı alanı doğru veya yanlış olmalıdır.');
  }

  if (body.puan !== undefined && body.puan !== null &&
      (!Number.isInteger(body.puan) || body.puan < 1 || body.puan > 10)) {
    hatalar.push('Puan 1 ile 10 arasında bir tam sayı olmalıdır.');
  }

  if (body.notlar !== undefined && typeof body.notlar !== 'string') {
    hatalar.push('Notlar metin olmalıdır.');
  }

  if (req.method === 'PUT' && Object.keys(body).length === 0) {
    hatalar.push('Güncellenecek en az bir alan gönderilmelidir.');
  }

  if (hatalar.length) {
    return res.status(400).json({ basarili: false, hatalar });
  }

  next();
};

module.exports = libDogrula;