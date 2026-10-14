import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { vi, describe, it, expect, beforeEach } from "vitest";
import CreateListingForm from "./CreateListingForm";

// Use globalThis instead of global
globalThis.fetch = vi.fn();

describe("CreateListingForm Component (US-06)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders all required form input fields and dropdowns", () => {
    render(
      <CreateListingForm sellerId="11111111-1111-1111-1111-111111111111" />,
    );

    expect(screen.getByLabelText(/book title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/isbn/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/course code/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/edition/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/price/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/condition/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/campus meetup zone/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/upload photo/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /create listing/i }),
    ).toBeInTheDocument();
  });

  it("displays a validation error when mandatory fields are missing", async () => {
    render(
      <CreateListingForm sellerId="11111111-1111-1111-1111-111111111111" />,
    );

    fireEvent.click(screen.getByRole("button", { name: /create listing/i }));

    expect(
      await screen.findByText(/please fill in all mandatory fields/i),
    ).toBeInTheDocument();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("displays a validation error when price is negative", async () => {
    render(
      <CreateListingForm sellerId="11111111-1111-1111-1111-111111111111" />,
    );

    fireEvent.change(screen.getByLabelText(/book title/i), {
      target: { value: "Software Engineering" },
    });
    fireEvent.change(screen.getByLabelText(/course code/i), {
      target: { value: "COMP-3155" },
    });
    fireEvent.change(screen.getByLabelText(/condition/i), {
      target: { value: "Good" },
    });
    fireEvent.change(screen.getByLabelText(/campus meetup zone/i), {
      target: { value: "Agora" },
    });
    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: "Great condition book" },
    });
    fireEvent.change(screen.getByLabelText(/price/i), {
      target: { value: "-15.00" },
    });

    fireEvent.click(screen.getByRole("button", { name: /create listing/i }));

    expect(
      await screen.findByText(/price must be a valid non-negative number/i),
    ).toBeInTheDocument();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("submits listing payload to API when inputs are valid", async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: "listing-123", status: "active" }),
    });

    render(
      <CreateListingForm
        sellerId="11111111-1111-1111-1111-111111111111"
        onSuccess={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText(/book title/i), {
      target: { value: "Software Engineering" },
    });
    fireEvent.change(screen.getByLabelText(/isbn/i), {
      target: { value: "9780134670942" },
    });
    fireEvent.change(screen.getByLabelText(/course code/i), {
      target: { value: "COMP-3155" },
    });
    fireEvent.change(screen.getByLabelText(/edition/i), {
      target: { value: "10th Edition" },
    });
    fireEvent.change(screen.getByLabelText(/condition/i), {
      target: { value: "Good" },
    });
    fireEvent.change(screen.getByLabelText(/campus meetup zone/i), {
      target: { value: "Agora" },
    });
    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: "Clean condition without highlights" },
    });
    fireEvent.change(screen.getByLabelText(/price/i), {
      target: { value: "45.00" },
    });

    fireEvent.click(screen.getByRole("button", { name: /create listing/i }));

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        "/api/listings",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
          }),
        }),
      );
    });
  });
});
