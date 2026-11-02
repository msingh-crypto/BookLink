import React, { useCallback, useEffect, useState } from "react";
import PropTypes from "prop-types";
import SellerContact from "./SellerContact";

const PAGE_SIZE = 20;

const CONDITION_STYLES = {
  New: "bg-emerald-100 text-emerald-800",
  "Like New": "bg-green-100 text-green-800",
  Good: "bg-blue-100 text-blue-800",
  Fair: "bg-amber-100 text-amber-800",
  Poor: "bg-red-100 text-red-800",
};

const priceFormatter = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
});

export function formatPrice(price) {
  const value = Number(price);
  if (Number.isNaN(value)) return "";
  return value === 0 ? "Free" : priceFormatter.format(value);
}

function formatDate(isoString) {
  if (!isoString) return "";
  return new Date(isoString).toLocaleDateString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function ConditionBadge({ condition }) {
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
        CONDITION_STYLES[condition] || "bg-slate-100 text-slate-700"
      }`}
    >
      {condition}
    </span>
  );
}

ConditionBadge.propTypes = {
  condition: PropTypes.string.isRequired,
};

function BookPhoto({ src, alt, className }) {
  if (!src) {
    return (
      <div
        className={`flex items-center justify-center bg-slate-100 text-slate-400 text-sm ${className}`}
      >
        No photo
      </div>
    );
  }
  return <img src={src} alt={alt} className={`object-cover ${className}`} />;
}

BookPhoto.propTypes = {
  src: PropTypes.string,
  alt: PropTypes.string.isRequired,
  className: PropTypes.string,
};

function ListingCard({ listing, onSelect, isFavourited, onToggleFavourite }) {
  return (
    <li className="relative">
      <button
        type="button"
        onClick={() => onSelect(listing)}
        className="flex flex-col w-full h-full text-left bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden hover:shadow-md hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
      >
        <BookPhoto
          src={listing.photos?.[0]}
          alt={listing.title}
          className="w-full h-40"
        />
        <div className="p-4 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-slate-900 leading-snug">
              {listing.title}
            </h3>
            <span className="font-bold text-blue-700 whitespace-nowrap">
              {formatPrice(listing.price)}
            </span>
          </div>
          <p className="text-sm text-slate-600">
            {listing.course_code}
            {listing.edition ? ` · ${listing.edition}` : ""}
          </p>
          <div className="flex items-center justify-between gap-2">
            <ConditionBadge condition={listing.condition} />
            <span className="text-xs text-slate-500">
              {listing.meetup_zone}
            </span>
          </div>
        </div>
      </button>

      {onToggleFavourite && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavourite(listing);
          }}
          aria-label={
            isFavourited ? "Remove from favourites" : "Add to favourites"
          }
          aria-pressed={isFavourited}
          className={`absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center shadow-sm border transition ${
            isFavourited
              ? "bg-red-50 border-red-200 text-red-600 hover:bg-red-100"
              : "bg-white/90 border-slate-200 text-slate-500 hover:text-red-500 hover:bg-white"
          }`}
        >
          {isFavourited ? "♥" : "♡"}
        </button>
      )}
    </li>
  );
}

ListingCard.propTypes = {
  listing: PropTypes.object.isRequired,
  onSelect: PropTypes.func.isRequired,
  isFavourited: PropTypes.bool,
  onToggleFavourite: PropTypes.func,
};

function ListingDetail({
  listing,
  user,
  onOpenAuth,
  onBack,
  isFavourited,
  onToggleFavourite,
}) {
  const [activePhoto, setActivePhoto] = useState(0);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-blue-700 hover:underline"
        >
          ← Back to listings
        </button>

        {onToggleFavourite && (
          <button
            type="button"
            onClick={() => onToggleFavourite(listing)}
            aria-label={
              isFavourited ? "Remove from favourites" : "Add to favourites"
            }
            aria-pressed={isFavourited}
            className={`px-3 py-1.5 rounded-md text-sm font-medium border transition flex items-center gap-1.5 ${
              isFavourited
                ? "bg-red-50 border-red-200 text-red-600 hover:bg-red-100"
                : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
            }`}
          >
            <span>{isFavourited ? "♥" : "♡"}</span>
            <span>{isFavourited ? "Saved in Favourites" : "Favourite"}</span>
          </button>
        )}
      </div>

      <article className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <BookPhoto
          src={listing.photos?.[activePhoto]}
          alt={listing.title}
          className="w-full h-72"
        />

        {listing.photos && listing.photos.length > 1 && (
          <div className="flex gap-2 p-3 border-b border-slate-200 overflow-x-auto">
            {listing.photos.map((url, index) => (
              <button
                key={url}
                type="button"
                onClick={() => setActivePhoto(index)}
                aria-label={`Show photo ${index + 1}`}
                className={`shrink-0 rounded border-2 ${
                  index === activePhoto
                    ? "border-blue-600"
                    : "border-transparent"
                }`}
              >
                <img src={url} alt="" className="w-16 h-16 object-cover" />
              </button>
            ))}
          </div>
        )}

        <div className="p-6 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h2 className="text-2xl font-bold text-slate-900">
              {listing.title}
            </h2>
            <span className="text-2xl font-bold text-blue-700">
              {formatPrice(listing.price)}
            </span>
          </div>

          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div>
              <dt className="text-slate-500">Course code</dt>
              <dd className="font-medium text-slate-800">
                {listing.course_code}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Condition</dt>
              <dd>
                <ConditionBadge condition={listing.condition} />
              </dd>
            </div>
            {listing.edition && (
              <div>
                <dt className="text-slate-500">Edition</dt>
                <dd className="font-medium text-slate-800">
                  {listing.edition}
                </dd>
              </div>
            )}
            {listing.isbn && (
              <div>
                <dt className="text-slate-500">ISBN</dt>
                <dd className="font-medium text-slate-800">{listing.isbn}</dd>
              </div>
            )}
            {listing.category_name && (
              <div>
                <dt className="text-slate-500">Department</dt>
                <dd className="font-medium text-slate-800">
                  {listing.category_name}
                </dd>
              </div>
            )}
            <div>
              <dt className="text-slate-500">Meetup zone</dt>
              <dd className="font-medium text-slate-800">
                {listing.meetup_zone}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Posted</dt>
              <dd className="font-medium text-slate-800">
                {formatDate(listing.created_at)}
              </dd>
            </div>
          </dl>

          {listing.description && (
            <div>
              <h3 className="text-sm text-slate-500 mb-1">Description</h3>
              <p className="text-slate-800 whitespace-pre-line">
                {listing.description}
              </p>
            </div>
          )}

          <div className="pt-4 border-t border-slate-200">
            <SellerContact
              listingId={listing.id}
              user={user}
              onOpenAuth={onOpenAuth}
            />
          </div>
        </div>
      </article>
    </div>
  );
}

ListingDetail.propTypes = {
  listing: PropTypes.object.isRequired,
  user: PropTypes.object,
  onOpenAuth: PropTypes.func,
  onBack: PropTypes.func.isRequired,
  isFavourited: PropTypes.bool,
  onToggleFavourite: PropTypes.func,
};

export default function ListingsView({
  user,
  favouritesOnly = false,
  onOpenAuth,
  onCreateListing,
}) {
  const [listings, setListings] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const [sorting, setSorting] = useState("newest-desc");

  // US-03: Search input and debounced query
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // US-05: Track favourited listing IDs for the current user
  const [favouriteIds, setFavouriteIds] = useState(() => new Set());

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const fetchFavourites = useCallback(async (signal) => {
    const response = await fetch("/api/favourites", {
      credentials: "include",
      signal,
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Failed to load favourites.");
    }
    return data;
  }, []);

  const fetchPage = useCallback(
    async (offset, signal) => {
      const [sortBy, sortOrder] = sorting.split("-");
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(offset),
        sortBy,
        sortOrder,
      });

      if (debouncedSearch) {
        params.set("search", debouncedSearch);
      }

      const response = await fetch(`/api/listings?${params.toString()}`, {
        credentials: "include",
        signal,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load listings.");
      }

      return data;
    },
    [sorting, debouncedSearch],
  );

  const loadFirstPage = useCallback(
    async (signal) => {
      setLoading(true);
      setError("");
      try {
        if (favouritesOnly) {
          if (!user) {
            setListings([]);
            setTotal(0);
            return;
          }
          const favData = await fetchFavourites(signal);
          const allFavs = favData.listings || [];
          setFavouriteIds(new Set(allFavs.map((item) => item.id)));

          const filtered = debouncedSearch
            ? allFavs.filter((item) => {
                const q = debouncedSearch.toLowerCase();
                const normQ = q.replace(/[-\s]/g, "");
                const normIsbn = (item.isbn || "")
                  .toLowerCase()
                  .replace(/[-\s]/g, "");
                return (
                  (item.title || "").toLowerCase().includes(q) ||
                  (item.course_code || "").toLowerCase().includes(q) ||
                  (normQ && normIsbn.includes(normQ))
                );
              })
            : allFavs;

          setListings(filtered);
          setTotal(filtered.length);
        } else {
          const data = await fetchPage(0, signal);
          setListings(data.listings);
          setTotal(data.total);

          if (user) {
            try {
              const favData = await fetchFavourites(signal);
              setFavouriteIds(
                new Set(
                  favData.favouriteIds ||
                    (favData.listings || []).map((item) => item.id),
                ),
              );
            } catch {
              // Ignore secondary favourites fetch errors on public browse
            }
          } else {
            setFavouriteIds(new Set());
          }
        }
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(err.message || "Unable to connect to the server.");
        }
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [favouritesOnly, user, debouncedSearch, fetchFavourites, fetchPage],
  );

  useEffect(() => {
    const controller = new AbortController();
    void loadFirstPage(controller.signal);
    return () => controller.abort();
  }, [loadFirstPage]);

  async function handleLoadMore() {
    setLoadingMore(true);
    setError("");
    try {
      const data = await fetchPage(listings.length);
      setListings((prev) => {
        const seen = new Set(prev.map((l) => l.id));
        return [...prev, ...data.listings.filter((l) => !seen.has(l.id))];
      });
      setTotal(data.total);
    } catch (err) {
      setError(err.message || "Unable to connect to the server.");
    } finally {
      setLoadingMore(false);
    }
  }

  async function handleToggleFavourite(listing) {
    if (!user) {
      if (onOpenAuth) {
        onOpenAuth("login");
      }
      return;
    }

    const listingId = listing.id;
    const currentlyFavourited = favouriteIds.has(listingId);

    // Optimistic UI update
    setFavouriteIds((prev) => {
      const next = new Set(prev);
      if (currentlyFavourited) {
        next.delete(listingId);
      } else {
        next.add(listingId);
      }
      return next;
    });

    if (favouritesOnly && currentlyFavourited) {
      setListings((prev) => prev.filter((item) => item.id !== listingId));
      setTotal((prev) => Math.max(0, prev - 1));
    }

    try {
      const response = await fetch(`/api/favourites/${listingId}`, {
        method: currentlyFavourited ? "DELETE" : "POST",
        credentials: "include",
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update favourites.");
      }
    } catch (err) {
      // Revert on failure
      setFavouriteIds((prev) => {
        const reverted = new Set(prev);
        if (currentlyFavourited) {
          reverted.add(listingId);
        } else {
          reverted.delete(listingId);
        }
        return reverted;
      });
      if (favouritesOnly && currentlyFavourited) {
        void loadFirstPage();
      }
      setError(err.message || "Unable to update favourites.");
    }
  }

  if (selected) {
    return (
      <ListingDetail
        listing={selected}
        user={user}
        onOpenAuth={onOpenAuth}
        onBack={() => setSelected(null)}
        isFavourited={favouriteIds.has(selected.id)}
        onToggleFavourite={handleToggleFavourite}
      />
    );
  }

  return (
    <section className="max-w-6xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            {favouritesOnly ? "Saved Favourites" : "Current Listings"}
          </h2>
          {!loading && !error && (
            <p className="text-sm text-slate-500">
              {total} {total === 1 ? "book" : "books"}{" "}
              {favouritesOnly ? "saved" : "for sale"}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {!favouritesOnly && (
            <>
              <label htmlFor="listing-sort" className="text-sm text-slate-700">
                Sort by:
              </label>

              <select
                id="listing-sort"
                value={sorting}
                onChange={(event) => setSorting(event.target.value)}
                disabled={loading}
                className="px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="newest-desc">Newest First</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="condition-asc">Condition: Low to High</option>
                <option value="condition-desc">Condition: High to Low</option>
              </select>
            </>
          )}

          <button
            type="button"
            onClick={() => void loadFirstPage()}
            disabled={loading}
            className="px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-md shadow-sm hover:bg-slate-50 disabled:opacity-50"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* US-03 Search Bar */}
      <div className="mb-6 flex items-center gap-2">
        <label htmlFor="listing-search" className="sr-only">
          Search textbooks by title, ISBN, or course code
        </label>
        <input
          id="listing-search"
          type="search"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search by title, course code (e.g. COMP-3013), or ISBN..."
          className="w-full px-4 py-2 text-sm bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {searchInput && (
          <button
            type="button"
            onClick={() => {
              setSearchInput("");
              setDebouncedSearch("");
            }}
            className="px-3 py-2 text-sm text-slate-600 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
          >
            Clear
          </button>
        )}
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
        <p className="text-center text-slate-500 py-12">Loading listings...</p>
      )}

      {!loading && !error && listings.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg border border-dashed border-slate-300">
          <p className="text-slate-600 mb-4">
            {debouncedSearch
              ? `No listings match "${debouncedSearch}".`
              : favouritesOnly
                ? "You haven't saved any favourite textbooks yet."
                : "No textbooks are listed right now."}
          </p>
          {!favouritesOnly && !debouncedSearch && onCreateListing && (
            <button
              type="button"
              onClick={onCreateListing}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm"
            >
              Be the first to list one
            </button>
          )}
        </div>
      )}

      {!loading && listings.length > 0 && (
        <>
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {listings.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                onSelect={setSelected}
                isFavourited={favouriteIds.has(listing.id)}
                onToggleFavourite={handleToggleFavourite}
              />
            ))}
          </ul>

          {!favouritesOnly && listings.length < total && (
            <div className="flex justify-center mt-6">
              <button
                type="button"
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md disabled:opacity-50"
              >
                {loadingMore ? "Loading..." : "Load more"}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}

ListingsView.propTypes = {
  user: PropTypes.object,
  favouritesOnly: PropTypes.bool,
  onOpenAuth: PropTypes.func,
  onCreateListing: PropTypes.func,
};
