const express = require('express');
const { requireAuth, requireRole } = require('../middlewares/auth.middleware');
const authService = require('../services/auth.service');

const router = express.Router();

router.use(requireAuth, requireRole('admin'));

router.get('/', async (req, res, next) => {
  try {
    const users = await authService.listUsers();
    res.json({ data: users });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const user = await authService.createUser(req.body);
    res.status(201).json({ user });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const user = await authService.updateUser(req.params.id, req.body);
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const user = await authService.disableUser(req.params.id);
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
