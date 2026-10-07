-- This file is used ONLY to enter new tables and stuff!
-- NEVER INTRODUCE DATA HERE!!!!
-- Enable UUID extension for secure, non-sequential primary keys
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- 1. USERS TABLE
-- US-01: Student Registration (Lakehead email check + cryptographic password storage)
-- US-02: Secure Login & Logout
-- US-12: Moderation & Account Suspension ('suspended' status)
-- US-13: Admin Roles & Permissions ('student', 'moderator', 'admin')
-- =============================================================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL CHECK (email LIKE '%@lakeheadu.ca'),
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'moderator', 'admin')),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- 2. CATEGORIES / DEPARTMENTS TABLE
-- US-04: Filter by department
-- US-13: Admin configuration of categories/departments
-- =============================================================================
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE, -- e.g., "Computer Science", "Business"
    code VARCHAR(10) NOT NULL UNIQUE   -- e.g., "COMP", "BUSI"
);

-- Seed initial categories so you can start posting right away
INSERT INTO categories (name, code) VALUES
    ('Computer Science', 'COMP'),
    ('Business Administration', 'BUSI'),
    ('Engineering', 'ENGI'),
    ('Biology', 'BIOL'),
    ('Psychology', 'PSYC')
ON CONFLICT DO NOTHING;

-- =============================================================================
-- 3. LISTINGS TABLE
-- US-03: Search by title, ISBN, or course code
-- US-04: Multi-facet filter & sort by price, condition, department
-- US-06: Create listing (course code, edition, condition, price, meetup zone)
-- US-07: Seller listing management (status: active, sold, removed)
-- US-08: Protect seller contact info
-- US-12: Moderation removal of policy-violating items
-- =============================================================================
CREATE TABLE listings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id INT REFERENCES categories(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    isbn VARCHAR(20),
    course_code VARCHAR(20) NOT NULL, -- e.g., "COMP-1411"
    edition VARCHAR(50),
    condition VARCHAR(20) NOT NULL CHECK (condition IN ('New', 'Like New', 'Good', 'Fair', 'Poor')),
    price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
    meetup_zone VARCHAR(100) NOT NULL, -- On-campus meetup location
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'sold', 'removed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes to enforce < 2s search/filter performance targets (NFR-01)
CREATE INDEX idx_listings_course_code ON listings(course_code);
CREATE INDEX idx_listings_isbn ON listings(isbn);
CREATE INDEX idx_listings_title ON listings(title);
CREATE INDEX idx_listings_price ON listings(price);
CREATE INDEX idx_listings_status ON listings(status);

-- =============================================================================
-- 4. LISTING PHOTOS TABLE
-- US-06: Support photo uploads for book listings
-- =============================================================================
CREATE TABLE listing_photos (
    id BIGSERIAL PRIMARY KEY,
    listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- 5. FAVOURITES TABLE
-- US-05: Save listings to favourites folder
-- =============================================================================
CREATE TABLE favourites (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, listing_id)
);

-- =============================================================================
-- 6. MESSAGES / CONVERSATIONS TABLE
-- US-09: In-app direct messaging and inbox
-- =============================================================================
CREATE TABLE messages (
    id BIGSERIAL PRIMARY KEY,
    listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message_body TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_messages_participants ON messages(sender_id, receiver_id);

-- =============================================================================
-- 7. SELLER RATINGS & REVIEWS TABLE
-- US-10: Rate student sellers after transaction (1-5 stars)
-- =============================================================================
CREATE TABLE seller_ratings (
    id BIGSERIAL PRIMARY KEY,
    seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    buyer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_buyer_seller_review UNIQUE (seller_id, buyer_id)
);

-- =============================================================================
-- 8. REPORTS TABLE
-- US-11: Report suspicious listings or user profiles
-- US-12: Admin moderation dashboard processing queue
-- =============================================================================
CREATE TABLE reports (
    id BIGSERIAL PRIMARY KEY,
    reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reported_listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
    reported_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    reason_category VARCHAR(100) NOT NULL, -- e.g., 'Spam', 'Scam', 'Inappropriate'
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'action_taken', 'dismissed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);