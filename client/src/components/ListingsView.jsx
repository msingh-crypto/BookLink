import React, { useCallback, useEffect, useState } from "react";
import PropTypes from "prop-types";

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

function ListingCard({ listing, onSelect }) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(listing)}
        className="flex flex-col w-full h-full text-left bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden hover:shadow-md hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
      >
        <BookPhoto
          src={listing.photos[0]}
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
    </li>
  );
}

ListingCard.propTypes = {
  listing: PropTypes.object.isRequired,
  onSelect: PropTypes.func.isRequired,
};

function ListingDetail({ listing, onBack }) {
  const [activePhoto, setActivePhoto] = useState(0);

  return (
    <div className="max-w-3xl mx-auto">
      <button
        type="button"
        onClick={onBack}
        className="mb-4 text-sm text-blue-700 hover:underline"
      >
        ← Back to listings
      </button>

      <article className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <BookPhoto
          src={listing.photos[activePhoto]}
          alt={listing.title}
          className="w-full h-72"
        />

        {listing.photos.length > 1 && (
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
        </div>
      </article>
    </div>
  );
}

ListingDetail.propTypes = {
  listing: PropTypes.object.isRequired,
  onBack: PropTypes.func.isRequired,
};

export default function ListingsView({ onCreateListing }) {
  const [listings, setListings] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const [sorting, setSorting] = useState("newest-desc");

  const fetchPage = useCallback(
    async (offset, signal) => {
      const [sortBy, sortOrder] = sorting.split("-");

      const response = await fetch(
        `/api/listings?limit=${PAGE_SIZE}&offset=${offset}&sortBy=${sortBy}&sortOrder=${sortOrder}`,
        { credentials: "include", signal },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load listings.");
      }

      return data;
    },
    [sorting],
  );

  const loadFirstPage = useCallback(
    async (signal) => {
      setLoading(true);
      setError("");
      try {
        const data = await fetchPage(0, signal);
        setListings(data.listings);
        setTotal(data.total);
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
    [fetchPage],
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
      // Skip anything already shown in case new listings shifted the page
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

  if (selected) {
    return (
      <ListingDetail listing={selected} onBack={() => setSelected(null)} />
    );
  }

  return (
    <section className="max-w-6xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            Current Listings
          </h2>
          {!loading && !error && (
            <p className="text-sm text-slate-500">
              {total} {total === 1 ? "book" : "books"} for sale
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
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
            No textbooks are listed right now.
          </p>
          {onCreateListing && (
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
              />
            ))}
          </ul>

          {listings.length < total && (
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
  onCreateListing: PropTypes.func,
};
