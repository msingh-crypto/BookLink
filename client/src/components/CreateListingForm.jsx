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
        throw new Error(data.error || "Failed to create listing.");
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

  const inputClasses =
    "w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-slate-800";
  const labelClasses = "block text-sm font-medium text-slate-700 mb-1";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-xl font-bold text-slate-900 border-b pb-2 mb-4">
        Create Textbook Listing
      </h2>

      {errorMessage && (
        <div className="bg-red-50 border-l-4 border-red-500 p-3 text-red-700 text-sm rounded">
          {errorMessage}
        </div>
      )}

      <div>
        <label htmlFor="title" className={labelClasses}>
          Book Title *
        </label>
        <input
          id="title"
          name="title"
          type="text"
          className={inputClasses}
          value={formData.title}
          onChange={handleChange}
          placeholder="e.g. Software Engineering"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="isbn" className={labelClasses}>
            ISBN
          </label>
          <input
            id="isbn"
            name="isbn"
            type="text"
            className={inputClasses}
            value={formData.isbn}
            onChange={handleChange}
            placeholder="e.g. 9780134670942"
          />
        </div>

        <div>
          <label htmlFor="course_code" className={labelClasses}>
            Course Code *
          </label>
          <input
            id="course_code"
            name="course_code"
            type="text"
            className={inputClasses}
            placeholder="e.g. COMP-1411"
            value={formData.course_code}
            onChange={handleChange}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="edition" className={labelClasses}>
            Edition
          </label>
          <input
            id="edition"
            name="edition"
            type="text"
            className={inputClasses}
            value={formData.edition}
            onChange={handleChange}
            placeholder="e.g. 10th Edition"
          />
        </div>

        <div>
          <label htmlFor="price" className={labelClasses}>
            Price ($) *
          </label>
          <input
            id="price"
            name="price"
            type="number"
            step="0.01"
            className={inputClasses}
            value={formData.price}
            onChange={handleChange}
            placeholder="0.00"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="condition" className={labelClasses}>
            Condition *
          </label>
          <select
            id="condition"
            name="condition"
            className={inputClasses}
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

        <div>
          <label htmlFor="meetup_zone" className={labelClasses}>
            Campus Meetup Zone *
          </label>
          <select
            id="meetup_zone"
            name="meetup_zone"
            className={inputClasses}
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
      </div>

      <div>
        <label htmlFor="description" className={labelClasses}>
          Description *
        </label>
        <textarea
          id="description"
          name="description"
          rows="3"
          className={inputClasses}
          value={formData.description}
          onChange={handleChange}
          placeholder="Include details about highlights, notes, or physical condition..."
        />
      </div>

      <div>
        <label htmlFor="photo" className={labelClasses}>
          Upload Photo
        </label>
        <input
          id="photo"
          name="photo"
          type="file"
          accept="image/*"
          className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
          onChange={handleFileChange}
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full mt-4 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md shadow focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
      >
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
