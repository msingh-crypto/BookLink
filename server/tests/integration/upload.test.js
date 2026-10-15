const request = require("supertest");
const app = require("../../src/app");

describe("POST /api/listings/:id/photos - Upload Listing Photo", () => {
  it("should return 400 if no image file is provided", async () => {
    const dummyListingId = "11111111-1111-1111-1111-111111111111";

    const res = await request(app).post(
      `/api/listings/${dummyListingId}/photos`,
    );

    expect(res.statusCode).toEqual(400);
    expect(res.body).toHaveProperty("error");
  });

  it("should return 400 if file is not an image", async () => {
    const dummyListingId = "11111111-1111-1111-1111-111111111111";

    const res = await request(app)
      .post(`/api/listings/${dummyListingId}/photos`)
      .attach("photo", Buffer.from("hello world"), "test.txt");

    expect(res.statusCode).toEqual(400);
    expect(res.body.error).toMatch(/image/i);
  });
});
