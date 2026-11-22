import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { vi, describe, it, expect, beforeEach } from "vitest";
import ListingsView, { formatPrice } from "./ListingsView";

// US-13: Keep listing responses separate from taxonomy requests.
const listingFetch = vi.fn();
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
  // US-13: Category and department are separate managed selections.
  category_id: 11,
  category_name: "Textbooks",
  category_code: "TEXT",
  department_id: 21,
  department_name: "Computer Science",
  department_code: "COMP",
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
    listingFetch.mockReset();

    globalThis.fetch = vi.fn(async (url, options) => {
      if (url === "/api/taxonomy/categories") {
        return mockResponse([
          { id: 11, name: "Textbooks", code: "TEXT", is_active: true },
          { id: 12, name: "Reference Books", code: "REF", is_active: true },
        ]);
      }

      if (url === "/api/taxonomy/departments") {
        return mockResponse([
          { id: 21, name: "Computer Science", code: "COMP", is_active: true },
          { id: 22, name: "Business", code: "BUSI", is_active: true },
        ]);
      }

      if (url.startsWith("/api/listings?")) {
        return listingFetch(url, options);
      }

      if (/^\/api\/sellers\/[^/]+\/ratings$/.test(url)) {
        return mockResponse({
          average_rating: 0,
          total_reviews: 0,
          reviews: [],
        });
      }

      throw new Error(`Unexpected request: ${url}`);
    });
  });

  it("fetches and displays current listings", async () => {
    listingFetch.mockResolvedValueOnce(
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
      "/api/listings?limit=20&offset=0&sortBy=newest&sortOrder=desc",
      expect.any(Object),
    );
  });

  it("shows an empty state when there are no listings", async () => {
    listingFetch.mockResolvedValueOnce(
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
    listingFetch.mockResolvedValueOnce(
      mockResponse({ error: "Internal server error." }, false),
    );

    render(<ListingsView />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /internal server error/i,
    );
  });

  it("opens the listing detail when a card is clicked", async () => {
    listingFetch.mockResolvedValueOnce(
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
    expect(screen.getByText("Textbooks")).toBeInTheDocument();
    expect(screen.getByText("Category")).toBeInTheDocument();
    expect(screen.getByText("Department")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /back to listings/i }));
    expect(screen.getByText(/1 book for sale/i)).toBeInTheDocument();
  });

  it("loads the next page when 'Load more' is clicked", async () => {
    listingFetch
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
      "/api/listings?limit=20&offset=1&sortBy=newest&sortOrder=desc",
      expect.any(Object),
    );
    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: /load more/i }),
      ).not.toBeInTheDocument(),
    );
  });

  it("sends the correct API parameters when sorting changes", async () => {
    listingFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        listings: [],
        total: 0,
        limit: 20,
        offset: 0,
      }),
    });

    render(<ListingsView />);

    const sortingDropdown = screen.getByLabelText("Sort by:");

    const sortingOptions = [
      ["price-asc", "price", "asc"],
      ["price-desc", "price", "desc"],
      ["condition-asc", "condition", "asc"],
      ["condition-desc", "condition", "desc"],
    ];

    for (const [value, sortBy, sortOrder] of sortingOptions) {
      fireEvent.change(sortingDropdown, {
        target: { value },
      });

      await waitFor(() => {
        expect(globalThis.fetch).toHaveBeenCalledWith(
          `/api/listings?limit=20&offset=0&sortBy=${sortBy}&sortOrder=${sortOrder}`,
          expect.objectContaining({
            credentials: "include",
            signal: expect.any(AbortSignal),
          }),
        );
      });
    }
  });

  it("sends combined category, department, condition, and courseCode filters to the API", async () => {
    listingFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        listings: [makeListing()],
        total: 1,
        limit: 20,
        offset: 0,
      }),
    });

    render(<ListingsView />);
    await screen.findByText("Software Engineering");

    await waitFor(() => {
      expect(screen.getByLabelText("Filter by category")).toBeEnabled();
      expect(screen.getByLabelText("Filter by department")).toBeEnabled();
    });

    fireEvent.change(screen.getByLabelText("Filter by category"), {
      target: { value: "11" },
    });

    fireEvent.change(screen.getByLabelText("Filter by department"), {
      target: { value: "COMP" },
    });
    fireEvent.change(screen.getByLabelText("Filter by condition"), {
      target: { value: "Good" },
    });
    fireEvent.change(screen.getByLabelText("Filter by course code"), {
      target: { value: "COMP 3155" },
    });

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        "/api/listings?limit=20&offset=0&sortBy=newest&sortOrder=desc&category=11&department=COMP&condition=Good&courseCode=COMP+3155",
        expect.objectContaining({
          credentials: "include",
          signal: expect.any(AbortSignal),
        }),
      );
    });
  });

  it("resets all filters and sorting when 'Clear Filters' is clicked", async () => {
    listingFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        listings: [makeListing()],
        total: 1,
        limit: 20,
        offset: 0,
      }),
    });

    render(<ListingsView />);
    await screen.findByText("Software Engineering");

    await waitFor(() => {
      expect(screen.getByLabelText("Filter by category")).toBeEnabled();
      expect(screen.getByLabelText("Filter by department")).toBeEnabled();
    });

    const categorySelect = screen.getByLabelText("Filter by category");

    const deptSelect = screen.getByLabelText("Filter by department");
    const condSelect = screen.getByLabelText("Filter by condition");
    const courseInput = screen.getByLabelText("Filter by course code");
    const sortSelect = screen.getByLabelText("Sort by:");
    const clearButton = screen.getByRole("button", { name: /clear filters/i });

    expect(clearButton).toBeDisabled();
    fireEvent.change(categorySelect, { target: { value: "11" } });
    fireEvent.change(deptSelect, { target: { value: "COMP" } });
    fireEvent.change(condSelect, { target: { value: "Good" } });
    fireEvent.change(courseInput, { target: { value: "COMP 3155" } });
    fireEvent.change(sortSelect, { target: { value: "price-asc" } });

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        "/api/listings?limit=20&offset=0&sortBy=price&sortOrder=asc&category=11&department=COMP&condition=Good&courseCode=COMP+3155",
        expect.any(Object),
      );
    });

    expect(clearButton).toBeEnabled();
    fireEvent.click(clearButton);
    expect(categorySelect.value).toBe("");

    expect(deptSelect.value).toBe("");
    expect(condSelect.value).toBe("");
    expect(courseInput.value).toBe("");
    expect(sortSelect.value).toBe("newest-desc");

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenLastCalledWith(
        "/api/listings?limit=20&offset=0&sortBy=newest&sortOrder=desc",
        expect.any(Object),
      );
    });
  });
});

describe("formatPrice", () => {
  it("formats prices in Canadian dollars and shows Free for zero", () => {
    expect(formatPrice(45)).toMatch(/45\.00/);
    expect(formatPrice(0)).toBe("Free");
  });
});
