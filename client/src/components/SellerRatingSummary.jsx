import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";

export default function SellerRatingSummary({ sellerId }) {
  const [ratingData, setRatingData] = useState({
    average_rating: 0,
    total_reviews: 0,
    reviews: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sellerId) return;

    const res = fetch(`/api/sellers/${sellerId}/ratings`);
    if (!res || typeof res.then !== "function") {
      setLoading(false);
      return;
    }

    res
      .then((r) => (r && typeof r.json === "function" ? r.json() : {}))
      .then((data) => {
        if (data && typeof data === "object") {
          setRatingData(data);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [sellerId]);

  if (loading)
    return <div className="text-xs text-slate-400">Loading ratings...</div>;

  const { average_rating, total_reviews, reviews } = ratingData;

  return (
    <div className="space-y-3">
      {/* Aggregated Indicator */}
      <div className="flex items-center gap-2">
        <span className="text-amber-400 font-bold text-lg">★</span>
        <span className="font-bold text-slate-800 text-base">
          {average_rating > 0 ? average_rating : "New"}
        </span>
        <span className="text-xs text-slate-500">
          ({total_reviews} {total_reviews === 1 ? "review" : "reviews"})
        </span>
      </div>

      {/* Review History */}
      {reviews.length > 0 && (
        <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Seller Reviews
          </h4>
          {reviews.map((rev) => (
            <div
              key={rev.id}
              className="bg-slate-50 p-3 rounded-xl text-xs space-y-1"
            >
              <div className="flex justify-between items-center text-slate-600">
                <span className="text-amber-400 font-semibold">
                  {"★".repeat(rev.rating)}
                </span>
                <span className="text-slate-400 text-[10px]">
                  {new Date(rev.created_at).toLocaleDateString()}
                </span>
              </div>
              {rev.review_text && (
                <p className="text-slate-700 italic">
                  &quot;{rev.review_text}&quot;
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

SellerRatingSummary.propTypes = {
  sellerId: PropTypes.string.isRequired,
};
