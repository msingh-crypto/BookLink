import { useState, useEffect, useCallback } from "react";

import Navbar from "./components/Navbar";
import LandingHero from "./components/LandingHero";
import AuthModal from "./components/AuthModal";
import Register from "./components/Register";
import Login from "./components/Login";
import CreateListingForm from "./components/CreateListingForm";
import ListingsView from "./components/ListingsView";
import MyListingsView from "./components/MyListingsView";
import ModerationDashboard from "./components/ModerationDashboard";
import AdminTaxonomyDashboard from "./components/AdminTaxonomyDashboard";
import AdminAnalyticsDashboard from "./components/AdminAnalyticsDashboard";
import MessagesView from "./components/MessagesView";

// US-01: Banners for the result of clicking the email confirmation link,
// which redirects back here with ?verified=success|invalid|error
const VERIFY_NOTICES = {
  success: {
    ok: true,
    text: "Email confirmed! You can now log in.",
  },
  invalid: {
    ok: false,
    text: "This confirmation link is invalid or has expired. Log in to get a new one.",
  },
  error: {
    ok: false,
    text: "We couldn't confirm your email. Please try again.",
  },
};

const searchParams = new URLSearchParams(window.location.search);
const verifiedParam = searchParams.get("verified");

// US-09: Message notification emails link to /?view=messages
const openMessagesParam = searchParams.get("view") === "messages";

const UNREAD_POLL_MS = 30000;

export default function App() {
  // Navigation view: "home" | "books" | "favourites" | "my-listings" | "messages" | "create-listing" | "moderation"
  const [currentView, setCurrentView] = useState(
    openMessagesParam ? "messages" : "home",
  );

  // US-09: Unread message count for the navbar, and the conversation to
  // open when arriving from a listing's "View conversation" link
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [messageTarget, setMessageTarget] = useState(null);

  // Authenticated user object { id, email }
  const [user, setUser] = useState(null);

  // Session verification flag
  const [checkingSession, setCheckingSession] = useState(true);

  // Global application errors
  const [error, setError] = useState("");

  // Email confirmation result from the link in the student's inbox
  const [verifyNotice, setVerifyNotice] = useState(
    VERIFY_NOTICES[verifiedParam] || null,
  );

  // Controls auth modal visibility and current mode ("login" | "register")
  // Opens straight to login after a successful email confirmation
  const [authModal, setAuthModal] = useState({
    isOpen: verifiedParam === "success",
    mode: "login",
  });

  // Remove ?verified=... from the address bar so a refresh doesn't repeat it
  useEffect(() => {
    if (verifiedParam || openMessagesParam) {
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

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

  // US-09: Refresh the unread badge
  const refreshUnreadMessages = useCallback(async () => {
    try {
      const response = await fetch("/api/messages/unread-count", {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setUnreadMessages(data.count || 0);
      }
    } catch {
      // The badge is a convenience; ignore network errors
    }
  }, []);

  useEffect(() => {
    if (!user) {
      setUnreadMessages(0);
      return undefined;
    }
    void refreshUnreadMessages();
    const timer = setInterval(refreshUnreadMessages, UNREAD_POLL_MS);
    return () => clearInterval(timer);
  }, [user, currentView, refreshUnreadMessages]);

  // Arriving from an email link while logged out: ask them to log in first
  useEffect(() => {
    if (!checkingSession && !user && currentView === "messages") {
      setAuthModal({ isOpen: true, mode: "login" });
    }
  }, [checkingSession, user, currentView]);

  function openConversation(listingId, otherUserId) {
    setMessageTarget({ listingId, otherUserId });
    setCurrentView("messages");
  }

  // Handle successful user login
  function handleLogin(loggedInUser) {
    setUser(loggedInUser);
    setAuthModal({ isOpen: false, mode: "login" });
    setError("");
    setVerifyNotice(null);
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
      setMessageTarget(null);
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
        unreadMessages={unreadMessages}
      />

      {/* Main Content View Area */}
      <main className="container mx-auto px-4 py-6 flex-1">
        {error && <p className="text-red-600 text-center mb-4">{error}</p>}

        {verifyNotice && (
          <div
            className={`max-w-md mx-auto mb-4 p-3 border-l-4 text-sm rounded ${
              verifyNotice.ok
                ? "bg-green-50 border-green-500 text-green-700"
                : "bg-red-50 border-red-500 text-red-700"
            }`}
          >
            {verifyNotice.text}
          </div>
        )}

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

            {/* Books & Favourites Views (US-03 & US-05) */}
            {(currentView === "books" || currentView === "favourites") && (
              <ListingsView
                user={user}
                favouritesOnly={currentView === "favourites"}
                onOpenAuth={(mode) => setAuthModal({ isOpen: true, mode })}
                onCreateListing={() =>
                  user
                    ? setCurrentView("create-listing")
                    : setAuthModal({ isOpen: true, mode: "login" })
                }
                onOpenMessages={openConversation}
              />
            )}

            {/* In-app Messages (US-09) */}
            {currentView === "messages" && user && (
              <MessagesView
                key={
                  messageTarget
                    ? `${messageTarget.listingId}:${messageTarget.otherUserId}`
                    : "inbox"
                }
                user={user}
                initialConversation={messageTarget}
                onUnreadChange={refreshUnreadMessages}
              />
            )}

            {/* Seller Listing Management (US-07) */}
            {currentView === "my-listings" && user && (
              <MyListingsView
                onCreateListing={() => setCurrentView("create-listing")}
              />
            )}

            {/* Authenticated Create Listing Form */}
            {currentView === "create-listing" && user && (
              <div className="max-w-2xl mx-auto bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <CreateListingForm
                  sellerId={user.id}
                  onSuccess={(data) => {
                    alert(`Listing created successfully! ID: ${data.id}`);
                    setCurrentView("books");
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

            {currentView === "admin-taxonomy" &&
              user &&
              user.role === "admin" && (
                <AdminTaxonomyDashboard currentUser={user} />
              )}

            {currentView === "admin-analytics" &&
              user &&
              user.role === "admin" && (
                <AdminAnalyticsDashboard currentUser={user} />
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
