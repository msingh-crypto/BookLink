import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import Navbar from "./Navbar";

describe("Navbar Component", () => {
  it("renders brand heading and navigation links", () => {
    render(<Navbar />);

    expect(screen.getByText("BookLink")).toBeInTheDocument();
    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.getByText("Books")).toBeInTheDocument();
    expect(screen.getByText("API Docs")).toBeInTheDocument();
  });
});
