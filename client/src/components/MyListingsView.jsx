import React, { useCallback, useEffect, useState } from "react";
import PropTypes from "prop-types";
import { formatPrice } from "./ListingsView";

// US-07: Seller listing management

const STATUS_STYLES = {
  active: "bg-green-100 text-green-800",
  sold: "bg-blue-100 text-blue-800",
  removed: "bg-slate-200 text-slate-700",
};

const STATUS_LABELS = {
  active: "Active",
  sold: "Sold",
  removed: "Removed",
};

// The action shown for moving a listing into each status
const STATUS_ACTIONS = [
  {
    status: "active",
    label: "Mark active",
    className:
      "bg-white border-green-300 text-green-700 hover:bg-green-50 focus:ring-green-500",
  },
  {
    status: "sold",
    label: "Mark sold",
    className:
      "bg-white border-blue-300 text-blue-700 hover:bg-blue-50 focus:ring-blue-500",
  },
  {
    status: "removed",
    label: "Remove",
    className:
      "bg-white border-red-300 text-red-700 hover:bg-red-50 focus:ring-red-500",
  },
];

const FILTERS = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "sold", label: "Sold" },
  { value: "removed", label: "Removed" },
];

function StatusBadge({ status }) {
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
        STATUS_STYLES[status] || "bg-slate-100 text-slate-700"
      }`}
    >
      {STATUS_LABELS[status] || status}
    </span>
  );
}

StatusBadge.propTypes = {
  status: PropTypes.string.isRequired,
};

function MyListingRow({ listing, updating, onChangeStatus }) {
  const photo = listing.photos?.[0];

  return (
    <li className="flex flex-col sm:flex-row sm:items-center gap-4 bg-white rounded-lg shadow-sm border border-slate-200 p-4">
      {photo ? (
        <img
          src={photo}
          alt={listing.title}
          className="w-full sm:w-20 h-32 sm:h-20 object-cover rounded"
        />
      ) : (
        <div className="w-full sm:w-20 h-32 sm:h-20 flex items-center justify-center bg-slate-100 text-slate-400 text-xs rounded">
          No photo
        </div>
      )}

      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold text-slate-900 leading-snug">
            {listing.title}
          </h3>
          <StatusBadge status={listing.status} />
        </div>
        <p className="text-sm text-slate-600">
          {listing.course_code}
          {listing.edition ? ` · ${listing.edition}` : ""}
          {" · "}
          <span className="font-semibold text-blue-700">
            {formatPrice(listing.price)}
          </span>
        </p>
        {listing.removed_by_moderator && (
          <p className="text-xs text-red-700">
            Removed by a moderator. This listing can&apos;t be changed.
          </p>
        )}
      </div>

      {!listing.removed_by_moderator && (
        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-label={`Change status of ${listing.title}`}
        >
          {STATUS_ACTIONS.filter(
            (action) => action.status !== listing.status,
          ).map((action) => (
            <button
              key={action.status}
              type="button"
              onClick={() => onChangeStatus(listing, action.status)}
              disabled={updating}
              className={`px-3 py-1.5 text-sm font-medium border rounded-md shadow-sm focus:outline-none focus:ring-2 disabled:opacity-50 transition ${action.className}`}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </li>
  );
}

MyListingRow.propTypes = {
  listing: PropTypes.object.isRequired,
  updating: PropTypes.bool,
  onChangeStatus: PropTypes.func.isRequired,
};

export default function MyListingsView({ onCreateListing }) {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [updatingId, setUpdatingId] = useState(null);

  const loadListings = useCallback(async (signal) => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/listings/mine", {
        credentials: "include",
        signal,
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load your listings.");
      }

      setListings(data.listings || []);
    } catch (err) {
      if (err.name !== "AbortError") {
        setError(err.message || "Unable to connect to the server.");
      }
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadListings(controller.signal);
    return () => controller.abort();
  }, [loadListings]);

  async function handleChangeStatus(listing, status) {
    setUpdatingId(listing.id);
    setError("");
    try {
      const response = await fetch(`/api/listings/${listing.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "Failed to update the listing.");
      }

      setListings((prev) =>
        prev.map((item) =>
          item.id === listing.id
            ? { ...item, status: data.status || status }
            : item,
        ),
      );
    } catch (err) {
      setError(err.message || "Unable to update the listing.");
    } finally {
      setUpdatingId(null);
    }
  }

  const counts = listings.reduce(
    (acc, item) => ({ ...acc, [item.status]: (acc[item.status] || 0) + 1 }),
    { all: listings.length },
  );

  const visible =
    filter === "all"
      ? listings
      : listings.filter((item) => item.status === filter);

  return (
    <section className="max-w-4xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">My Listings</h2>
          {!loading && !error && (
            <p className="text-sm text-slate-500">
              {counts.active || 0} active · {counts.sold || 0} sold ·{" "}
              {counts.removed || 0} removed
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {onCreateListing && (
            <button
              type="button"
              onClick={onCreateListing}
              className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md shadow-sm"
            >
              + Sell Book
            </button>
          )}
          <button
            type="button"
            onClick={() => void loadListings()}
            disabled={loading}
            className="px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-md shadow-sm hover:bg-slate-50 disabled:opacity-50"
          >
            Refresh
          </button>
        </div>
      </div>

      {listings.length > 0 && (
        <div
          className="mb-4 flex flex-wrap gap-2"
          role="tablist"
          aria-label="Filter by status"
        >
          {FILTERS.map((option) => (
            <button
              key={option.value}
              type="button"
              role="tab"
              aria-selected={filter === option.value}
              onClick={() => setFilter(option.value)}
              className={`px-3 py-1.5 text-sm rounded-md border transition ${
                filter === option.value
                  ? "bg-slate-900 border-slate-900 text-white"
                  : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
              }`}
            >
              {option.label} ({counts[option.value] || 0})
            </button>
          ))}
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm rounded"
        >
          {error}
        </div>
      )}

      {loading && (
        <p className="text-center text-slate-500 py-12">
          Loading your listings...
        </p>
      )}

      {!loading && !error && listings.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg border border-dashed border-slate-300">
          <p className="text-slate-600 mb-4">
            You haven&apos;t listed any textbooks yet.
          </p>
          {onCreateListing && (
            <button
              type="button"
              onClick={onCreateListing}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm"
            >
              List your first book
            </button>
          )}
        </div>
      )}

      {!loading && listings.length > 0 && visible.length === 0 && (
        <p className="text-center text-slate-500 py-12 bg-white rounded-lg border border-dashed border-slate-300">
          No {STATUS_LABELS[filter]?.toLowerCase()} listings.
        </p>
      )}

      {!loading && visible.length > 0 && (
        <ul className="space-y-3">
          {visible.map((listing) => (
            <MyListingRow
              key={listing.id}
              listing={listing}
              updating={updatingId === listing.id}
              onChangeStatus={handleChangeStatus}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

MyListingsView.propTypes = {
  onCreateListing: PropTypes.func,
};
