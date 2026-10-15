const supabase = require("../config/supabase");
const photoModel = require("../models/photoModel");
const path = require("path");

const uploadListingPhoto = async (req, res) => {
  try {
    const { id: listingId } = req.params;

    if (!req.file) {
      return res.status(400).json({ error: "No image file uploaded." });
    }

    const file = req.file;
    const fileExt = path.extname(file.originalname);
    const fileName = `${listingId}/${Date.now()}${fileExt}`;

    // Upload buffer to Supabase Storage bucket 'listing-photos'
    const { error } = await supabase.storage
      .from("listing-photos")
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        upsert: true,
      });

    if (error) {
      console.error("Supabase Storage Error:", error);
      return res
        .status(500)
        .json({ error: "Failed to upload image to storage." });
    }

    // Get public URL of the uploaded image
    const { data: publicUrlData } = supabase.storage
      .from("listing-photos")
      .getPublicUrl(fileName);

    const publicUrl = publicUrlData.publicUrl;

    // Save image URL into database
    const savedPhoto = await photoModel.addPhotoToListing(listingId, publicUrl);

    return res.status(201).json(savedPhoto);
  } catch (err) {
    console.error("Error handling photo upload:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
};

module.exports = { uploadListingPhoto };
