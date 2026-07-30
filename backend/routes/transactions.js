const express = require("express");
const pool = require("../db/pool");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

router.use(authMiddleware);

// CREATE a transaction (an expense)
router.post("/", async (req, res) => {
  try {
    const { amount, category_id, description, date } = req.body;

    if (!amount || !date) {
      return res.status(400).json({ error: "Amount and date are required" });
    }

    const result = await pool.query(
      `INSERT INTO transactions (user_id, category_id, amount, description, date)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.userId, category_id || null, amount, description || null, date],
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong" });
  }
});

// GET transactions, optionally filtered by date range
router.get("/", async (req, res) => {
  try {
    const { from, to } = req.query;

    let query = `
      SELECT t.*, c.name AS category_name
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = $1
    `;
    const params = [req.userId];

    if (from && to) {
      query += ` AND t.date BETWEEN $2 AND $3`;
      params.push(from, to);
    }

    query += ` ORDER BY t.date DESC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong" });
  }
});

// DELETE a transaction
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(
      "DELETE FROM transactions WHERE id = $1 AND user_id = $2",
      [id, req.userId],
    );
    res.json({ message: "Transaction deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong" });
  }
});

// GET summary: current balance + spending by category for a date range (for pie chart)
router.get("/summary", async (req, res) => {
  try {
    const { from, to, userId } = req.query;
    if (!from || !to) {
      return res.status(400).json({ error: "from and to dates are required" });
    }

    let targetUserId = req.userId;

    if (userId && parseInt(userId) !== req.userId) {
      const friendCheck = await pool.query(
        "SELECT 1 FROM friendships WHERE user_id = $1 AND friend_id = $2",
        [req.userId, userId],
      );
      if (friendCheck.rows.length === 0) {
        return res
          .status(403)
          .json({ error: "You are not friends with this user" });
      }
      targetUserId = parseInt(userId);
    }

    // spending by category
    const categoryResult = await pool.query(
      `SELECT c.name AS category, COALESCE(SUM(t.amount), 0) AS total
       FROM transactions t
       LEFT JOIN categories c ON t.category_id = c.id
       WHERE t.user_id = $1 AND t.date BETWEEN $2 AND $3
       GROUP BY c.name
       ORDER BY total DESC`,
      [targetUserId, from, to],
    );

    const userResult = await pool.query(
      "SELECT starting_balance FROM users WHERE id = $1",
      [targetUserId],
    );
    const totalSpentResult = await pool.query(
      "SELECT COALESCE(SUM(amount), 0) AS total FROM transactions WHERE user_id = $1",
      [targetUserId],
    );

    const startingBalance = parseFloat(userResult.rows[0].starting_balance);
    const totalSpent = parseFloat(totalSpentResult.rows[0].total);
    const currentBalance = startingBalance - totalSpent;

    res.json({
      byCategory: categoryResult.rows,
      currentBalance,
      totalSpentInRange: categoryResult.rows.reduce(
        (sum, r) => sum + parseFloat(r.total),
        0,
      ),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong" });
  }
});
// UPDATE starting balance
router.put("/balance", async (req, res) => {
  try {
    const { starting_balance } = req.body;
    if (starting_balance === undefined) {
      return res.status(400).json({ error: "starting_balance is required" });
    }

    await pool.query("UPDATE users SET starting_balance = $1 WHERE id = $2", [
      starting_balance,
      req.userId,
    ]);

    res.json({ message: "Balance updated" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong" });
  }
});
// UPDATE a transaction
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, category_id, description, date } = req.body;

    const result = await pool.query(
      `UPDATE transactions
       SET amount = $1, category_id = $2, description = $3, date = $4
       WHERE id = $5 AND user_id = $6
       RETURNING *`,
      [amount, category_id || null, description || null, date, id, req.userId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong" });
  }
});
module.exports = router;
