import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { vi, describe, it, expect, beforeEach } from "vitest";
import Register from "./Register";

globalThis.fetch = vi.fn();

const fillForm = ({ firstName = "Nick" } = {}) => {
  fireEvent.change(screen.getByLabelText(/first name/i), {
    target: { value: firstName },
  });
  fireEvent.change(screen.getByLabelText(/lakehead email/i), {
    target: { value: "student@lakeheadu.ca" },
  });
  fireEvent.change(screen.getByLabelText(/^password$/i), {
    target: { value: "Password123!" },
  });
  fireEvent.change(screen.getByLabelText(/confirm password/i), {
    target: { value: "Password123!" },
  });
};

const submit = () =>
  fireEvent.submit(
    screen.getByRole("button", { name: /register/i }).closest("form"),
  );

describe("Register Component (US-01)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("asks for the user's first name", () => {
    render(<Register />);

    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
  });

  it("shows an error and does not submit when the first name is blank", async () => {
    render(<Register />);

    fillForm({ firstName: "   " });
    submit();

    expect(
      await screen.findByText(/please enter your first name/i),
    ).toBeInTheDocument();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("sends the trimmed first name with the registration request", async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ user: { id: "1", first_name: "Nick" } }),
    });

    render(<Register />);

    fillForm({ firstName: "  Nick " });
    submit();

    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled());

    const [, options] = globalThis.fetch.mock.calls[0];
    expect(JSON.parse(options.body)).toEqual({
      email: "student@lakeheadu.ca",
      password: "Password123!",
      first_name: "Nick",
    });
    expect(
      await screen.findByText(
        /check student@lakeheadu.ca for a confirmation link/i,
      ),
    ).toBeInTheDocument();
  });
});
