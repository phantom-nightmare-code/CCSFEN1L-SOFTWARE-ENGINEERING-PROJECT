const express = require('express');
const { authenticate } = require('../middleware/auth');
const { getRecommendations } = require('../services/recommendation');

const router = express.Router();

router.get('/', authenticate, async (req, res, next) => {
  try {
    const data = await getRecommendations(req.user.id);
    res.json(data);
  } catch (err) { next(err); }
});

module.exports = router;