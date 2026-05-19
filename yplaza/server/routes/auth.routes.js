const express = require('express');
const jwt = require('jsonwebtoken');
const config = require('../config');
const { validateRegister, validateLogin } = require('../middlewares/validate.middleware');
const { requireAuth, requireRole } = require('../middlewares/auth.middleware');
const authService = require('../services/auth.service');

const router = express.Router();

router.post('/register', validateRegister, async (req, res, next) => {
  try {
    const user = await authService.registerClient(req.body);
    const token = authService.generateUserToken(user);
    res
      .cookie(config.cookie.name, token, config.cookie.options)
      .status(201)
      .json({ user });
  } catch (err) {
    next(err);
  }
});

router.post('/login', validateLogin, async (req, res, next) => {
  try {
    const user = await authService.login(req.body);
    const token = authService.generateUserToken(user);
    res
      .cookie(config.cookie.name, token, config.cookie.options)
      .status(200)
      .json({ user });
  } catch (err) {
    next(err);
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie(config.cookie.name, {
    ...config.cookie.options,
    maxAge: 0,
  });
  res.status(200).json({ message: 'Déconnecté.' });
});

// Récupérer le profil courant à partir du cookie JWT
router.get('/me', (req, res) => {
  const token = req.cookies[config.cookie.name];
  if (!token) {
    return res.status(200).json({ user: null });
  }
  try {
    const payload = jwt.verify(token, config.jwt.secret);
    return res.status(200).json({
      user: {
        id: payload.id,
        name: payload.name,
        email: payload.email,
        role: payload.role,
        agency_id: payload.agency_id || null,
      },
    });
  } catch (e) {
    return res.status(200).json({ user: null });
  }
});

// Endpoints admin pour gestion des users (liste + changement de rôle)
router.get('/users', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const users = await authService.listUsers();
    res.json({ data: users });
  } catch (err) {
    next(err);
  }
});

router.post('/users', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const user = await authService.createUser(req.body);
    res.status(201).json({ user });
  } catch (err) {
    next(err);
  }
});

router.put('/users/:id', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const user = await authService.updateUser(req.params.id, req.body);
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

router.patch(
  '/users/:id/role',
  requireAuth,
  requireRole('admin'),
  async (req, res, next) => {
    try {
      const { role } = req.body;
      const updated = await authService.changeUserRole(req.params.id, role);
      res.json({ user: updated });
    } catch (err) {
      next(err);
    }
  }
);

router.delete('/users/:id', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const user = await authService.disableUser(req.params.id);
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
