import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import { Link } from "react-router-dom";

const COLORS = [
  "#C9A961",
  "#34D399",
  "#60A5FA",
  "#F87171",
  "#A78BFA",
  "#FB923C",
  "#38BDF8",
  "#F472B6",
];

function getMonthRange(monthStr) {
  // monthStr like "2026-07"
  const [year, month] = monthStr.split("-").map(Number);
  const from = `${monthStr}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const to = `${monthStr}-${String(lastDay).padStart(2, "0")}`;
  return { from, to };
}

function getWeeklyTotals(transactions, monthStr) {
  const weeks = [
    { name: "Week 1", total: 0 },
    { name: "Week 2", total: 0 },
    { name: "Week 3", total: 0 },
    { name: "Week 4", total: 0 },
    { name: "Week 5", total: 0 },
  ];

  transactions.forEach((t) => {
    const day = new Date(t.date).getDate();
    const weekIndex = Math.min(Math.floor((day - 1) / 7), 4);
    weeks[weekIndex].total += parseFloat(t.amount);
  });

  return weeks.filter((w, i) => i < 4 || w.total > 0); // drop empty week 5 for short months
}

function buildCategoryChartData(transactions, summary) {
  const fromTransactions = transactions.reduce((acc, tx) => {
    const amount = Number(tx.amount) || 0;
    if (amount <= 0) {
      return acc;
    }

    const categoryName = tx.category_name || tx.category || "Uncategorized";
    const existing = acc.find((item) => item.category === categoryName);

    if (existing) {
      existing.total += amount;
    } else {
      acc.push({ category: categoryName, total: amount });
    }

    return acc;
  }, []);

  if (fromTransactions.length > 0) {
    return fromTransactions.sort((a, b) => b.total - a.total);
  }

  return (summary?.byCategory ?? []).map((item) => ({
    category: item.category || "Uncategorized",
    total: Number(item.total) || 0,
  }));
}

function Dashboard() {
  const today = new Date();
  const defaultMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;

  const [month, setMonth] = useState(defaultMonth);
  const [categories, setCategories] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState(null);

  const [editingBalance, setEditingBalance] = useState(false);
  const [newBalance, setNewBalance] = useState("");

  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(today.toISOString().split("T")[0]);

  const [newCategoryName, setNewCategoryName] = useState("");
  const [showNewCategory, setShowNewCategory] = useState(false);

  const [budgets, setBudgets] = useState([]);
  const [budgetCategoryId, setBudgetCategoryId] = useState("");
  const [budgetLimit, setBudgetLimit] = useState("");

  const [editingTxId, setEditingTxId] = useState(null);
  const [editAmount, setEditAmount] = useState("");
  const [editCategoryId, setEditCategoryId] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editDate, setEditDate] = useState("");
  const [myComments, setMyComments] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchData();
  }, [month]);
  useEffect(() => {
    fetchMyComments();
  }, []);

  const myUserId = localStorage.getItem("userId");

  const fetchMyComments = async () => {
    try {
      const res = await api.get(`/comments/${myUserId}`);
      setMyComments(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await api.get("/categories");
      setCategories(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchData = async () => {
    try {
      const { from, to } = getMonthRange(month);
      const [txRes, summaryRes, budgetsRes] = await Promise.all([
        api.get(`/transactions?from=${from}&to=${to}`),
        api.get(`/transactions/summary?from=${from}&to=${to}`),
        api.get(`/budgets?from=${from}&to=${to}`),
      ]);
      setTransactions(txRes.data);
      setSummary(summaryRes.data);
      setBudgets(budgetsRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateBalance = async (e) => {
    e.preventDefault();
    try {
      await api.put("/auth/balance", {
        current_balance: parseFloat(newBalance),
      });
      setEditingBalance(false);
      setNewBalance("");
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddTransaction = async (e) => {
    e.preventDefault();
    if (!amount || !date) return;
    try {
      await api.post("/transactions", {
        amount: parseFloat(amount),
        category_id: categoryId || null,
        description,
        date,
      });
      setAmount("");
      setDescription("");
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteTransaction = async (id) => {
    try {
      await api.delete(`/transactions/${id}`);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    try {
      const res = await api.post("/categories", { name: newCategoryName });
      setNewCategoryName("");
      setShowNewCategory(false);
      await fetchCategories();
      setCategoryId(res.data.id);
    } catch (err) {
      console.error(err);
    }
  };
  const handleSetBudget = async (e) => {
    e.preventDefault();
    if (!budgetCategoryId || !budgetLimit) return;
    try {
      await api.put("/budgets", {
        category_id: budgetCategoryId,
        monthly_limit: parseFloat(budgetLimit),
      });
      setBudgetCategoryId("");
      setBudgetLimit("");
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteBudget = async (id) => {
    try {
      await api.delete(`/budgets/${id}`);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };
  const startEditing = (t) => {
    setEditingTxId(t.id);
    setEditAmount(t.amount);
    setEditCategoryId(t.category_id || "");
    setEditDescription(t.description || "");
    setEditDate(t.date.split("T")[0]);
  };

  const cancelEditing = () => {
    setEditingTxId(null);
  };

  const handleUpdateTransaction = async (e, id) => {
    e.preventDefault();
    try {
      await api.put(`/transactions/${id}`, {
        amount: parseFloat(editAmount),
        category_id: editCategoryId || null,
        description: editDescription,
        date: editDate,
      });
      setEditingTxId(null);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  const weeklyData = getWeeklyTotals(transactions, month);
  const categoryChartData = buildCategoryChartData(transactions, summary);
  const hasCategoryChartData = categoryChartData.some((item) => item.total > 0);

  return (
    <div className="min-h-screen bg-navy-bg p-6 lg:p-10">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-heading font-semibold text-off-white">
            Vault
          </h1>
          <div className="flex items-center gap-4">
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="bg-navy-card border border-white/10 text-off-white px-3 py-2"
            />
            <button
              onClick={handleLogout}
              className="px-4 py-2 border border-white/10 text-off-white/70 hover:text-off-white transition-colors"
            >
              Logout
            </button>
            <Link
              to="/friends"
              className="px-4 py-2 border border-white/10 text-off-white/70 hover:text-off-white transition-colors"
            >
              Friends
            </Link>
            ;
          </div>
        </div>

        {/* Balance */}
        {summary && (
          <div className="bg-navy-card border border-white/5 p-6 mb-6">
            <p className="text-off-white/50 text-sm mb-1">Current Balance</p>

            {!editingBalance ? (
              <div className="flex items-center gap-4">
                <p className="text-4xl font-heading font-semibold text-gold">
                  ${summary.currentBalance.toFixed(2)}
                </p>
                <button
                  onClick={() => {
                    setEditingBalance(true);
                    setNewBalance(summary.currentBalance.toFixed(2));
                  }}
                  className="text-off-white/40 hover:text-gold text-sm transition-colors"
                >
                  Edit
                </button>
              </div>
            ) : (
              <form
                onSubmit={handleUpdateBalance}
                className="flex items-center gap-2"
              >
                <input
                  type="number"
                  step="0.01"
                  value={newBalance}
                  onChange={(e) => setNewBalance(e.target.value)}
                  className="px-3 py-1.5 bg-navy-bg border border-white/10 text-off-white focus:border-gold focus:outline-none w-40"
                  autoFocus
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-gold text-navy-bg text-sm font-medium"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setEditingBalance(false)}
                  className="px-3 py-1.5 border border-white/10 text-off-white/70 text-sm"
                >
                  Cancel
                </button>
              </form>
            )}

            <p className="text-off-white/50 text-sm mt-2">
              Spent this month: ${summary.totalSpentInRange.toFixed(2)}
            </p>
          </div>
        )}

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-navy-card border border-white/5 p-6">
            <h2 className="font-heading font-semibold text-xl text-off-white mb-4">
              Spending by Category
            </h2>
            {hasCategoryChartData ? (
              <div className="flex flex-col lg:flex-row gap-4 items-center">
                <div className="flex-1 w-full min-w-0">
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={categoryChartData}
                        dataKey="total"
                        nameKey="category"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        innerRadius={60}
                        paddingAngle={2}
                        label={({ category, percent }) => {
                          const pct = ((percent ?? 0) * 100).toFixed(0);
                          return pct > 0 ? `${category} ${pct}%` : "";
                        }}
                      >
                        {categoryChartData.map((entry, index) => (
                          <Cell
                            key={`${entry.category}-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => `$${Number(value).toFixed(2)}`}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="w-full lg:w-44 flex-shrink-0">
                  <h3 className="text-sm uppercase tracking-wide text-off-white/50 mb-3">
                    Top Spendings
                  </h3>
                  <div className="space-y-3">
                    {categoryChartData
                      .slice()
                      .sort((a, b) => b.total - a.total)
                      .slice(0, 3)
                      .map((item, index) => (
                        <div
                          key={item.category}
                          className="flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full"
                              style={{
                                backgroundColor: COLORS[index % COLORS.length],
                              }}
                            />
                            <span className="text-off-white/80 text-sm">
                              {item.category}
                            </span>
                          </div>
                          <span className="text-off-white font-medium text-sm">
                            ${Number(item.total).toFixed(2)}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-off-white/40">
                No spending data for this month.
              </p>
            )}
          </div>

          <div className="bg-navy-card border border-white/5 p-6">
            <h2 className="font-heading font-semibold text-xl text-off-white mb-4">
              Weekly Spending
            </h2>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={weeklyData}>
                <XAxis
                  dataKey="name"
                  tick={{ fill: "#E5E9F0", fontSize: 12 }}
                />
                <YAxis tick={{ fill: "#E5E9F0", fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="total" fill="#C9A961" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Budgets */}
        <div className="bg-navy-card border border-white/5 p-6 mb-6">
          <h2 className="font-heading font-semibold text-xl text-off-white mb-4">
            Monthly Budgets
          </h2>

          {/* Set new budget form */}
          <form onSubmit={handleSetBudget} className="flex gap-2 mb-6">
            <select
              value={budgetCategoryId}
              onChange={(e) => setBudgetCategoryId(e.target.value)}
              className="flex-1 px-3 py-2 bg-navy-bg border border-white/10 text-off-white focus:border-gold focus:outline-none"
            >
              <option value="">Select category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <input
              type="number"
              step="0.01"
              placeholder="Limit ($)"
              value={budgetLimit}
              onChange={(e) => setBudgetLimit(e.target.value)}
              className="w-32 px-3 py-2 bg-navy-bg border border-white/10 text-off-white focus:border-gold focus:outline-none"
            />
            <button
              type="submit"
              className="px-4 bg-gold text-navy-bg font-heading font-semibold"
            >
              Set
            </button>
          </form>

          {/* Budget bars */}
          {budgets.length === 0 ? (
            <p className="text-off-white/40">No budgets set yet.</p>
          ) : (
            <div className="space-y-4">
              {budgets.map((b) => {
                const spent = parseFloat(b.spent);
                const limit = parseFloat(b.monthly_limit);
                const percent = Math.min((spent / limit) * 100, 100);
                const isOver = spent > limit;

                return (
                  <div key={b.id}>
                    <div className="flex justify-between items-center mb-1">
                      <p className="text-off-white font-medium">{b.category}</p>
                      <div className="flex items-center gap-2">
                        <p
                          className={`text-sm ${isOver ? "text-soft-red" : "text-off-white/60"}`}
                        >
                          ${spent.toFixed(2)} / ${limit.toFixed(2)}
                          {isOver && " ⚠️"}
                        </p>
                        <button
                          onClick={() => handleDeleteBudget(b.id)}
                          className="text-off-white/30 hover:text-soft-red text-xs"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                    <div className="w-full h-2 bg-navy-bg overflow-hidden">
                      <div
                        className={`h-full transition-all ${isOver ? "bg-soft-red" : "bg-gold"}`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Add transaction + list */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-navy-card border border-white/5 p-6 h-fit">
            <h2 className="font-heading font-semibold text-xl text-off-white mb-4">
              Add Expense
            </h2>
            <form onSubmit={handleAddTransaction} className="space-y-3">
              <div>
                <label className="block text-sm text-off-white/70 mb-1">
                  Amount
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-navy-bg border border-white/10 text-off-white focus:border-gold focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm text-off-white/70 mb-1">
                  Category
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3 py-2 bg-navy-bg border border-white/10 text-off-white focus:border-gold focus:outline-none"
                >
                  <option value="">Uncategorized</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                {!showNewCategory ? (
                  <button
                    type="button"
                    onClick={() => setShowNewCategory(true)}
                    className="text-gold text-sm mt-1 hover:underline"
                  >
                    + Add custom category
                  </button>
                ) : (
                  <div className="flex gap-2 mt-2">
                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="Category name"
                      className="flex-1 px-3 py-1.5 bg-navy-bg border border-white/10 text-off-white text-sm focus:border-gold focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddCategory}
                      className="px-3 py-1.5 bg-gold text-navy-bg text-sm font-medium"
                    >
                      Add
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm text-off-white/70 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-navy-bg border border-white/10 text-off-white focus:border-gold focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm text-off-white/70 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-navy-bg border border-white/10 text-off-white focus:border-gold focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full mt-2 bg-gold hover:bg-gold/90 text-navy-bg font-heading font-semibold py-2.5 transition-colors"
              >
                Add Expense
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 bg-navy-card border border-white/5 p-6">
            <h2 className="font-heading font-semibold text-xl text-off-white mb-4">
              Transactions
            </h2>
            {transactions.length === 0 ? (
              <p className="text-off-white/40">No transactions this month.</p>
            ) : (
              <div className="space-y-2">
                {transactions.map((t) =>
                  editingTxId === t.id ? (
                    <form
                      key={t.id}
                      onSubmit={(e) => handleUpdateTransaction(e, t.id)}
                      className="border border-gold/30 p-3 space-y-2"
                    >
                      <div className="flex gap-2">
                        <input
                          type="number"
                          step="0.01"
                          value={editAmount}
                          onChange={(e) => setEditAmount(e.target.value)}
                          className="w-24 px-2 py-1.5 bg-navy-bg border border-white/10 text-off-white text-sm focus:border-gold focus:outline-none"
                        />
                        <select
                          value={editCategoryId}
                          onChange={(e) => setEditCategoryId(e.target.value)}
                          className="flex-1 px-2 py-1.5 bg-navy-bg border border-white/10 text-off-white text-sm focus:border-gold focus:outline-none"
                        >
                          <option value="">Uncategorized</option>
                          {categories.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                        <input
                          type="date"
                          value={editDate}
                          onChange={(e) => setEditDate(e.target.value)}
                          className="px-2 py-1.5 bg-navy-bg border border-white/10 text-off-white text-sm focus:border-gold focus:outline-none"
                        />
                      </div>
                      <input
                        type="text"
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        placeholder="Description"
                        className="w-full px-2 py-1.5 bg-navy-bg border border-white/10 text-off-white text-sm focus:border-gold focus:outline-none"
                      />
                      <div className="flex gap-2">
                        <button
                          type="submit"
                          className="px-3 py-1.5 bg-gold text-navy-bg text-sm font-medium"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={cancelEditing}
                          className="px-3 py-1.5 border border-white/10 text-off-white/70 text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div
                      key={t.id}
                      className="flex items-center justify-between border-b border-white/5 py-3"
                    >
                      <div>
                        <p className="text-off-white font-medium">
                          {t.description || "No description"}
                        </p>
                        <p className="text-off-white/40 text-sm">
                          {t.category_name || "Uncategorized"} · {t.date}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <p className="text-soft-red font-heading font-semibold">
                          -${parseFloat(t.amount).toFixed(2)}
                        </p>
                        <button
                          onClick={() => startEditing(t)}
                          className="text-off-white/30 hover:text-gold transition-colors text-sm"
                        >
                          ✎
                        </button>
                        <button
                          onClick={() => handleDeleteTransaction(t.id)}
                          className="text-off-white/30 hover:text-soft-red transition-colors text-sm"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ),
                )}
              </div>
            )}
          </div>
          <div className="bg-navy-card border border-white/5 p-6 mt-6">
            <h2 className="font-heading font-semibold text-xl text-off-white mb-4">
              What your friends are saying
            </h2>
            {myComments.length === 0 ? (
              <p className="text-off-white/40">No comments yet.</p>
            ) : (
              <div className="space-y-3">
                {myComments.map((c) => (
                  <div key={c.id} className="border-b border-white/5 pb-3">
                    <span className="text-gold text-sm font-medium">
                      {c.author_email}
                    </span>
                    <p className="text-off-white mt-1">{c.text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
