const db = require("../../src/config/db");
const listingModel = require("../../src/models/listingModel");

jest.mock("../../src/config/db", () => ({
  query: jest.fn(),
}));

describe("US-04: Listing Sorting", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    db.query.mockImplementation(async (query) => {
      if (query.includes("COUNT(*)")) {
        return { rows: [{ total: 0 }] };
      }

      return { rows: [] };
    });
  });

  const getSortingQuery = async (sortBy, sortOrder) => {
    await listingModel.getActiveListings({
      limit: 20,
      offset: 0,
      sortBy,
      sortOrder,
    });

    return db.query.mock.calls.find(([query]) => query.includes("ORDER BY"))[0];
  };

  test("sorts price from low to high", async () => {
    const query = await getSortingQuery("price", "asc");

    expect(query).toMatch(/ORDER BY l\.price ASC/);
  });

  test("sorts price from high to low", async () => {
    const query = await getSortingQuery("price", "desc");

    expect(query).toMatch(/ORDER BY l\.price DESC/);
  });

  test("sorts condition in ascending order", async () => {
    const query = await getSortingQuery("condition", "asc");

    expect(query).toMatch(/CASE l\.condition/);
    expect(query).toMatch(/END ASC/);
  });

  test("sorts condition in descending order", async () => {
    const query = await getSortingQuery("condition", "desc");

    expect(query).toMatch(/CASE l\.condition/);
    expect(query).toMatch(/END DESC/);
  });

  test("defaults to newest listings first", async () => {
    const query = await getSortingQuery("newest", "desc");

    expect(query).toMatch(/ORDER BY l\.created_at DESC/);
  });

  test("preserves pagination parameters", async () => {
    await listingModel.getActiveListings({
      limit: 10,
      offset: 5,
      sortBy: "price",
      sortOrder: "asc",
    });

    const listingCall = db.query.mock.calls.find(([query]) =>
      query.includes("ORDER BY"),
    );

    expect(listingCall[1]).toEqual([10, 5]);
  });
});
