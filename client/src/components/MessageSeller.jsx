import React, { useState } from "react";
import PropTypes from "prop-types";

const MAX_LENGTH = 2000;

// US-09: Start a private conversation with a listing's seller
export default function MessageSeller({
  listing,
  user,
  onOpenAuth,
  onOpenConversation,
}) {
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  // Sellers don't message themselves
  if (user && user.id === listing.seller_id) {
    return null;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const text = body.trim();
    if (!text) {
      setError("Write a message first.");
      return;
    }

    setSending(true);
    setError("");
    try {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ listingId: listing.id, body: text }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "Unable to send your message.");
      }

      setSent(true);
      setOpen(false);
      setBody("");
    } catch (err) {
      setError(err.message || "Unable to send your message.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 mt-4">
      <h4 className="text-sm font-semibold text-slate-700 mb-2">
        Message the Seller
      </h4>

      {!user && (
        <div className="flex flex-col items-start gap-2">
          <p className="text-xs text-slate-500">
            Log in with your Lakehead account to message the seller.
          </p>
          <button
            type="button"
            onClick={() => onOpenAuth && onOpenAuth("login")}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-sm transition"
          >
            Log in to message
          </button>
        </div>
      )}

      {user && sent && (
        <div
          role="status"
          className="mb-3 p-3 bg-green-50 border-l-4 border-green-500 text-green-700 text-xs rounded"
        >
          Message sent. The seller gets an email at their Lakehead address and
          can reply here or by email.
          {onOpenConversation && (
            <button
              type="button"
              onClick={() => onOpenConversation(listing.id, listing.seller_id)}
              className="block mt-2 font-semibold text-green-800 underline"
            >
              View conversation
            </button>
          )}
        </div>
      )}

      {user && !open && (
        <div className="flex flex-col items-start gap-2">
          {!sent && (
            <p className="text-xs text-slate-500">
              Ask a question or arrange a meetup without sharing your phone
              number.
            </p>
          )}
          <button
            type="button"
            onClick={() => {
              setOpen(true);
              setError("");
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-sm transition"
          >
            {sent ? "Send another message" : "Message Seller"}
          </button>
        </div>
      )}

      {user && open && (
        <form onSubmit={handleSubmit} className="space-y-2">
          <label htmlFor={`message-${listing.id}`} className="sr-only">
            Message to the seller
          </label>
          <textarea
            id={`message-${listing.id}`}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={MAX_LENGTH}
            rows={3}
            placeholder={`Hi! Is "${listing.title}" still available?`}
            className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-slate-400">
              {body.length}/{MAX_LENGTH}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setError("");
                }}
                className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={sending}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-md shadow-sm disabled:opacity-50"
              >
                {sending ? "Sending..." : "Send"}
              </button>
            </div>
          </div>
        </form>
      )}

      {error && (
        <p role="alert" className="mt-2 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

MessageSeller.propTypes = {
  listing: PropTypes.shape({
    id: PropTypes.string.isRequired,
    seller_id: PropTypes.string.isRequired,
    title: PropTypes.string,
  }).isRequired,
  user: PropTypes.object,
  onOpenAuth: PropTypes.func,
  onOpenConversation: PropTypes.func,
};
