import { useState, useEffect } from "react";

import Navbar from "./components/Navbar";
import LandingHero from "./components/LandingHero";
import AuthModal from "./components/AuthModal";
import Register from "./components/Register";
import Login from "./components/Login";
import CreateListingForm from "./components/CreateListingForm";
import ModerationDashboard from "./components/ModerationDashboard";

export default function App() {
  // Navigation view: "home" | "books" | "create-listing"
  const [currentView, setCurrentView] = useState("home");

  // Authenticated user object { id, email }
  const [user, setUser] = useState(null);

  // Session verification flag
  const [checkingSession, setCheckingSession] = useState(true);

  // Global application errors
  const [error, setError] = useState("");

  // Controls auth modal visibility and current mode ("login" | "register")
  const [authModal, setAuthModal] = useState({
    isOpen: false,
    mode: "login",
  });

  // Verify existing backend session on initial load
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

  // Handle successful user login
  function handleLogin(loggedInUser) {
    setUser(loggedInUser);
    setAuthModal({ isOpen: false, mode: "login" });
    setError("");
  }

  // Handle successful registration
  function handleRegisterSuccess() {
    // Switch modal mode to login or prompt user to log in
    setAuthModal({ isOpen: true, mode: "login" });
  }

  // Handle user logout
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
      setCurrentView("home");
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Top Navigation Bar */}
      <Navbar
        user={user}
        currentView={currentView}
        setCurrentView={setCurrentView}
        onOpenAuth={(mode) => setAuthModal({ isOpen: true, mode })}
        onLogout={handleLogout}
      />

      {/* Main Content View Area */}
      <main className="container mx-auto px-4 py-6 flex-1">
        {error && <p className="text-red-600 text-center mb-4">{error}</p>}

        {checkingSession ? (
          <p className="text-center mt-10 text-slate-500">
            Checking session...
          </p>
        ) : (
          <>
            {/* Smooth Public Homepage / Landing Hero */}
            {currentView === "home" && (
              <LandingHero
                onGetStarted={() =>
                  setAuthModal({
                    isOpen: true,
                    mode: user ? "home" : "register",
                  })
                }
              />
            )}

            {/* Authenticated Create Listing Form */}
            {currentView === "create-listing" && user && (
              <div className="max-w-2xl mx-auto bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <CreateListingForm
                  sellerId={user.id}
                  onSuccess={(data) => {
                    alert(`Listing created successfully! ID: ${data.id}`);
                    setCurrentView("home");
                  }}
                />
              </div>
            )}

            {/* Admin / Moderator Console */}
            {currentView === "moderation" &&
              user &&
              (user.role === "admin" || user.role === "moderator") && (
                <ModerationDashboard user={user} />
              )}
          </>
        )}
      </main>

      {/* Auth Modal Overlay */}
      <AuthModal
        isOpen={authModal.isOpen}
        mode={authModal.mode}
        setMode={(mode) => setAuthModal((prev) => ({ ...prev, mode }))}
        onClose={() => setAuthModal({ ...authModal, isOpen: false })}
      >
        {authModal.mode === "login" ? (
          <Login onLogin={handleLogin} />
        ) : (
          <Register onSuccess={handleRegisterSuccess} />
        )}
      </AuthModal>
    </div>
  );
}
