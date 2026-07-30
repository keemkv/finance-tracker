const express = require("express");
const pool = require("../db/pool");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

router.use(authMiddleware);

// GET my friends list
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.email
       FROM friendships f
       JOIN users u ON f.friend_id = u.id
       WHERE f.user_id = $1
       ORDER BY u.email`,
      [req.userId],
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong" });
  }
});

// ADD a friend by email
router.post("/", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const targetResult = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [email],
    );
    const target = targetResult.rows[0];

    if (!target) {
      return res.status(404).json({ error: "No user found with that email" });
    }

    if (target.id === req.userId) {
      return res.status(400).json({ error: "You can't add yourself" });
    }

    // insert both directions, ignore if already friends
    await pool.query(
      `INSERT INTO friendships (user_id, friend_id) VALUES ($1, $2)
       ON CONFLICT (user_id, friend_id) DO NOTHING`,
      [req.userId, target.id],
    );
    await pool.query(
      `INSERT INTO friendships (user_id, friend_id) VALUES ($1, $2)
       ON CONFLICT (user_id, friend_id) DO NOTHING`,
      [target.id, req.userId],
    );

    res.status(201).json({ message: "Friend added" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong" });
  }
});

// REMOVE a friend
router.delete("/:friendId", async (req, res) => {
  try {
    const { friendId } = req.params;
    await pool.query(
      "DELETE FROM friendships WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)",
      [req.userId, friendId],
    );
    res.json({ message: "Friend removed" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong" });
  }
});

module.exports = router;
