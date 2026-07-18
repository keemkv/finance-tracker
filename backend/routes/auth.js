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

const DEMO_EMAIL = "demo@vault.app";

// DEMO LOGIN — resets demo data, then logs in as the demo user
router.post("/demo", async (req, res) => {
  try {
    const userResult = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [DEMO_EMAIL],
    );
    const demoUser = userResult.rows[0];

    if (!demoUser) {
      return res.status(500).json({ error: "Demo account not set up" });
    }

    // reset: wipe existing demo transactions and budgets
    await pool.query("DELETE FROM transactions WHERE user_id = $1", [
      demoUser.id,
    ]);
    await pool.query("DELETE FROM budgets WHERE user_id = $1", [demoUser.id]);

    // re-seed fresh demo data with recent dates
    const categories = await pool.query(
      "SELECT id, name FROM categories WHERE user_id IS NULL",
    );
    const catId = (name) => categories.rows.find((c) => c.name === name)?.id;

    const seedTransactions = [
      {
        category: "Rent",
        amount: 900,
        description: "Monthly rent",
        daysAgo: 20,
      },
      { category: "Food", amount: 65, description: "Groceries", daysAgo: 18 },
      { category: "Food", amount: 22, description: "Lunch out", daysAgo: 15 },
      { category: "Transport", amount: 40, description: "Gas", daysAgo: 14 },
      {
        category: "Entertainment",
        amount: 35,
        description: "Movies",
        daysAgo: 10,
      },
      {
        category: "Shopping",
        amount: 80,
        description: "New shoes",
        daysAgo: 7,
      },
      { category: "Health", amount: 50, description: "Pharmacy", daysAgo: 5 },
      {
        category: "Utilities",
        amount: 110,
        description: "Electric bill",
        daysAgo: 3,
      },
    ];

    for (const tx of seedTransactions) {
      const date = new Date();
      date.setDate(date.getDate() - tx.daysAgo);
      await pool.query(
        "INSERT INTO transactions (user_id, category_id, amount, description, date) VALUES ($1, $2, $3, $4, $5)",
        [
          demoUser.id,
          catId(tx.category),
          tx.amount,
          tx.description,
          date.toISOString().split("T")[0],
        ],
      );
    }

    const seedBudgets = [
      { category: "Food", limit: 300 },
      { category: "Rent", limit: 900 },
      { category: "Entertainment", limit: 100 },
    ];

    for (const b of seedBudgets) {
      await pool.query(
        `INSERT INTO budgets (user_id, category_id, monthly_limit)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id, category_id) DO UPDATE SET monthly_limit = $3`,
        [demoUser.id, catId(b.category), b.limit],
      );
    }

    // reset starting balance too
    await pool.query("UPDATE users SET starting_balance = $1 WHERE id = $2", [
      2500,
      demoUser.id,
    ]);

    const token = jwt.sign({ userId: demoUser.id }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    res.json({ token, user: { id: demoUser.id, email: demoUser.email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong" });
  }
});
module.exports = router;
