import React, { useState } from "react";
import PropTypes from "prop-types";

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // US-02: Handle student login
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // 1. Validate required fields
    if (!email.trim() || !password) {
      setError("Email and password are required.");
      return;
    }

    setLoading(true);

    try {
      // 2. Send login request to the backend
      const response = await fetch("http://localhost:5001/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
          password,
        }),
      });

      const data = await response.json();

      // 3. Handle unsuccessful login
      if (!response.ok) {
        throw new Error(data.error || "Login failed.");
      }

      // 4. Notify the parent component about successful login
      if (onLogin) {
        onLogin(data.user);
      }

      // 5. Clear the password field
      setPassword("");
    } catch (err) {
      setError(err.message || "Unable to log in.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center py-12 px-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg border border-slate-200 p-8">
        <h2 className="text-2xl font-bold text-slate-800 text-center mb-2">
          Login to BookLink
        </h2>

        <p className="text-sm text-slate-500 text-center mb-6">
          Sign in using your Lakehead University student account
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="login-email"
              className="block text-sm font-medium text-slate-700 mb-1"
            >
              Lakehead Email
            </label>

            <input
              id="login-email"
              type="email"
              required
              autoComplete="username"
              placeholder="username@lakeheadu.ca"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>

          <div>
            <label
              htmlFor="login-password"
              className="block text-sm font-medium text-slate-700 mb-1"
            >
              Password
            </label>

            <input
              id="login-password"
              type="password"
              required
              autoComplete="current-password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition duration-150 ease-in-out disabled:opacity-50"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}

Login.propTypes = {
  onLogin: PropTypes.func,
};
