import React, { useState } from "react";
import PropTypes from "prop-types";

const CAMPUS_MEETUP_ZONES = [
  "Agora",
  "Library",
  "Student Union (LUSU)",
  "CJ Sanders Fieldhouse",
  "University Centre",
];

const BOOK_CONDITIONS = ["New", "Like New", "Good", "Fair", "Poor"];

const CreateListingForm = ({ sellerId, onSuccess }) => {
  const [formData, setFormData] = useState({
    title: "",
    isbn: "",
    course_code: "",
    edition: "",
    price: "",
    condition: "",
    meetup_zone: "",
    description: "",
  });

  const [photo, setPhoto] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setPhoto(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    const { title, course_code, price, condition, meetup_zone, description } =
      formData;

    if (!title || !course_code || !condition || !meetup_zone || !description) {
      setErrorMessage("Please fill in all mandatory fields.");
      return;
    }

    if (price === "" || isNaN(price) || Number(price) < 0) {
      setErrorMessage("Price must be a valid non-negative number.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/listings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          price: parseFloat(price),
          seller_id: sellerId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create listing");
      }

      if (photo && data.id) {
        const photoFormData = new FormData();
        photoFormData.append("photo", photo);

        const photoResponse = await fetch(`/api/listings/${data.id}/photos`, {
          method: "POST",
          body: photoFormData,
        });

        if (!photoResponse.ok) {
          const photoData = await photoResponse.json();
          console.error("Photo upload warning:", photoData.error);
        }
      }

      if (onSuccess) {
        onSuccess(data);
      }
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="create-listing-form">
      <h2>Create Textbook Listing</h2>

      {errorMessage && (
        <div className="error-banner" role="alert">
          {errorMessage}
        </div>
      )}

      <div className="form-group">
        <label htmlFor="title">Book Title *</label>
        <input
          id="title"
          name="title"
          type="text"
          value={formData.title}
          onChange={handleChange}
        />
      </div>

      <div className="form-group">
        <label htmlFor="isbn">ISBN</label>
        <input
          id="isbn"
          name="isbn"
          type="text"
          value={formData.isbn}
          onChange={handleChange}
        />
      </div>

      <div className="form-group">
        <label htmlFor="course_code">Course Code *</label>
        <input
          id="course_code"
          name="course_code"
          type="text"
          placeholder="e.g. COMP-1411"
          value={formData.course_code}
          onChange={handleChange}
        />
      </div>

      <div className="form-group">
        <label htmlFor="edition">Edition</label>
        <input
          id="edition"
          name="edition"
          type="text"
          value={formData.edition}
          onChange={handleChange}
        />
      </div>

      <div className="form-group">
        <label htmlFor="price">Price ($) *</label>
        <input
          id="price"
          name="price"
          type="number"
          step="0.01"
          value={formData.price}
          onChange={handleChange}
        />
      </div>

      <div className="form-group">
        <label htmlFor="condition">Condition *</label>
        <select
          id="condition"
          name="condition"
          value={formData.condition}
          onChange={handleChange}
        >
          <option value="">Select Condition</option>
          {BOOK_CONDITIONS.map((cond) => (
            <option key={cond} value={cond}>
              {cond}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="meetup_zone">Campus Meetup Zone *</label>
        <select
          id="meetup_zone"
          name="meetup_zone"
          value={formData.meetup_zone}
          onChange={handleChange}
        >
          <option value="">Select Meetup Location</option>
          {CAMPUS_MEETUP_ZONES.map((zone) => (
            <option key={zone} value={zone}>
              {zone}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="description">Description *</label>
        <textarea
          id="description"
          name="description"
          rows="4"
          value={formData.description}
          onChange={handleChange}
        />
      </div>

      <div className="form-group">
        <label htmlFor="photo">Upload Photo</label>
        <input
          id="photo"
          name="photo"
          type="file"
          accept="image/*"
          onChange={handleFileChange}
        />
      </div>

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Creating..." : "Create Listing"}
      </button>
    </form>
  );
};

CreateListingForm.propTypes = {
  sellerId: PropTypes.string.isRequired,
  onSuccess: PropTypes.func,
};

export default CreateListingForm;
