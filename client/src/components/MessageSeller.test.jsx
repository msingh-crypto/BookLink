import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { vi, describe, it, expect, beforeEach } from "vitest";
import MessageSeller from "./MessageSeller";

globalThis.fetch = vi.fn();

const listing = {
  id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  seller_id: "11111111-1111-1111-1111-111111111111",
  title: "Software Engineering",
};
const buyer = {
  id: "22222222-2222-2222-2222-222222222222",
  email: "bea@lakeheadu.ca",
};

const mockResponse = (body, ok = true) => ({ ok, json: async () => body });

describe("MessageSeller Component (US-09)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("asks logged-out visitors to log in", () => {
    const onOpenAuth = vi.fn();
    render(
      <MessageSeller listing={listing} user={null} onOpenAuth={onOpenAuth} />,
    );

    fireEvent.click(screen.getByRole("button", { name: /log in to message/i }));
    expect(onOpenAuth).toHaveBeenCalledWith("login");
    expect(screen.queryByRole("textbox")).toBeNull();
  });

  it("is hidden on the seller's own listing", () => {
    const { container } = render(
      <MessageSeller listing={listing} user={{ id: listing.seller_id }} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("sends a message to the seller and offers to open the conversation", async () => {
    globalThis.fetch.mockResolvedValueOnce(
      mockResponse({ message: { id: 1 }, emailSent: true }),
    );
    const onOpenConversation = vi.fn();

    render(
      <MessageSeller
        listing={listing}
        user={buyer}
        onOpenConversation={onOpenConversation}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Message Seller" }));
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "  Is this still available?  " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      /message sent/i,
    );
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "/api/messages",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        body: JSON.stringify({
          listingId: listing.id,
          body: "Is this still available?",
        }),
      }),
    );

    fireEvent.click(screen.getByRole("button", { name: /view conversation/i }));
    expect(onOpenConversation).toHaveBeenCalledWith(
      listing.id,
      listing.seller_id,
    );
  });

  it("doesn't send an empty message", () => {
    render(<MessageSeller listing={listing} user={buyer} />);

    fireEvent.click(screen.getByRole("button", { name: "Message Seller" }));
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    expect(screen.getByRole("alert")).toHaveTextContent(/write a message/i);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("shows the server's error and keeps the draft", async () => {
    globalThis.fetch.mockResolvedValueOnce(
      mockResponse({ error: "This listing is no longer available." }, false),
    );

    render(<MessageSeller listing={listing} user={buyer} />);
    fireEvent.click(screen.getByRole("button", { name: "Message Seller" }));
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Hi!" } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        /no longer available/i,
      ),
    );
    expect(screen.getByRole("textbox")).toHaveValue("Hi!");
  });
});
