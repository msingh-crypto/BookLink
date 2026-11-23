import React, { useCallback, useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";

// US-09: In-app inbox and conversation threads

const MAX_LENGTH = 2000;
const POLL_MS = 15000;

const conversationKey = (listingId, otherUserId) =>
  `${listingId}:${otherUserId}`;

function formatTime(iso) {
  if (!iso) return "";
  const date = new Date(iso);
  const sameDay = date.toDateString() === new Date().toDateString();
  return sameDay
    ? date.toLocaleTimeString("en-CA", { hour: "numeric", minute: "2-digit" })
    : date.toLocaleDateString("en-CA", { month: "short", day: "numeric" });
}

function ConversationItem({ conversation, selected, onSelect }) {
  const unread = conversation.unreadCount > 0;

  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(conversation)}
        aria-current={selected ? "true" : undefined}
        className={`w-full text-left px-4 py-3 border-b border-slate-100 transition ${
          selected ? "bg-blue-50" : "hover:bg-slate-50"
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <span
            className={`text-sm truncate ${unread ? "font-bold text-slate-900" : "font-medium text-slate-800"}`}
          >
            {conversation.otherUser.name}
          </span>
          <span className="text-xs text-slate-400 shrink-0">
            {formatTime(conversation.lastMessageAt)}
          </span>
        </div>
        <p className="text-xs text-blue-700 truncate">
          {conversation.listingTitle}
          {conversation.listingStatus !== "active" &&
            ` · ${conversation.listingStatus}`}
        </p>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <p
            className={`text-xs truncate ${unread ? "text-slate-800" : "text-slate-500"}`}
          >
            {conversation.lastMessageFromMe ? "You: " : ""}
            {conversation.lastMessage}
          </p>
          {unread && (
            <span
              aria-label={`${conversation.unreadCount} unread`}
              className="shrink-0 min-w-5 h-5 px-1.5 rounded-full bg-blue-600 text-white text-xs font-semibold flex items-center justify-center"
            >
              {conversation.unreadCount}
            </span>
          )}
        </div>
      </button>
    </li>
  );
}

ConversationItem.propTypes = {
  conversation: PropTypes.object.isRequired,
  selected: PropTypes.bool,
  onSelect: PropTypes.func.isRequired,
};

export default function MessagesView({
  user,
  initialConversation,
  onUnreadChange,
}) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedKey, setSelectedKey] = useState(
    initialConversation
      ? conversationKey(
          initialConversation.listingId,
          initialConversation.otherUserId,
        )
      : null,
  );
  const [messages, setMessages] = useState([]);
  const [threadLoading, setThreadLoading] = useState(false);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const threadEndRef = useRef(null);

  const selected = conversations.find(
    (c) => conversationKey(c.listingId, c.otherUser.id) === selectedKey,
  );

  const loadConversations = useCallback(async (signal, { quiet } = {}) => {
    if (!quiet) setLoading(true);
    try {
      const response = await fetch("/api/messages/conversations", {
        credentials: "include",
        signal,
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to load your messages.");
      }
      setConversations(data.conversations || []);
      if (!quiet) setError("");
    } catch (err) {
      if (err.name !== "AbortError" && !quiet) {
        setError(err.message || "Unable to connect to the server.");
      }
    } finally {
      if (!signal?.aborted && !quiet) setLoading(false);
    }
  }, []);

  // Opening a thread also marks it read on the server
  const loadThread = useCallback(
    async (listingId, otherUserId, { quiet } = {}) => {
      if (!quiet) setThreadLoading(true);
      try {
        const response = await fetch(
          `/api/messages/conversations/${listingId}/${otherUserId}`,
          { credentials: "include" },
        );
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Failed to load this conversation.");
        }
        setMessages(data.messages || []);
        setConversations((prev) =>
          prev.map((c) =>
            c.listingId === listingId && c.otherUser.id === otherUserId
              ? { ...c, unreadCount: 0 }
              : c,
          ),
        );
        if (onUnreadChange) onUnreadChange();
      } catch (err) {
        if (!quiet) setError(err.message || "Unable to connect to the server.");
      } finally {
        if (!quiet) setThreadLoading(false);
      }
    },
    [onUnreadChange],
  );

  useEffect(() => {
    const controller = new AbortController();
    void loadConversations(controller.signal);
    return () => controller.abort();
  }, [loadConversations]);

  // Load the thread when a conversation is picked
  const selectedListingId = selected?.listingId;
  const selectedOtherId = selected?.otherUser.id;
  useEffect(() => {
    if (selectedListingId && selectedOtherId) {
      void loadThread(selectedListingId, selectedOtherId);
    }
  }, [selectedListingId, selectedOtherId, loadThread]);

  // Check for new messages while the inbox is open
  useEffect(() => {
    const timer = setInterval(() => {
      void loadConversations(undefined, { quiet: true });
      if (selectedListingId && selectedOtherId) {
        void loadThread(selectedListingId, selectedOtherId, { quiet: true });
      }
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [loadConversations, loadThread, selectedListingId, selectedOtherId]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView?.({ block: "end" });
  }, [messages]);

  async function handleSend(event) {
    event.preventDefault();
    const text = reply.trim();
    if (!text || !selected) return;

    setSending(true);
    setError("");
    try {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          listingId: selected.listingId,
          receiverId: selected.otherUser.id,
          body: text,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Unable to send your message.");
      }

      setMessages((prev) => [...prev, data.message]);
      // Move this conversation to the top with its new last message
      setConversations((prev) => {
        const isThis = (c) =>
          conversationKey(c.listingId, c.otherUser.id) === selectedKey;
        const current = prev.find(isThis);
        if (!current) return prev;
        return [
          {
            ...current,
            lastMessage: data.message.message_body,
            lastMessageAt: data.message.created_at,
            lastMessageFromMe: true,
          },
          ...prev.filter((c) => !isThis(c)),
        ];
      });
      setReply("");
    } catch (err) {
      setError(err.message || "Unable to send your message.");
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="max-w-5xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Messages</h2>
          <p className="text-sm text-slate-500">
            Private conversations about your listings and the books you want.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            void loadConversations();
            if (selected)
              void loadThread(selected.listingId, selected.otherUser.id);
          }}
          disabled={loading}
          className="px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-md shadow-sm hover:bg-slate-50 disabled:opacity-50"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm rounded"
        >
          {error}
        </div>
      )}

      {loading && (
        <p className="text-center text-slate-500 py-12">Loading messages...</p>
      )}

      {!loading && conversations.length === 0 && !error && (
        <div className="text-center py-12 bg-white rounded-lg border border-dashed border-slate-300">
          <p className="text-slate-600">No messages yet.</p>
          <p className="text-sm text-slate-500 mt-1">
            Open a listing and use “Message Seller” to start a conversation.
          </p>
        </div>
      )}

      {!loading && conversations.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-[18rem_1fr] bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden min-h-[28rem]">
          <ul
            aria-label="Conversations"
            className="border-b md:border-b-0 md:border-r border-slate-200 max-h-[28rem] overflow-y-auto"
          >
            {conversations.map((c) => (
              <ConversationItem
                key={conversationKey(c.listingId, c.otherUser.id)}
                conversation={c}
                selected={
                  conversationKey(c.listingId, c.otherUser.id) === selectedKey
                }
                onSelect={(conv) =>
                  setSelectedKey(
                    conversationKey(conv.listingId, conv.otherUser.id),
                  )
                }
              />
            ))}
          </ul>

          {!selected ? (
            <div className="flex items-center justify-center p-8 text-sm text-slate-500">
              Select a conversation to read it.
            </div>
          ) : (
            <div className="flex flex-col min-h-[28rem]">
              <header className="px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="font-semibold text-slate-900 truncate">
                    {selected.otherUser.name}
                    <span className="ml-2 text-xs font-normal text-slate-500">
                      {selected.isSeller ? "Buyer" : "Seller"}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 truncate">
                    About {selected.listingTitle}
                  </p>
                </div>
                <a
                  href={`mailto:${selected.otherUser.email}?subject=${encodeURIComponent(`BookLink: ${selected.listingTitle}`)}`}
                  className="text-xs text-blue-700 hover:underline"
                >
                  Email {selected.otherUser.email}
                </a>
              </header>

              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 max-h-[22rem] bg-slate-50">
                {threadLoading && messages.length === 0 && (
                  <p className="text-center text-sm text-slate-500 py-6">
                    Loading conversation...
                  </p>
                )}
                {messages.map((m) => {
                  const mine = m.sender_id === user.id;
                  return (
                    <div
                      key={m.id}
                      className={`flex ${mine ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] px-3 py-2 rounded-lg text-sm shadow-sm ${
                          mine
                            ? "bg-blue-600 text-white"
                            : "bg-white text-slate-800 border border-slate-200"
                        }`}
                      >
                        <p className="whitespace-pre-line break-words">
                          {m.message_body}
                        </p>
                        <p
                          className={`mt-1 text-[11px] ${mine ? "text-blue-100" : "text-slate-400"}`}
                        >
                          {formatTime(m.created_at)}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={threadEndRef} />
              </div>

              <form
                onSubmit={handleSend}
                className="border-t border-slate-200 p-3 flex gap-2"
              >
                <label htmlFor="message-reply" className="sr-only">
                  Reply to {selected.otherUser.name}
                </label>
                <textarea
                  id="message-reply"
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  maxLength={MAX_LENGTH}
                  rows={2}
                  placeholder={`Reply to ${selected.otherUser.name}...`}
                  className="flex-1 px-3 py-2 text-sm bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  disabled={sending || !reply.trim()}
                  className="self-end px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-md disabled:opacity-50"
                >
                  {sending ? "Sending..." : "Send"}
                </button>
              </form>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

MessagesView.propTypes = {
  user: PropTypes.shape({ id: PropTypes.string.isRequired }).isRequired,
  initialConversation: PropTypes.shape({
    listingId: PropTypes.string.isRequired,
    otherUserId: PropTypes.string.isRequired,
  }),
  onUnreadChange: PropTypes.func,
};
