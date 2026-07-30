import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api/axios";

function Friends() {
  const [friends, setFriends] = useState([]);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    fetchFriends();
  }, []);

  const fetchFriends = async () => {
    try {
      const res = await api.get("/friends");
      setFriends(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddFriend = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api.post("/friends", { email });
      setEmail("");
      fetchFriends();
    } catch (err) {
      setError(err.response?.data?.error || "Something went wrong");
    }
  };

  const handleRemoveFriend = async (friendId) => {
    try {
      await api.delete(`/friends/${friendId}`);
      fetchFriends();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-navy-bg p-6 lg:p-10">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-heading font-semibold text-off-white">
            Friends
          </h1>
          <Link
            to="/dashboard"
            className="px-4 py-2 border border-white/10 text-off-white/70 hover:text-off-white transition-colors"
          >
            ← Back to Dashboard
          </Link>
        </div>

        <div className="bg-navy-card border border-white/5 p-6 mb-6">
          <h2 className="font-heading font-semibold text-xl text-off-white mb-4">
            Add a Friend
          </h2>
          <form onSubmit={handleAddFriend} className="flex gap-2">
            <input
              type="email"
              placeholder="Friend's email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="flex-1 px-4 py-2.5 bg-navy-bg border border-white/10 text-off-white focus:border-gold focus:outline-none"
            />
            <button
              type="submit"
              className="px-6 bg-gold text-navy-bg font-heading font-semibold"
            >
              Add
            </button>
          </form>
          {error && <p className="text-soft-red text-sm mt-2">{error}</p>}
        </div>

        <div className="bg-navy-card border border-white/5 p-6">
          <h2 className="font-heading font-semibold text-xl text-off-white mb-4">
            Your Friends
          </h2>
          {friends.length === 0 ? (
            <p className="text-off-white/40">
              No friends yet — add someone by email above.
            </p>
          ) : (
            <div className="space-y-2">
              {friends.map((f) => (
                <div
                  key={f.id}
                  className="flex items-center justify-between border-b border-white/5 py-3"
                >
                  <span className="text-off-white">{f.email}</span>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => navigate(`/friend/${f.id}`)}
                      className="text-gold text-sm hover:underline"
                    >
                      View Dashboard
                    </button>
                    <button
                      onClick={() => handleRemoveFriend(f.id)}
                      className="text-off-white/30 hover:text-soft-red text-sm transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Friends;
