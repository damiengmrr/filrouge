function isNumber(value) {
  return value !== undefined && value !== null && value !== '' && !Number.isNaN(Number(value));
}

function validateRegister(req, res, next) {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: { message: 'Nom, email et mot de passe sont requis.' } });
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: { message: 'Email invalide.' } });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: { message: 'Le mot de passe doit contenir au moins 6 caractères.' } });
  }
  return next();
}

function validateLogin(req, res, next) {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: { message: 'Email et mot de passe sont requis.' } });
  }
  return next();
}

function validatePropertyPayload(req, res, next) {
  const { title, price, city, surface, rooms, type, status } = req.body;
  if (!title || !price || !city || !surface || !rooms || !type) {
    return res.status(400).json({ error: { message: 'Champs obligatoires manquants pour le bien.' } });
  }
  if (!isNumber(price) || !isNumber(surface) || !isNumber(rooms)) {
    return res.status(400).json({ error: { message: 'Prix, surface et nombre de pièces doivent être numériques.' } });
  }
  if (status && !['available', 'sold'].includes(status)) {
    return res.status(400).json({ error: { message: 'Status invalide.' } });
  }
  return next();
}

function validateAgencyPayload(req, res, next) {
  const { name, city } = req.body;
  if (!name || !city) {
    return res.status(400).json({ error: { message: 'Nom et ville de l’agence sont requis.' } });
  }
  return next();
}

function validatePropertySearchQuery(req, res, next) {
  const { minPrice, maxPrice, page, limit } = req.query;
  if (minPrice && !isNumber(minPrice)) {
    return res.status(400).json({ error: { message: 'minPrice doit être numérique.' } });
  }
  if (maxPrice && !isNumber(maxPrice)) {
    return res.status(400).json({ error: { message: 'maxPrice doit être numérique.' } });
  }
  if (page && !isNumber(page)) {
    return res.status(400).json({ error: { message: 'page doit être numérique.' } });
  }
  if (limit && !isNumber(limit)) {
    return res.status(400).json({ error: { message: 'limit doit être numérique.' } });
  }
  return next();
}

module.exports = {
  validateRegister,
  validateLogin,
  validatePropertyPayload,
  validateAgencyPayload,
  validatePropertySearchQuery,
};

