import React from "react";
import PropTypes from "prop-types";

export default function AuthModal({
  isOpen,
  mode,
  onClose,
  setMode,
  children,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 sm:p-8">
        {/* Close Modal Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 text-xl font-bold p-1 rounded-full"
        >
          ✕
        </button>

        {/* Tab Switcher inside Modal */}
        <div className="flex border-b border-slate-200 mb-6">
          <button
            onClick={() => setMode("login")}
            className={`flex-1 pb-3 text-center text-sm font-semibold border-b-2 transition-colors ${
              mode === "login"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            Login
          </button>
          <button
            onClick={() => setMode("register")}
            className={`flex-1 pb-3 text-center text-sm font-semibold border-b-2 transition-colors ${
              mode === "register"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Render Register or Login view */}
        {children}
      </div>
    </div>
  );
}

AuthModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  mode: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
  setMode: PropTypes.func.isRequired,
  children: PropTypes.node,
};
