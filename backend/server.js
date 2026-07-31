require("dotenv").config();
const express = require("express");
const cors = require("cors");
app.use(
  cors({
    origin: "https://finance-tracker-crb673p3w-konstantin7.vercel.app",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  }),
);
const app = express();
const allowedOrigins = ["http://localhost:5173"];

app.use(
  cors({
    origin(origin, callback) {
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        /^https:\/\/finance-tracker.*konstantin7\.vercel\.app$/.test(origin)
      ) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  }),
);
app.use(express.json());

const authRoutes = require("./routes/auth");
app.use("/api/auth", authRoutes);

const categoryRoutes = require("./routes/categories");
app.use("/api/categories", categoryRoutes);

const budgetRoutes = require("./routes/budgets");
app.use("/api/budgets", budgetRoutes);

const transactionRoutes = require("./routes/transactions");
app.use("/api/transactions", transactionRoutes);
const friendRoutes = require("./routes/friends");
app.use("/api/friends", friendRoutes);
const commentRoutes = require("./routes/comments");
app.use("/api/comments", commentRoutes);
app.get("/", (req, res) => {
  res.send("Finance tracker server is running");
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
