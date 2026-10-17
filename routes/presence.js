const express = require('express');
const AccountPresence = require('../models/mongo/AccountPresence');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

router.post('/heartbeat', async (req, res, next) => {
  try {
    const lastSeenAt = new Date();
    await AccountPresence.updateOne(
      { userId: req.user.id },
      { $set: { lastSeenAt } },
      { upsert: true }
    );
    res.json({ ok: true, lastSeenAt });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
