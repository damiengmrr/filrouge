const express = require('express');
const { requireAuth, requireRole } = require('../middlewares/auth.middleware');
const { validateAgencyPayload } = require('../middlewares/validate.middleware');
const agencyService = require('../services/agency.service');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const agencies = await agencyService.getAllAgencies();
    res.json({ data: agencies });
  } catch (err) {
    next(err);
  }
});

router.post(
  '/',
  requireAuth,
  requireRole('admin'),
  validateAgencyPayload,
  async (req, res, next) => {
    try {
      const agency = await agencyService.createAgency(req.body);
      res.status(201).json({ agency });
    } catch (err) {
      next(err);
    }
  }
);

router.put(
  '/:id',
  requireAuth,
  requireRole('admin'),
  validateAgencyPayload,
  async (req, res, next) => {
    try {
      const agency = await agencyService.updateAgency(req.params.id, req.body);
      res.json({ agency });
    } catch (err) {
      next(err);
    }
  }
);

router.delete(
  '/:id',
  requireAuth,
  requireRole('admin'),
  async (req, res, next) => {
    try {
      await agencyService.deleteAgency(req.params.id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;

