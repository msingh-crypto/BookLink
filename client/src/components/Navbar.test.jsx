import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import Navbar from "./Navbar";

describe("Navbar Component", () => {
  const mockProps = {
    user: null,
    onOpenAuth: vi.fn(),
    onLogout: vi.fn(),
    currentView: "home",
    setCurrentView: vi.fn(),
  };

  it("renders brand heading and navigation links", () => {
    render(<Navbar {...mockProps} />);

    expect(screen.getByText("BookLink")).toBeInTheDocument();
    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.getByText("Books")).toBeInTheDocument();
    expect(screen.getByText("Login")).toBeInTheDocument();
    expect(screen.getByText("Register")).toBeInTheDocument();
  });

  it("renders user information and logout button when logged in", () => {
    const loggedInProps = {
      ...mockProps,
      user: { id: "123", email: "student@lakeheadu.ca" },
    };

    render(<Navbar {...loggedInProps} />);

    expect(screen.getByText("Hi,")).toBeInTheDocument();
    expect(screen.getByText("student")).toBeInTheDocument();
    expect(screen.getByText("Logout")).toBeInTheDocument();
    expect(screen.getByText("+ Sell Book")).toBeInTheDocument();
  });

  it("greets the user by first name when one is saved", () => {
    render(
      <Navbar
        {...mockProps}
        user={{ id: "123", email: "naduva@lakeheadu.ca", first_name: "Nick" }}
      />,
    );

    expect(screen.getByText("Nick")).toBeInTheDocument();
    expect(screen.queryByText("naduva")).not.toBeInTheDocument();
  });
});
