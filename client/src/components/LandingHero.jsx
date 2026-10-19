import React from "react";
import PropTypes from "prop-types";

export default function LandingHero({ onGetStarted }) {
  return (
    <div className="py-12 sm:py-20 text-center max-w-4xl mx-auto">
      <span className="inline-block px-3 py-1 mb-4 text-xs font-semibold uppercase tracking-wider text-blue-700 bg-blue-100 rounded-full">
        Lakehead Student Marketplace
      </span>
      <h1 className="text-4xl sm:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight">
        Buy and sell course textbooks{" "}
        <span className="text-blue-600">campus-wide</span>.
      </h1>
      <p className="mt-6 text-lg text-slate-600 max-w-2xl mx-auto">
        Skip expensive bookstore markups. Connect directly with verified
        Lakehead students to trade course materials safely on campus.
      </p>

      <div className="mt-8 flex justify-center gap-4">
        <button
          onClick={onGetStarted}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl shadow-lg shadow-blue-500/20 transition"
        >
          Get Started
        </button>
      </div>

      {/* Feature Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 text-left">
        <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="text-2xl mb-2">🎓</div>
          <h3 className="font-bold text-slate-900">Verified Students</h3>
          <p className="text-sm text-slate-600 mt-1">
            Exclusive to student accounts to ensure secure on-campus
            transactions.
          </p>
        </div>
        <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="text-2xl mb-2">📍</div>
          <h3 className="font-bold text-slate-900">Safe Meetup Zones</h3>
          <p className="text-sm text-slate-600 mt-1">
            Designated exchange spots like Agora and the Library for safe
            trades.
          </p>
        </div>
        <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="text-2xl mb-2">💸</div>
          <h3 className="font-bold text-slate-900">Zero Commissions</h3>
          <p className="text-sm text-slate-600 mt-1">
            Keep 100% of your listed sales price without middleman fees.
          </p>
        </div>
      </div>
    </div>
  );
}

LandingHero.propTypes = {
  onGetStarted: PropTypes.func.isRequired,
};
