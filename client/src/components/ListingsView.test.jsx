import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { vi, describe, it, expect, beforeEach } from "vitest";
import ListingsView, { formatPrice } from "./ListingsView";

globalThis.fetch = vi.fn();

const makeListing = (overrides = {}) => ({
  id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  seller_id: "11111111-1111-1111-1111-111111111111",
  title: "Software Engineering",
  isbn: "9780134670942",
  course_code: "COMP-3155",
  edition: "10th Edition",
  condition: "Good",
  price: 45,
  meetup_zone: "Agora",
  description: "Clean, no highlights.",
  status: "active",
  created_at: "2026-10-01T12:00:00Z",
  category_name: "Computer Science",
  category_code: "COMP",
  photos: [],
  ...overrides,
});

const mockResponse = (body, ok = true) => ({
  ok,
  json: async () => body,
});

describe("ListingsView Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches and displays current listings", async () => {
    globalThis.fetch.mockResolvedValueOnce(
      mockResponse({
        listings: [
          makeListing(),
          makeListing({
            id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
            title: "Intro to Psychology",
            course_code: "PSYC-1100",
            price: 30,
          }),
        ],
        total: 2,
        limit: 20,
        offset: 0,
      }),
    );

    render(<ListingsView />);

    expect(screen.getByText(/loading listings/i)).toBeInTheDocument();
    expect(await screen.findByText("Software Engineering")).toBeInTheDocument();
    expect(screen.getByText("Intro to Psychology")).toBeInTheDocument();
    expect(screen.getByText(/2 books for sale/i)).toBeInTheDocument();
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "/api/listings?limit=20&offset=0",
      expect.any(Object),
    );
  });

  it("shows an empty state when there are no listings", async () => {
    globalThis.fetch.mockResolvedValueOnce(
      mockResponse({ listings: [], total: 0, limit: 20, offset: 0 }),
    );
    const onCreate = vi.fn();

    render(<ListingsView onCreateListing={onCreate} />);

    expect(
      await screen.findByText(/no textbooks are listed right now/i),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /be the first/i }));
    expect(onCreate).toHaveBeenCalled();
  });

  it("shows an error message when the request fails", async () => {
    globalThis.fetch.mockResolvedValueOnce(
      mockResponse({ error: "Internal server error." }, false),
    );

    render(<ListingsView />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /internal server error/i,
    );
  });

  it("opens the listing detail when a card is clicked", async () => {
    globalThis.fetch.mockResolvedValueOnce(
      mockResponse({
        listings: [makeListing()],
        total: 1,
        limit: 20,
        offset: 0,
      }),
    );

    render(<ListingsView />);

    fireEvent.click(await screen.findByText("Software Engineering"));

    expect(screen.getByText("Clean, no highlights.")).toBeInTheDocument();
    expect(screen.getByText("9780134670942")).toBeInTheDocument();
    expect(screen.getByText("Computer Science")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /back to listings/i }));
    expect(screen.getByText(/1 book for sale/i)).toBeInTheDocument();
  });

  it("loads the next page when 'Load more' is clicked", async () => {
    globalThis.fetch
      .mockResolvedValueOnce(
        mockResponse({
          listings: [makeListing()],
          total: 2,
          limit: 20,
          offset: 0,
        }),
      )
      .mockResolvedValueOnce(
        mockResponse({
          listings: [
            makeListing({
              id: "cccccccc-cccc-cccc-cccc-cccccccccccc",
              title: "Organic Chemistry",
            }),
          ],
          total: 2,
          limit: 20,
          offset: 1,
        }),
      );

    render(<ListingsView />);

    fireEvent.click(await screen.findByRole("button", { name: /load more/i }));

    expect(await screen.findByText("Organic Chemistry")).toBeInTheDocument();
    expect(globalThis.fetch).toHaveBeenLastCalledWith(
      "/api/listings?limit=20&offset=1",
      expect.any(Object),
    );
    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: /load more/i }),
      ).not.toBeInTheDocument(),
    );
  });
});

describe("formatPrice", () => {
  it("formats prices in Canadian dollars and shows Free for zero", () => {
    expect(formatPrice(45)).toMatch(/45\.00/);
    expect(formatPrice(0)).toBe("Free");
  });
});
