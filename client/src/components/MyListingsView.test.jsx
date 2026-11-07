import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react";
import "@testing-library/jest-dom";
import { vi, describe, it, expect, beforeEach } from "vitest";
import MyListingsView from "./MyListingsView";

globalThis.fetch = vi.fn();

const makeListing = (overrides = {}) => ({
  id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  seller_id: "11111111-1111-1111-1111-111111111111",
  title: "Software Engineering",
  course_code: "COMP-3155",
  edition: "10th Edition",
  condition: "Good",
  price: 45,
  meetup_zone: "Agora",
  status: "active",
  removed_by_moderator: false,
  created_at: "2026-10-01T12:00:00Z",
  photos: [],
  ...overrides,
});

const ACTIVE = makeListing();
const SOLD = makeListing({
  id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
  title: "Intro to Psychology",
  course_code: "PSYC-1100",
  status: "sold",
});
const MODERATED = makeListing({
  id: "cccccccc-cccc-cccc-cccc-cccccccccccc",
  title: "Banned Book",
  status: "removed",
  removed_by_moderator: true,
});

const mockResponse = (body, ok = true) => ({
  ok,
  json: async () => body,
});

function rowFor(title) {
  return screen.getByText(title).closest("li");
}

describe("MyListingsView Component (US-07)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads the user's listings from the session-scoped endpoint", async () => {
    globalThis.fetch.mockResolvedValueOnce(
      mockResponse({ listings: [ACTIVE, SOLD, MODERATED], total: 3 }),
    );

    render(<MyListingsView />);

    expect(screen.getByText(/loading your listings/i)).toBeInTheDocument();
    expect(await screen.findByText("Software Engineering")).toBeInTheDocument();
    expect(screen.getByText("Intro to Psychology")).toBeInTheDocument();
    expect(
      screen.getByText(/1 active · 1 sold · 1 removed/i),
    ).toBeInTheDocument();
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "/api/listings/mine",
      expect.objectContaining({ credentials: "include" }),
    );
  });

  it("shows each listing's status and only the actions that change it", async () => {
    globalThis.fetch.mockResolvedValueOnce(
      mockResponse({ listings: [ACTIVE, SOLD], total: 2 }),
    );

    render(<MyListingsView />);
    await screen.findByText("Software Engineering");

    const activeRow = within(rowFor("Software Engineering"));
    expect(activeRow.getByText("Active")).toBeInTheDocument();
    expect(activeRow.queryByRole("button", { name: "Mark active" })).toBeNull();
    expect(
      activeRow.getByRole("button", { name: "Mark sold" }),
    ).toBeInTheDocument();
    expect(
      activeRow.getByRole("button", { name: "Remove" }),
    ).toBeInTheDocument();

    const soldRow = within(rowFor("Intro to Psychology"));
    expect(soldRow.getByText("Sold")).toBeInTheDocument();
    expect(
      soldRow.getByRole("button", { name: "Mark active" }),
    ).toBeInTheDocument();
    expect(soldRow.queryByRole("button", { name: "Mark sold" })).toBeNull();
  });

  it("marks a listing as sold and updates its badge", async () => {
    globalThis.fetch
      .mockResolvedValueOnce(mockResponse({ listings: [ACTIVE], total: 1 }))
      .mockResolvedValueOnce(
        mockResponse({ id: ACTIVE.id, status: "sold", title: ACTIVE.title }),
      );

    render(<MyListingsView />);
    await screen.findByText("Software Engineering");

    fireEvent.click(screen.getByRole("button", { name: "Mark sold" }));

    await waitFor(() => {
      expect(
        within(rowFor("Software Engineering")).getByText("Sold"),
      ).toBeInTheDocument();
    });
    expect(globalThis.fetch).toHaveBeenLastCalledWith(
      `/api/listings/${ACTIVE.id}/status`,
      expect.objectContaining({
        method: "PATCH",
        credentials: "include",
        body: JSON.stringify({ status: "sold" }),
      }),
    );
    expect(
      screen.getByRole("button", { name: "Mark active" }),
    ).toBeInTheDocument();
  });

  it("keeps the old status and shows the error when an update fails", async () => {
    globalThis.fetch
      .mockResolvedValueOnce(mockResponse({ listings: [ACTIVE], total: 1 }))
      .mockResolvedValueOnce(
        mockResponse(
          { error: "You can only manage your own listings." },
          false,
        ),
      );

    render(<MyListingsView />);
    await screen.findByText("Software Engineering");

    fireEvent.click(screen.getByRole("button", { name: "Remove" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /only manage your own listings/i,
    );
    expect(
      within(rowFor("Software Engineering")).getByText("Active"),
    ).toBeInTheDocument();
  });

  it("does not offer actions on a listing removed by a moderator", async () => {
    globalThis.fetch.mockResolvedValueOnce(
      mockResponse({ listings: [MODERATED], total: 1 }),
    );

    render(<MyListingsView />);
    await screen.findByText("Banned Book");

    const row = within(rowFor("Banned Book"));
    expect(row.getByText(/removed by a moderator/i)).toBeInTheDocument();
    expect(row.queryByRole("button")).toBeNull();
  });

  it("filters listings by status", async () => {
    globalThis.fetch.mockResolvedValueOnce(
      mockResponse({ listings: [ACTIVE, SOLD], total: 2 }),
    );

    render(<MyListingsView />);
    await screen.findByText("Software Engineering");

    fireEvent.click(screen.getByRole("tab", { name: /sold \(1\)/i }));
    expect(screen.queryByText("Software Engineering")).toBeNull();
    expect(screen.getByText("Intro to Psychology")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: /removed \(0\)/i }));
    expect(screen.getByText(/no removed listings/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: /all \(2\)/i }));
    expect(screen.getByText("Software Engineering")).toBeInTheDocument();
  });

  it("shows an empty state that links to creating a listing", async () => {
    globalThis.fetch.mockResolvedValueOnce(
      mockResponse({ listings: [], total: 0 }),
    );
    const onCreate = vi.fn();

    render(<MyListingsView onCreateListing={onCreate} />);

    expect(
      await screen.findByText(/haven't listed any textbooks yet/i),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: /list your first book/i }),
    );
    expect(onCreate).toHaveBeenCalled();
  });

  it("shows an error when loading fails", async () => {
    globalThis.fetch.mockResolvedValueOnce(
      mockResponse({ error: "Authentication required." }, false),
    );

    render(<MyListingsView />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /authentication required/i,
    );
  });
});
