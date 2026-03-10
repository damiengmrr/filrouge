const express = require('express');
const { requireAuth } = require('../middlewares/auth.middleware');
const favoriteService = require('../services/favorite.service');

const router = express.Router();

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const favorites = await favoriteService.listFavorites(req.user.id);
    res.json({ data: favorites });
  } catch (err) {
    next(err);
  }
});

router.post('/:propertyId', requireAuth, async (req, res, next) => {
  try {
    const favorite = await favoriteService.addFavorite(req.user.id, req.params.propertyId);
    res.status(201).json({ favorite });
  } catch (err) {
    next(err);
  }
});

router.delete('/:propertyId', requireAuth, async (req, res, next) => {
  try {
    await favoriteService.removeFavorite(req.user.id, req.params.propertyId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

module.exports = router;

