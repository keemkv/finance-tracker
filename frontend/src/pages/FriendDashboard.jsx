import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../api/axios";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

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

function toISODate(d) {
  return d.toISOString().split("T")[0];
}

function buildCategoryChartData(summary) {
  return (summary?.byCategory ?? []).map((item) => ({
    category: item.category || "Uncategorized",
    total: Number(item.total) || 0,
  }));
}

function FriendDashboard() {
  const { friendId } = useParams();
  const [summary, setSummary] = useState(null);
  const [friendEmail, setFriendEmail] = useState("");
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetchData();
    fetchComments();
  }, [friendId]);

  const fetchData = async () => {
    try {
      const today = new Date();
      const first = toISODate(
        new Date(today.getFullYear(), today.getMonth(), 1),
      );
      const last = toISODate(
        new Date(today.getFullYear(), today.getMonth() + 1, 0),
      );

      const res = await api.get(
        `/transactions/summary?from=${first}&to=${last}&userId=${friendId}`,
      );
      setSummary(res.data);

      const friendsRes = await api.get("/friends");
      const friend = friendsRes.data.find((f) => f.id === parseInt(friendId));
      setFriendEmail(friend ? friend.email : "");
    } catch (err) {
      setError(err.response?.data?.error || "Could not load this dashboard");
    }
  };

  const fetchComments = async () => {
    try {
      const res = await api.get(`/comments/${friendId}`);
      setComments(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    try {
      await api.post(`/comments/${friendId}`, { text: newComment });
      setNewComment("");
      fetchComments();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await api.delete(`/comments/${commentId}`);
      fetchComments();
    } catch (err) {
      console.error(err);
    }
  };

  const categoryChartData = buildCategoryChartData(summary);
  const hasCategoryChartData = categoryChartData.some((item) => item.total > 0);

  if (error) {
    return (
      <div className="min-h-screen bg-navy-bg flex items-center justify-center">
        <p className="text-soft-red">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-navy-bg p-6 lg:p-10">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-heading font-semibold text-off-white">
            {friendEmail ? `${friendEmail}'s Dashboard` : "Loading..."}
          </h1>
          <Link
            to="/friends"
            className="px-4 py-2 border border-white/10 text-off-white/70 hover:text-off-white transition-colors"
          >
            ← Back to Friends
          </Link>
        </div>

        {summary && (
          <>
            <div className="bg-navy-card border border-white/5 p-6 mb-6">
              <p className="text-off-white/50 text-sm mb-1">Current Balance</p>
              <p className="text-4xl font-heading font-semibold text-gold">
                ${summary.currentBalance.toFixed(2)}
              </p>
              <p className="text-off-white/50 text-sm mt-2">
                Spent this month: ${summary.totalSpentInRange.toFixed(2)}
              </p>
            </div>

            <div className="bg-navy-card border border-white/5 p-6 mb-6">
              <h2 className="font-heading font-semibold text-xl text-off-white mb-4">
                Spending by Category
              </h2>
              {hasCategoryChartData ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={categoryChartData}
                      dataKey="total"
                      nameKey="category"
                      outerRadius={100}
                      label={(entry) => entry.category}
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
              ) : (
                <p className="text-off-white/40">
                  No spending data this month.
                </p>
              )}
            </div>
          </>
        )}

        {/* Comments */}
        <div className="bg-navy-card border border-white/5 p-6">
          <h2 className="font-heading font-semibold text-xl text-off-white mb-4">
            Comments
          </h2>

          <form onSubmit={handleAddComment} className="flex gap-2 mb-6">
            <input
              type="text"
              placeholder="Leave a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="flex-1 px-4 py-2.5 bg-navy-bg border border-white/10 text-off-white focus:border-gold focus:outline-none"
            />
            <button
              type="submit"
              className="px-6 bg-gold text-navy-bg font-heading font-semibold"
            >
              Post
            </button>
          </form>

          {comments.length === 0 ? (
            <p className="text-off-white/40">No comments yet.</p>
          ) : (
            <div className="space-y-3">
              {comments.map((c) => (
                <div key={c.id} className="border-b border-white/5 pb-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gold text-sm font-medium">
                      {c.author_email}
                    </span>
                    <button
                      onClick={() => handleDeleteComment(c.id)}
                      className="text-off-white/30 hover:text-soft-red text-xs"
                    >
                      ✕
                    </button>
                  </div>
                  <p className="text-off-white mt-1">{c.text}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default FriendDashboard;
