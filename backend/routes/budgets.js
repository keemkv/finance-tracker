const express = require("express");
const pool = require("../db/pool");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

router.use(authMiddleware);

// SET or UPDATE a budget for a category
router.put("/", async (req, res) => {
  try {
    const { category_id, monthly_limit } = req.body;
    if (!category_id || monthly_limit === undefined) {
      return res
        .status(400)
        .json({ error: "category_id and monthly_limit are required" });
    }

    const result = await pool.query(
      `INSERT INTO budgets (user_id, category_id, monthly_limit)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, category_id)
       DO UPDATE SET monthly_limit = $3
       RETURNING *`,
      [req.userId, category_id, monthly_limit],
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong" });
  }
});

// GET all budgets with actual spending for a date range
router.get("/", async (req, res) => {
  try {
    const { from, to } = req.query;
    if (!from || !to) {
      return res.status(400).json({ error: "from and to are required" });
    }

    const result = await pool.query(
      `SELECT
         b.id,
         b.category_id,
         c.name AS category,
         b.monthly_limit,
         COALESCE(SUM(t.amount) FILTER (WHERE t.date BETWEEN $2 AND $3), 0) AS spent
       FROM budgets b
       JOIN categories c ON b.category_id = c.id
       LEFT JOIN transactions t ON t.category_id = b.category_id AND t.user_id = b.user_id
       WHERE b.user_id = $1
       GROUP BY b.id, c.name, b.monthly_limit
       ORDER BY c.name`,
      [req.userId, from, to],
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong" });
  }
});

// DELETE a budget
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM budgets WHERE id = $1 AND user_id = $2", [
      id,
      req.userId,
    ]);
    res.json({ message: "Budget deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong" });
  }
});

module.exports = router;
