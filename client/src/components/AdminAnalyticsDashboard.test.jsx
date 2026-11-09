import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import AdminAnalyticsDashboard from "./AdminAnalyticsDashboard";

describe("US-14: Admin Analytics Dashboard Component", () => {
  const mockAnalyticsData = {
    range: "monthly",
    totals: {
      total_registered_users: 142,
      total_active_listings: 45,
      total_items_sold: 28,
    },
    timeSeries: [
      {
        period: "2026-01-01T00:00:00.000Z",
        new_users: 10,
        active_listings: 15,
        items_sold: 5,
      },
      {
        period: "2026-02-01T00:00:00.000Z",
        new_users: 20,
        active_listings: 30,
        items_sold: 12,
      },
    ],
  };

  let mockFetch;

  beforeEach(() => {
    mockFetch = vi.fn().mockImplementation((url) => {
      if (typeof url === "string" && url.includes("/api/admin/analytics")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockAnalyticsData),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      });
    });

    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("renders metric summary cards correctly", async () => {
    render(<AdminAnalyticsDashboard />);

    await waitFor(() => {
      expect(screen.getByText("Total Registered Users")).toBeInTheDocument();
      expect(screen.getByText("142")).toBeInTheDocument();

      const activeListingsElements = screen.getAllByText("Active Listings");
      expect(activeListingsElements.length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("45")).toBeInTheDocument();

      const itemsSoldElements = screen.getAllByText("Items Sold");
      expect(itemsSoldElements.length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("28")).toBeInTheDocument();
    });
  });

  it("triggers range filter change when toggled", async () => {
    render(<AdminAnalyticsDashboard />);

    await waitFor(() => {
      expect(screen.getByText("Total Registered Users")).toBeInTheDocument();
    });

    const weeklyBtn = screen.getByRole("button", { name: /weekly/i });
    fireEvent.click(weeklyBtn);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("range=weekly"),
        expect.any(Object),
      );
    });
  });
});
