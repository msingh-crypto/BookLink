import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react";
import "@testing-library/jest-dom";
import { vi, describe, it, expect, beforeEach } from "vitest";
import MessagesView from "./MessagesView";

globalThis.fetch = vi.fn();

const ME = {
  id: "11111111-1111-1111-1111-111111111111",
  email: "sam@lakeheadu.ca",
};
const BUYER_ID = "22222222-2222-2222-2222-222222222222";
const LISTING_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";

const conversation = (overrides = {}) => ({
  listingId: LISTING_ID,
  listingTitle: "Software Engineering",
  listingStatus: "active",
  isSeller: true,
  otherUser: { id: BUYER_ID, name: "Bea", email: "bea@lakeheadu.ca" },
  lastMessage: "Is this still available?",
  lastMessageAt: "2026-11-20T15:00:00Z",
  lastMessageFromMe: false,
  unreadCount: 2,
  ...overrides,
});

const thread = [
  {
    id: 1,
    sender_id: BUYER_ID,
    receiver_id: ME.id,
    message_body: "Hi Sam!",
    created_at: "2026-11-20T14:59:00Z",
  },
  {
    id: 2,
    sender_id: BUYER_ID,
    receiver_id: ME.id,
    message_body: "Is this still available?",
    created_at: "2026-11-20T15:00:00Z",
  },
];

const mockResponse = (body, ok = true) => ({ ok, json: async () => body });

// Route fetch calls by URL and method
function mockApi({
  conversations = [conversation()],
  messages = thread,
  sendResponse,
} = {}) {
  globalThis.fetch.mockImplementation(async (url, options = {}) => {
    if (url === "/api/messages/conversations")
      return mockResponse({ conversations });
    if (url.startsWith("/api/messages/conversations/"))
      return mockResponse({ messages });
    if (url === "/api/messages" && options.method === "POST")
      return sendResponse;
    throw new Error(`Unexpected fetch ${url}`);
  });
}

describe("MessagesView Component (US-09)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists conversations with the other student, listing and unread count", async () => {
    mockApi();
    render(<MessagesView user={ME} />);

    const list = await screen.findByRole("list", { name: /conversations/i });
    expect(within(list).getByText("Bea")).toBeInTheDocument();
    expect(within(list).getByText("Software Engineering")).toBeInTheDocument();
    expect(
      within(list).getByText("Is this still available?"),
    ).toBeInTheDocument();
    expect(within(list).getByLabelText("2 unread")).toBeInTheDocument();
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "/api/messages/conversations",
      expect.objectContaining({ credentials: "include" }),
    );
  });

  it("opens a thread, clears its unread badge and shows the Lakehead email", async () => {
    mockApi();
    const onUnreadChange = vi.fn();
    render(<MessagesView user={ME} onUnreadChange={onUnreadChange} />);

    fireEvent.click(await screen.findByRole("button", { name: /bea/i }));

    expect(await screen.findByText("Hi Sam!")).toBeInTheDocument();
    expect(globalThis.fetch).toHaveBeenCalledWith(
      `/api/messages/conversations/${LISTING_ID}/${BUYER_ID}`,
      expect.objectContaining({ credentials: "include" }),
    );
    expect(screen.queryByLabelText("2 unread")).toBeNull();
    expect(onUnreadChange).toHaveBeenCalled();
    expect(
      screen.getByRole("link", { name: /email bea@lakeheadu.ca/i }),
    ).toHaveAttribute(
      "href",
      expect.stringContaining("mailto:bea@lakeheadu.ca"),
    );
  });

  it("opens the conversation passed in from a listing", async () => {
    mockApi();
    render(
      <MessagesView
        user={ME}
        initialConversation={{ listingId: LISTING_ID, otherUserId: BUYER_ID }}
      />,
    );

    expect(await screen.findByText("Hi Sam!")).toBeInTheDocument();
  });

  it("sends a reply to the other student in the open conversation", async () => {
    mockApi({
      sendResponse: mockResponse({
        message: {
          id: 3,
          sender_id: ME.id,
          receiver_id: BUYER_ID,
          message_body: "Yes, still available!",
          created_at: "2026-11-20T15:05:00Z",
        },
        emailSent: true,
      }),
    });
    render(
      <MessagesView
        user={ME}
        initialConversation={{ listingId: LISTING_ID, otherUserId: BUYER_ID }}
      />,
    );
    await screen.findByText("Hi Sam!");

    fireEvent.change(screen.getByLabelText(/reply to bea/i), {
      target: { value: "Yes, still available!" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    await waitFor(() =>
      expect(
        screen.getAllByText("Yes, still available!").length,
      ).toBeGreaterThan(0),
    );
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "/api/messages",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          listingId: LISTING_ID,
          receiverId: BUYER_ID,
          body: "Yes, still available!",
        }),
      }),
    );
    expect(screen.getByLabelText(/reply to bea/i)).toHaveValue("");
  });

  it("shows an empty state when there are no conversations", async () => {
    mockApi({ conversations: [] });
    render(<MessagesView user={ME} />);

    expect(await screen.findByText(/no messages yet/i)).toBeInTheDocument();
  });

  it("shows an error when the inbox can't load", async () => {
    globalThis.fetch.mockResolvedValueOnce(
      mockResponse({ error: "Authentication required." }, false),
    );
    render(<MessagesView user={ME} />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /authentication required/i,
    );
  });
});
