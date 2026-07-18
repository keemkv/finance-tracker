const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../db/pool");

const router = express.Router();
const authMiddleware = require("../middleware/auth");
// REGISTER
router.post("/register", async (req, res) => {
  try {
    const { email, password, starting_balance } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const existingUser = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email],
    );
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: "User already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = await pool.query(
      "INSERT INTO users (email, password_hash, starting_balance) VALUES ($1, $2, $3) RETURNING id, email, starting_balance",
      [email, passwordHash, starting_balance || 0],
    );

    res.status(201).json(newUser.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong" });
  }
});

// LOGIN
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const userResult = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email],
    );
    const user = userResult.rows[0];

    if (!user) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        starting_balance: user.starting_balance,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong" });
  }
});
// UPDATE starting balance (adjusts the user's baseline balance)
// UPDATE current balance (recalculates starting_balance to match)
router.put("/balance", authMiddleware, async (req, res) => {
  try {
    const { current_balance } = req.body;
    if (current_balance === undefined) {
      return res.status(400).json({ error: "current_balance is required" });
    }

    // get total spent so far (all-time)
    const totalSpentResult = await pool.query(
      "SELECT COALESCE(SUM(amount), 0) AS total FROM transactions WHERE user_id = $1",
      [req.userId],
    );
    const totalSpent = parseFloat(totalSpentResult.rows[0].total);

    // work backwards: starting_balance = desired current balance + everything already spent
    const newStartingBalance = parseFloat(current_balance) + totalSpent;

    await pool.query("UPDATE users SET starting_balance = $1 WHERE id = $2", [
      newStartingBalance,
      req.userId,
    ]);

    res.json({
      message: "Balance updated",
      currentBalance: parseFloat(current_balance),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong" });
  }
});
module.exports = router;
