import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { vi, describe, it, expect } from "vitest";
import SellerContact from "./SellerContact";

describe("SellerContact Component (US-08)", () => {
  const listingId = "22222222-2222-2222-2222-222222222222";

  it('shows "Log in to view contact info" prompt when user is unauthenticated', () => {
    render(<SellerContact listingId={listingId} user={null} />);

    expect(
      screen.getByText(/Log in to view contact info/i),
    ).toBeInTheDocument();
  });

  it("reveals seller email as a mailto link when logged in and clicked", async () => {
    // Mock successful API response using Vitest's vi.fn()
    globalThis.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ email: "seller@lakeheadu.ca" }),
      }),
    );

    const mockUser = { id: "111", email: "buyer@lakeheadu.ca" };

    render(<SellerContact listingId={listingId} user={mockUser} />);

    const button = screen.getByRole("button", { name: /Show Contact Info/i });
    fireEvent.click(button);

    await waitFor(() => {
      const emailLink = screen.getByText("seller@lakeheadu.ca");
      expect(emailLink).toBeInTheDocument();
      expect(emailLink.closest("a")).toHaveAttribute(
        "href",
        "mailto:seller@lakeheadu.ca",
      );
    });
  });
});
