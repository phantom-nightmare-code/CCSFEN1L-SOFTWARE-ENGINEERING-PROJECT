const express = require('express');
const router = express.Router();
const db = require('../db'); // Adjust this path if your db connection is elsewhere (e.g., '../config/db')

// GET user by ID
router.get('/:id', async (req, res) => {
  try {
    // ⚠️ CRITICAL: 'created_at' MUST be in this SELECT statement
    const [rows] = await db.query(
      'SELECT id, username, full_name, email, role, experience_years, expertise, created_at FROM users WHERE id = ?',
      [req.params.id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    
    res.json(rows[0]); 
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
