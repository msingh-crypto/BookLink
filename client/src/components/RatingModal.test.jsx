// client/src/components/RatingModal.test.jsx
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import RatingModal from "./RatingModal";

describe("RatingModal Component", () => {
  const mockProps = {
    sellerId: "99999999-9999-9999-9999-999999999999",
    sellerEmail: "seller@lakeheadu.ca",
    isOpen: true,
    onClose: vi.fn(),
    onRatingSubmitted: vi.fn(),
  };

  it("renders rating modal fields correctly when open", () => {
    render(<RatingModal {...mockProps} />);

    expect(screen.getByText("Rate Student Seller")).toBeInTheDocument();
    expect(screen.getByText("seller@lakeheadu.ca")).toBeInTheDocument();
    expect(screen.getByText("Submit Review")).toBeInTheDocument();
  });

  it("submits valid rating to POST /api/ratings", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        headers: {
          get: (header) =>
            header === "content-type" ? "application/json" : null,
        },
        json: async () => ({ id: 1, rating: 5, review_text: "Awesome!" }),
      }),
    );

    render(<RatingModal {...mockProps} />);

    fireEvent.change(screen.getByPlaceholderText(/Was the seller prompt/i), {
      target: { value: "Awesome!" },
    });
    fireEvent.click(screen.getByText("Submit Review"));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/ratings", expect.any(Object));
      expect(mockProps.onRatingSubmitted).toHaveBeenCalled();
      expect(mockProps.onClose).toHaveBeenCalled();
    });

    vi.unstubAllGlobals();
  });
});
