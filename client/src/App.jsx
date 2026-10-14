import React, { useState } from "react";
import Navbar from "./components/Navbar";
import Register from "./components/Register";
import CreateListingForm from "./components/CreateListingForm";

export default function App() {
  const [currentView, setCurrentView] = useState("create-listing");
  const testSellerID = "11111111-1111-1111-1111-111111111111";
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      {/* Temporary view switcher bar */}
      <div className="flex justify-center gap-4 py-2 bg-slate-200">
        <button
          className="px-3 py-1 bg-white rounded shadow text-sm"
          onClick={() => setCurrentView("register")}
        >
          Register View
        </button>
        <button
          className="px-3 py-1 bg-white rounded shadow text-sm"
          onClick={() => setCurrentView("create-listing")}
        >
          Create Listing View
        </button>
      </div>

      <main className="container mx-auto px-4 py-6">
        {currentView === "register" && <Register />}
        {currentView === "create-listing" && (
          <div className="max-w-2xl mx-auto bg-white p-6 rounded-lg shadow-sm">
            <CreateListingForm
              sellerId={testSellerID}
              onSuccess={(data) => {
                alert(`Listing created successfully! ID: ${data.id}`);
              }}
            />
          </div>
        )}
      </main>
    </div>
  );
}
