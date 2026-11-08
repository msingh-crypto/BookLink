import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import AdminTaxonomyDashboard from "./AdminTaxonomyDashboard";

describe("AdminTaxonomyDashboard Component", () => {
  const mockCategories = [
    { id: 1, name: "Computer Science", code: "CS", is_active: true },
    { id: 2, name: "Mathematics", code: "MATH", is_active: false },
  ];

  const mockDepartments = [
    {
      id: 1,
      code: "COMP",
      name: "Department of Computer Science",
      is_active: true,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    const mockFetch = vi.fn((url) => {
      if (url.includes("/api/taxonomy/categories")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockCategories),
        });
      }
      if (url.includes("/api/taxonomy/departments")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockDepartments),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    });

    vi.stubGlobal("fetch", mockFetch);
  });

  it("renders categories and departments correctly", async () => {
    render(<AdminTaxonomyDashboard currentUser={{ role: "admin" }} />);

    await waitFor(() => {
      expect(screen.getByText("Computer Science")).toBeInTheDocument();
      expect(
        screen.getByText((content) => content.includes("COMP")),
      ).toBeInTheDocument();
    });
  });

  it("allows adding a new category", async () => {
    render(<AdminTaxonomyDashboard currentUser={{ role: "admin" }} />);

    const nameInput = await screen.findByPlaceholderText(/category name/i);
    const codeInput = screen.getByPlaceholderText(/category code/i);
    const submitBtn = screen.getByRole("button", { name: /add category/i });

    fireEvent.change(nameInput, { target: { value: "Physics" } });
    fireEvent.change(codeInput, { target: { value: "PHYS" } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/admin/taxonomy/categories"),
        expect.objectContaining({ method: "POST" }),
      );
    });
  });
});
