const express = require("express");
const pool = require("../db/pool");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

router.use(authMiddleware);

// helper: check two users are friends
async function areFriends(userA, userB) {
  const result = await pool.query(
    "SELECT 1 FROM friendships WHERE user_id = $1 AND friend_id = $2",
    [userA, userB],
  );
  return result.rows.length > 0;
}

// GET comments on a user's dashboard (only if you're friends, or it's your own)
router.get("/:targetUserId", async (req, res) => {
  try {
    const { targetUserId } = req.params;
    const targetId = parseInt(targetUserId);

    if (targetId !== req.userId) {
      const friends = await areFriends(req.userId, targetId);
      if (!friends) {
        return res
          .status(403)
          .json({ error: "You are not friends with this user" });
      }
    }

    const result = await pool.query(
      `SELECT c.id, c.text, c.created_at, u.email AS author_email
       FROM comments c
       JOIN users u ON c.author_user_id = u.id
       WHERE c.target_user_id = $1
       ORDER BY c.created_at DESC`,
      [targetId],
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong" });
  }
});

// POST a comment on a friend's dashboard
router.post("/:targetUserId", async (req, res) => {
  try {
    const { targetUserId } = req.params;
    const targetId = parseInt(targetUserId);
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ error: "Comment text is required" });
    }

    if (targetId !== req.userId) {
      const friends = await areFriends(req.userId, targetId);
      if (!friends) {
        return res
          .status(403)
          .json({ error: "You are not friends with this user" });
      }
    }

    const result = await pool.query(
      `INSERT INTO comments (target_user_id, author_user_id, text)
       VALUES ($1, $2, $3) RETURNING *`,
      [targetId, req.userId, text],
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong" });
  }
});

// DELETE a comment (only the author can delete their own)
router.delete("/:commentId", async (req, res) => {
  try {
    const { commentId } = req.params;
    await pool.query(
      "DELETE FROM comments WHERE id = $1 AND author_user_id = $2",
      [commentId, req.userId],
    );
    res.json({ message: "Comment deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong" });
  }
});

module.exports = router;
