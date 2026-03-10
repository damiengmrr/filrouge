const express = require('express');
const { requireAuth, requireRole } = require('../middlewares/auth.middleware');
const {
  validatePropertyPayload,
  validatePropertySearchQuery,
} = require('../middlewares/validate.middleware');
const propertyService = require('../services/property.service');

const router = express.Router();

router.get('/', validatePropertySearchQuery, async (req, res, next) => {
  try {
    const {
      city,
      minPrice,
      maxPrice,
      type,
      status,
      page,
      limit,
      sort,
      createdBy,
    } = req.query;

    const result = await propertyService.listProperties(
      { city, minPrice, maxPrice, type, status, createdBy },
      { page, limit },
      { sort }
    );

    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const property = await propertyService.getPropertyById(req.params.id);
    if (!property) {
      return res.status(404).json({ error: { message: 'Bien introuvable.' } });
    }
    return res.json({ property });
  } catch (err) {
    next(err);
  }
});

router.post(
  '/',
  requireAuth,
  requireRole('agent', 'admin'),
  validatePropertyPayload,
  async (req, res, next) => {
    try {
      const property = await propertyService.createProperty(req.body, req.user);
      res.status(201).json({ property });
    } catch (err) {
      next(err);
    }
  }
);

router.put(
  '/:id',
  requireAuth,
  requireRole('agent', 'admin'),
  validatePropertyPayload,
  async (req, res, next) => {
    try {
      const property = await propertyService.updateProperty(
        req.params.id,
        req.body,
        req.user
      );
      res.json({ property });
    } catch (err) {
      next(err);
    }
  }
);

router.delete('/:id', requireAuth, requireRole('agent', 'admin'), async (req, res, next) => {
  try {
    await propertyService.deleteProperty(req.params.id, req.user);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

router.patch(
  '/:id/status',
  requireAuth,
  requireRole('agent', 'admin'),
  async (req, res, next) => {
    try {
      const { status } = req.body;
      const property = await propertyService.updatePropertyStatus(
        req.params.id,
        status,
        req.user
      );
      res.json({ property });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;

