// client/src/components/ReportModal.test.jsx
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import ReportModal from "./ReportModal";

describe("ReportModal Component (US-11)", () => {
  const mockOnClose = vi.fn();
  const mockOnReportSubmitted = vi.fn();

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    targetType: "listing",
    targetId: "e3333333-3333-3333-3333-333333333333",
    targetTitle: "Suspicious Textbook",
    onReportSubmitted: mockOnReportSubmitted,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders modal with target title and category dropdown when open", () => {
    render(<ReportModal {...defaultProps} />);

    expect(screen.getByText(/Report Suspicious Listing/i)).toBeInTheDocument();
    expect(screen.getByText(/Suspicious Textbook/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Violation Category/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Description/i)).toBeInTheDocument();
  });

  it("shows error banner when submitting without selecting a category", async () => {
    render(<ReportModal {...defaultProps} />);

    const submitBtn = screen.getByRole("button", { name: /Submit Report/i });
    fireEvent.click(submitBtn);

    expect(
      await screen.findByText(/Please select a category/i),
    ).toBeInTheDocument();
    expect(mockOnReportSubmitted).not.toHaveBeenCalled();
  });

  it("submits report successfully and displays acknowledgment notification", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        headers: {
          get: (header) =>
            header === "content-type" ? "application/json" : null,
        },
        json: async () => ({
          id: 1,
          reported_listing_id: defaultProps.targetId,
          reason_category: "Scam / Fraud",
          status: "pending",
        }),
      }),
    );

    render(<ReportModal {...defaultProps} />);

    fireEvent.change(screen.getByLabelText(/Violation Category/i), {
      target: { value: "Scam / Fraud" },
    });

    fireEvent.change(screen.getByLabelText(/Description/i), {
      target: { value: "Seller asked for off-platform payment." },
    });

    fireEvent.click(screen.getByRole("button", { name: /Submit Report/i }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/reports",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
          }),
          body: JSON.stringify({
            reportedListingId: defaultProps.targetId,
            reportedUserId: null,
            reasonCategory: "Scam / Fraud",
            description: "Seller asked for off-platform payment.",
          }),
        }),
      );
    });

    expect(
      await screen.findByText(
        /Thank you. Your report has been submitted for moderation review./i,
      ),
    ).toBeInTheDocument();
  });
});
