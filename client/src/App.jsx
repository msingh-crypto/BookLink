import { useState, useEffect } from "react";

import Navbar from "./components/Navbar";
import Register from "./components/Register";
import Login from "./components/Login";
import CreateListingForm from "./components/CreateListingForm";
import ListingsView from "./components/ListingsView";

export default function App() {
  // Track the current page
  const [currentView, setCurrentView] = useState("register");

  // Store the authenticated user
  const [user, setUser] = useState(null);

  // Check whether an existing session is valid
  const [checkingSession, setCheckingSession] = useState(true);

  // Store authentication errors
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
          setCurrentView("home");
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

  // Handle successful login
  function handleLogin(loggedInUser) {
    setUser(loggedInUser);
    setCurrentView("home");
    setError("");
  }

  // Handle logout
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
      setCurrentView("login");
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="container mx-auto px-4 py-6">
        {error && <p className="text-red-600 text-center mt-4">{error}</p>}

        {/* Check existing authentication session */}
        {checkingSession && (
          <p className="text-center mt-10">Checking your session...</p>
        )}

        {/* Show registration and login when logged out */}
        {!checkingSession && !user && (
          <>
            <div className="flex justify-center gap-4 mt-8">
              <button
                type="button"
                onClick={() => setCurrentView("register")}
                className="bg-blue-600 text-white px-4 py-2 rounded-md"
              >
                Register
              </button>

              <button
                type="button"
                onClick={() => setCurrentView("login")}
                className="bg-blue-600 text-white px-4 py-2 rounded-md"
              >
                Login
              </button>

              <button
                type="button"
                onClick={() => setCurrentView("listings")}
                className="bg-white text-blue-700 border border-blue-600 px-4 py-2 rounded-md"
              >
                Browse Listings
              </button>
            </div>

            {currentView === "login" && <Login onLogin={handleLogin} />}

            {currentView === "listings" && (
              <div className="mt-8">
                <ListingsView onCreateListing={() => setCurrentView("login")} />
              </div>
            )}

            {currentView !== "login" && currentView !== "listings" && (
              <Register />
            )}
          </>
        )}

        {/* Show authenticated features when logged in */}
        {!checkingSession && user && (
          <>
            <div className="flex justify-center gap-4 py-2 bg-slate-200">
              <button
                type="button"
                className="px-3 py-1 bg-white rounded shadow text-sm"
                onClick={() => setCurrentView("home")}
              >
                Home
              </button>

              <button
                type="button"
                className="px-3 py-1 bg-white rounded shadow text-sm"
                onClick={() => setCurrentView("listings")}
              >
                Browse Listings
              </button>

              <button
                type="button"
                className="px-3 py-1 bg-white rounded shadow text-sm"
                onClick={() => setCurrentView("create-listing")}
              >
                Create Listing View
              </button>

              <button
                type="button"
                className="px-3 py-1 bg-red-600 text-white rounded shadow text-sm"
                onClick={handleLogout}
              >
                Logout
              </button>
            </div>

            {currentView === "home" && (
              <div className="text-center py-12">
                <h2 className="text-2xl font-bold mb-4">
                  Welcome to BookLink!
                </h2>

                <p className="mb-6">Logged in as: {user.email}</p>

                <button
                  type="button"
                  onClick={() => setCurrentView("listings")}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
                >
                  Browse current listings
                </button>
              </div>
            )}

            {currentView === "listings" && (
              <div className="py-6">
                <ListingsView
                  onCreateListing={() => setCurrentView("create-listing")}
                />
              </div>
            )}

            {currentView === "create-listing" && (
              <div className="max-w-2xl mx-auto bg-white p-6 rounded-lg shadow-sm">
                <CreateListingForm
                  sellerId={user.id}
                  onSuccess={(data) => {
                    alert(`Listing created successfully! ID: ${data.id}`);
                    setCurrentView("listings");
                  }}
                />
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
