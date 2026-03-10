const express = require('express');
const statsService = require('../services/stats.service');

const router = express.Router();

router.get('/overview', async (req, res, next) => {
  try {
    const data = await statsService.getOverviewStats();
    res.json(data);
  } catch (err) {
    next(err);
  }
});

module.exports = router;

