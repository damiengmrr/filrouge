const express = require('express');
const { optionalAuth, requireAuth, requireRole } = require('../middlewares/auth.middleware');
const {
  validatePropertyPayload,
  validatePropertySearchQuery,
} = require('../middlewares/validate.middleware');
const propertyService = require('../services/property.service');

const router = express.Router();

function collectRequestBuffer(req, maxBytes = 20 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > maxBytes) {
        const err = new Error('Les images dépassent la limite autorisée de 20 Mo.');
        err.statusCode = 413;
        reject(err);
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

async function parseMultipartImages(req) {
  const contentType = req.headers['content-type'] || '';
  const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  if (!boundaryMatch) {
    const err = new Error('Requête upload invalide.');
    err.statusCode = 400;
    throw err;
  }

  const boundary = boundaryMatch[1] || boundaryMatch[2];
  const buffer = await collectRequestBuffer(req);
  const body = buffer.toString('latin1');
  const parts = body.split(`--${boundary}`);
  const files = [];

  parts.forEach((part) => {
    const separatorIndex = part.indexOf('\r\n\r\n');
    if (separatorIndex === -1) return;

    const rawHeaders = part.slice(0, separatorIndex).trim();
    let rawContent = part.slice(separatorIndex + 4);
    if (rawContent.endsWith('\r\n')) rawContent = rawContent.slice(0, -2);
    if (!rawHeaders || rawHeaders === '--') return;

    const disposition = rawHeaders.match(/content-disposition:[^\r\n]+/i)?.[0] || '';
    const filename = disposition.match(/filename="([^"]*)"/i)?.[1];
    if (!filename) return;

    const mimeType =
      rawHeaders.match(/content-type:\s*([^\r\n]+)/i)?.[1]?.trim().toLowerCase() ||
      'application/octet-stream';

    files.push({
      originalName: filename,
      mimeType,
      buffer: Buffer.from(rawContent, 'latin1'),
    });
  });

  return files;
}

router.get('/', optionalAuth, validatePropertySearchQuery, async (req, res, next) => {
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
      agencyId,
    } = req.query;

    if (createdBy === 'me' && !req.user) {
      return res.status(401).json({ error: { message: 'Authentification requise' } });
    }

    const publicOnly = !(req.user?.role === 'admin' || createdBy === 'me');
    const result = await propertyService.listProperties(
      {
        city,
        minPrice,
        maxPrice,
        type,
        status,
        createdBy,
        agencyId,
        userId: req.user?.id,
        userAgencyId: req.user?.agency_id,
        publicOnly,
      },
      { page, limit },
      { sort }
    );

    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    const property = await propertyService.getPropertyById(req.params.id, req.user);
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
  requireRole('agent', 'agency', 'admin'),
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
  requireRole('agent', 'agency', 'admin'),
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

router.delete('/:id', requireAuth, requireRole('agent', 'agency', 'admin'), async (req, res, next) => {
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
  requireRole('agent', 'agency', 'admin'),
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

router.post(
  '/:id/images',
  requireAuth,
  requireRole('agent', 'agency', 'admin'),
  async (req, res, next) => {
    try {
      const files = await parseMultipartImages(req);
      const property = await propertyService.addPropertyImages(req.params.id, files, req.user);
      res.status(201).json({ property });
    } catch (err) {
      next(err);
    }
  }
);

router.delete(
  '/:id/images/:imageId',
  requireAuth,
  requireRole('agent', 'agency', 'admin'),
  async (req, res, next) => {
    try {
      const property = await propertyService.deletePropertyImage(
        req.params.id,
        req.params.imageId,
        req.user
      );
      res.json({ property });
    } catch (err) {
      next(err);
    }
  }
);

router.put(
  '/:id/images/:imageId/main',
  requireAuth,
  requireRole('agent', 'agency', 'admin'),
  async (req, res, next) => {
    try {
      const property = await propertyService.setMainPropertyImage(
        req.params.id,
        req.params.imageId,
        req.user
      );
      res.json({ property });
    } catch (err) {
      next(err);
    }
  }
);

router.post('/:id/contact', optionalAuth, async (req, res, next) => {
  try {
    const contact = await propertyService.createContact(req.params.id, req.body, req.user);
    res.status(201).json({ contact });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
