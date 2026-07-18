import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api/axios";

function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [startingBalance, setStartingBalance] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api.post("/auth/register", {
        email,
        password,
        starting_balance: startingBalance ? parseFloat(startingBalance) : 0,
      });
      navigate("/login");
    } catch (err) {
      setError(err.response?.data?.error || "Something went wrong");
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* LEFT PANEL - visual */}
      <div
        className="hidden lg:flex lg:w-2/3 relative items-center justify-center bg-cover bg-center"
        style={{ backgroundImage: "url('/pexels-pabda-5277968.jpg')" }}
      >
        <div className="absolute inset-0 bg-navy-bg/70" />

        <div className="relative z-10 text-center px-12">
          <h1 className="text-7xl font-heading font-semibold text-off-white mb-4">
            Vault
          </h1>
          <p className="text-xl text-off-white/50 max-w-md mx-auto">
            Understand exactly where your money goes, every month.
          </p>
        </div>
      </div>

      {/* RIGHT PANEL - form */}
      <div className="w-full lg:w-1/3 bg-navy-card flex items-center justify-center px-8 py-12">
        <div className="w-full max-w-sm">
          <h2 className="text-3xl font-heading font-semibold text-off-white mb-1 lg:hidden">
            Vault
          </h2>
          <h2 className="text-2xl font-heading font-semibold text-off-white mb-1">
            Create your account
          </h2>
          <p className="text-off-white/50 mb-8">Start tracking your spending</p>

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block font-medium mb-2 text-sm text-off-white/70">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-navy-bg border border-white/10 text-off-white focus:border-gold focus:outline-none transition-colors"
              />
            </div>

            <div className="mb-4">
              <label className="block font-medium mb-2 text-sm text-off-white/70">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-navy-bg border border-white/10 text-off-white focus:border-gold focus:outline-none transition-colors"
              />
            </div>

            <div className="mb-2">
              <label className="block font-medium mb-2 text-sm text-off-white/70">
                Starting balance (optional)
              </label>
              <input
                type="number"
                step="0.01"
                value={startingBalance}
                onChange={(e) => setStartingBalance(e.target.value)}
                placeholder="0.00"
                className="w-full px-4 py-2.5 bg-navy-bg border border-white/10 text-off-white focus:border-gold focus:outline-none transition-colors"
              />
            </div>

            {error && <p className="text-soft-red text-sm mt-2">{error}</p>}

            <button
              type="submit"
              className="w-full mt-6 bg-gold hover:bg-gold/90 text-navy-bg font-heading font-semibold py-3 transition-colors"
            >
              Create Account
            </button>
          </form>

          <p className="text-center mt-6 text-sm text-off-white/50">
            Already have an account?{" "}
            <Link to="/login" className="text-gold font-medium hover:underline">
              Log In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Register;
