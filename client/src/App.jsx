import { useState, useEffect } from "react";
import Navbar from "./components/Navbar";
import Register from "./components/Register";
import Login from "./components/Login";

export default function App() {
  // Track which page the student wants to see
  const [view, setView] = useState("register");

  // Store the currently authenticated student
  const [user, setUser] = useState(null);

  // Track whether we're checking an existing session
  const [checkingSession, setCheckingSession] = useState(true);

  // Display authentication errors
  const [error, setError] = useState("");

  // Check whether the student is already logged in
  useEffect(() => {
    const controller = new AbortController();

    async function checkSession() {
      try {
        const response = await fetch("http://localhost:5001/api/auth/me", {
          credentials: "include",
          signal: controller.signal,
        });

        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
        } else if (response.status !== 401) {
          setError("Unable to verify your session.");
        }
      } catch (err) {
        if (err.name !== "AbortError") {
          setError("Unable to connect to the server.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setCheckingSession(false);
        }
      }
    }

    void checkSession();

    return () => controller.abort();
  }, []);

  // Update user information after successful login
  function handleLogin(loggedInUser) {
    setUser(loggedInUser);
    setError("");
  }

  // Log out the authenticated student
  async function handleLogout() {
    setError("");

    try {
      const response = await fetch("http://localhost:5001/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Logout failed. Please try again.");
      }

      setUser(null);
      setView("login");
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="container mx-auto px-4">
        {error && <p className="text-red-600 text-center mt-4">{error}</p>}

        {/* Show loading message while checking the session */}
        {checkingSession && (
          <p className="text-center mt-10">Checking your session...</p>
        )}

        {/* Show student information when logged in */}
        {!checkingSession && user && (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold mb-4">Welcome to BookLink!</h2>

            <p className="mb-6">Logged in as: {user.email}</p>

            <button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-md"
            >
              Logout
            </button>
          </div>
        )}

        {/* Show registration or login when logged out */}
        {!checkingSession && !user && (
          <>
            <div className="flex justify-center gap-4 mt-8">
              <button
                onClick={() => setView("register")}
                className="bg-blue-600 text-white px-4 py-2 rounded-md"
              >
                Register
              </button>

              <button
                onClick={() => setView("login")}
                className="bg-blue-600 text-white px-4 py-2 rounded-md"
              >
                Login
              </button>
            </div>

            {view === "login" ? <Login onLogin={handleLogin} /> : <Register />}
          </>
        )}
      </main>
    </div>
  );
}
