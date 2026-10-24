import React, { useState } from "react";
import PropTypes from "prop-types";

export default function SellerContact({ listingId, user, onOpenAuth }) {
  const [email, setEmail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Handle clicking "Show Contact Info"
  const handleRevealContact = async () => {
    // If not logged in, trigger auth modal prompt
    if (!user) {
      if (onOpenAuth) onOpenAuth("login");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `http://localhost:5001/api/listings/${listingId}/contact`,
        {
          credentials: "include",
        },
      );

      if (!response.ok) {
        throw new Error("Unable to retrieve seller contact information.");
      }

      const data = await response.json();
      setEmail(data.email);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 mt-4">
      <h4 className="text-sm font-semibold text-slate-700 mb-2">
        Seller Contact
      </h4>

      {/* Unauthenticated View / Initial Masked State */}
      {!email && (
        <div className="flex flex-col items-start gap-2">
          <p className="text-xs text-slate-500">
            {user
              ? "Contact email is protected against scrapers."
              : "Log in with your Lakehead account to contact the seller."}
          </p>

          <button
            onClick={handleRevealContact}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-sm transition disabled:opacity-50"
          >
            {loading
              ? "Fetching..."
              : user
                ? "Show Contact Info"
                : "Log in to view contact info"}
          </button>

          {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
        </div>
      )}

      {/* Authenticated Revealed Email State */}
      {email && (
        <div className="flex items-center gap-2 text-sm text-slate-800">
          <span className="text-lg">✉️</span>
          <a
            href={`mailto:${email}`}
            className="font-medium text-blue-600 hover:underline cursor-pointer"
          >
            {email}
          </a>
        </div>
      )}
    </div>
  );
}

SellerContact.propTypes = {
  listingId: PropTypes.string.isRequired,
  user: PropTypes.shape({
    id: PropTypes.string,
    email: PropTypes.string,
  }),
  onOpenAuth: PropTypes.func,
};
