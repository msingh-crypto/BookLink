import React from "react";
import PropTypes from "prop-types";

export default function Navbar({
  user,
  onOpenAuth,
  onLogout,
  currentView,
  setCurrentView,
}) {
  return (
    <header className="bg-slate-900 text-white shadow-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo / Home Link */}
        <div
          onClick={() => setCurrentView("home")}
          className="flex items-center gap-2 cursor-pointer"
        >
          <span className="text-xl font-bold tracking-tight text-white">
            BookLink
          </span>
          <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full font-medium">
            Lakehead
          </span>
        </div>

        {/* Navigation Links */}
        <nav className="flex items-center gap-6">
          <button
            onClick={() => setCurrentView("home")}
            className={`text-sm font-medium transition-colors ${currentView === "home" ? "text-blue-400" : "text-slate-300 hover:text-white"}`}
          >
            Home
          </button>
          <button
            onClick={() => setCurrentView("books")}
            className={`text-sm font-medium transition-colors ${currentView === "books" ? "text-blue-400" : "text-slate-300 hover:text-white"}`}
          >
            Books
          </button>

          {/* Show Create Listing option if logged in */}
          {user && (
            <button
              onClick={() => setCurrentView("create-listing")}
              className={`text-sm font-medium transition-colors ${currentView === "create-listing" ? "text-blue-400" : "text-slate-300 hover:text-white"}`}
            >
              + Sell Book
            </button>
          )}

          {/* Show Moderation Console button for Admin or Moderator roles */}
          {user && (user.role === "admin" || user.role === "moderator") && (
            <button
              onClick={() => setCurrentView("moderation")}
              className={`text-sm font-medium transition-colors ${currentView === "moderation" ? "text-amber-400 font-semibold" : "text-slate-300 hover:text-amber-300"}`}
            >
              Moderation
            </button>
          )}

          {/* Dynamic Auth Section */}
          <div className="flex items-center gap-3 pl-4 border-l border-slate-700">
            {user ? (
              <>
                <span className="text-xs text-slate-300">
                  Hi,{" "}
                  <strong className="text-white">
                    {user.first_name ||
                      (user.email ? user.email.split("@")[0] : "")}
                  </strong>
                </span>
                <button
                  onClick={onLogout}
                  className="text-xs px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => onOpenAuth("login")}
                  className="text-sm font-medium text-slate-200 hover:text-white px-3 py-1.5 transition"
                >
                  Login
                </button>
                <button
                  onClick={() => onOpenAuth("register")}
                  className="text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded-lg shadow-sm transition"
                >
                  Register
                </button>
              </>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}

Navbar.propTypes = {
  user: PropTypes.shape({
    id: PropTypes.string,
    email: PropTypes.string,
    role: PropTypes.string,
    first_name: PropTypes.string,
  }),
  onOpenAuth: PropTypes.func.isRequired,
  onLogout: PropTypes.func.isRequired,
  currentView: PropTypes.string.isRequired,
  setCurrentView: PropTypes.func.isRequired,
};
