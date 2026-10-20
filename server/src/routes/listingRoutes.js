const express = require("express");
const router = express.Router();
const upload = require("../config/upload");
const requireAuth = require("../middleware/requireAuth");
const {
  handleCreateListing,
  handleGetSellerContact,
} = require("../controllers/listingController");
const { uploadListingPhoto } = require("../controllers/photoController");

/**
 * @swagger
 * components:
 *   schemas:
 *     ListingInput:
 *       type: object
 *       required:
 *         - title
 *         - course_code
 *         - price
 *         - condition
 *         - meetup_zone
 *         - description
 *         - seller_id
 *       properties:
 *         title:
 *           type: string
 *           example: "Software Engineering"
 *         isbn:
 *           type: string
 *           example: "9780134670942"
 *         course_code:
 *           type: string
 *           example: "COMP-3155"
 *         edition:
 *           type: string
 *           example: "10th Edition"
 *         price:
 *           type: number
 *           format: float
 *           example: 45.00
 *         condition:
 *           type: string
 *           enum: [New, Like New, Good, Fair, Poor]
 *           example: "Good"
 *         meetup_zone:
 *           type: string
 *           enum: [Agora, Library, Student Union (LUSU), CJ Sanders Fieldhouse, University Centre]
 *           example: "Agora"
 *         description:
 *           type: string
 *           example: "Great condition book without highlights."
 *         seller_id:
 *           type: string
 *           format: uuid
 *           example: "11111111-1111-1111-1111-111111111111"
 */

/**
 * @swagger
 * /api/listings:
 *   post:
 *     summary: Create a new textbook listing (US-06)
 *     tags: [Listings]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ListingInput'
 *     responses:
 *       201:
 *         description: Listing created successfully
 *       400:
 *         description: Invalid input or missing mandatory fields
 *       500:
 *         description: Server error
 */
router.post("/listings", handleCreateListing);

/**
 * @swagger
 * /api/listings/{id}/photos:
 *   post:
 *     summary: Upload a photo for a textbook listing (US-06)
 *     tags: [Listings]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The UUID of the listing
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               photo:
 *                 type: string
 *                 format: binary
 *                 description: Image file (JPEG, PNG, WEBP)
 *     responses:
 *       201:
 *         description: Photo uploaded successfully
 *       400:
 *         description: Missing photo or upload error
 *       404:
 *         description: Listing not found
 *       500:
 *         description: Server error
 */
router.post(
  "/listings/:id/photos",
  (req, res, next) => {
    upload.single("photo")(req, res, (err) => {
      if (err) {
        return res.status(400).json({ error: err.message });
      }
      next();
    });
  },
  uploadListingPhoto,
);

/**
 * @swagger
 * /api/listings/{id}/contact:
 *   get:
 *     summary: Get protected seller contact information (US-08)
 *     tags: [Listings]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The UUID of the listing
 *     responses:
 *       200:
 *         description: Seller email retrieved successfully
 *         content:
 *           application/json:
 *             example:
 *               email: "seller@lakeheadu.ca"
 *       401:
 *         description: Unauthorized - Authentication required
 *       404:
 *         description: Listing or seller not found
 *       500:
 *         description: Server error
 */
router.get("/listings/:id/contact", requireAuth, handleGetSellerContact);

module.exports = router;
