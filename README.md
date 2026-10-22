# BookLink

**A campus-only marketplace for buying and selling used textbooks among Lakehead University (Thunder Bay) students.**

Students often overpay for new textbooks or rely on unverified social media groups to find used ones. BookLink limits access to verified `@lakeheadu.ca` accounts, so students trade safely with other members of their own community.

Built by **Tristar Digital** for the Software Engineering course at Lakehead University.

---

## Table of Contents

- [Project Status](#project-status)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Running the App](#running-the-app)
- [Running the Tests](#running-the-tests)
- [API Documentation](#api-documentation)
- [Trying the Moderation Dashboard](#trying-the-moderation-dashboard)
- [Continuous Integration](#continuous-integration)
- [Development Workflow](#development-workflow)
- [Team](#team)
- [License](#license)

---

## Project Status

BookLink is under active development. The current milestone (P2) delivers the authentication foundation, the first seller workflow and a moderation dashboard. Browsing and searching listings is the next priority.

## Features

### Implemented

| Story | Feature | Description |
|-------|---------|-------------|
| US-01 | Student registration | Only `@lakeheadu.ca` emails are accepted. Passwords are hashed with bcrypt and duplicate accounts are rejected. |
| US-02 | Login, logout and sessions | Cookie-based sessions (HttpOnly cookie, hashed token stored in the database). The session is restored on page load. |
| US-06 | Create a listing | Title, ISBN, course code, edition, price, condition, meetup zone, description and an optional photo (stored in Supabase Storage). |
| US-08 | Protected seller contact | The seller's email is only returned to authenticated users (`GET /api/listings/:id/contact`). The UI component exists but is not yet placed on a page. |
| US-12 | Moderation (partial) | Admins and moderators can view the reports queue, remove listings and suspend users. |

### Planned

- Browse, search and filter listings (US-03, US-04)
- Listing detail page that shows seller contact information
- Favourites, in-app messaging and seller ratings (US-05, US-09, US-10)
- User-submitted reports and seller listing management (US-11, US-07)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React, Vite, Tailwind CSS |
| Backend | Node.js, Express |
| Database | PostgreSQL |
| File storage | Supabase Storage (listing photos) |
| Auth | Session cookies, bcrypt |
| API docs | Swagger UI |
| Testing | Jest and Supertest (server), Vitest and React Testing Library (client) |
| Tooling | ESLint, Prettier, Husky, lint-staged, GitHub Actions |

## Project Structure

```
BookLink/
├── client/                 # React + Vite frontend
│   └── src/
│       ├── components/     # Navbar, AuthModal, Login, Register,
│       │                   # CreateListingForm, SellerContact,
│       │                   # ModerationDashboard, ...
│       └── App.jsx
├── server/                 # Express API
│   ├── src/
│   │   ├── config/         # db, session, upload (Multer), supabase, swagger
│   │   ├── controllers/    # auth, listing, photo, admin
│   │   ├── middleware/     # requireAuth, requireRole
│   │   ├── models/         # user, session, listing, photo, admin
│   │   ├── routes/         # auth, listings, admin, health
│   │   └── app.js
│   └── tests/              # unit/ and integration/ tests
├── docs/                   # Sprint reports and project documents
├── schema.sql              # PostgreSQL schema
├── .github/workflows/      # CI pipeline
└── package.json            # Root scripts
```

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (LTS version recommended) and npm
- [PostgreSQL](https://www.postgresql.org/) running locally (or a connection string to a hosted database)
- A [Supabase](https://supabase.com/) project with a storage bucket, if you want to test photo uploads

### 1. Clone the repository

```bash
git clone https://github.com/msingh-crypto/BookLink.git
cd BookLink
```

### 2. Install dependencies

```bash
cd server && npm install
cd ../client && npm install
```

### 3. Configure environment variables

Create a `.env` file in `server/`. Use `server/.env.example` as a reference if it exists; the names below should match what the code expects, so adjust them if they differ.

```env
# Server
PORT=5001

# PostgreSQL
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/booklink

# Supabase Storage (needed only for photo uploads)
SUPABASE_URL=https://YOUR-PROJECT.supabase.co
SUPABASE_KEY=your-service-key
```

> **Important: use port 5001.** The client calls `http://localhost:5001`, but the server's default port is 5000. Setting `PORT=5001` keeps them in sync. The client runs on `http://localhost:5173`.

### 4. Create the database and tables

Create an empty database (for example `booklink`), then apply the schema:

```bash
cd server
npm run db:init
```

## Running the App

Open two terminals.

**Terminal 1: API server**

```bash
cd server
npm run dev
```

**Terminal 2: frontend**

```bash
cd client
npm run dev
```

Then open **http://localhost:5173**.

### Quick tour

1. Click **Register** and sign up with a `@lakeheadu.ca` email.
2. Log in with the same credentials.
3. Click **+ Sell Book**, fill in the form and submit.
4. Open **http://localhost:5001/api-docs** to explore the API.

## Running the Tests

**Server** (needs PostgreSQL and the same environment variables as above; run `db:init` first):

```bash
cd server
npm run db:init
npm test
```

**Client:**

```bash
cd client
npm test
```

From the repository root you can also use `npm run test:server` and `npm run test:client`.

### What is tested

| Area | Files |
|------|-------|
| Registration (US-01) | `server/tests/auth.test.js` |
| Listings and photo upload (US-06) | `server/tests/integration/listings.test.js`, `upload.test.js` |
| Protected contact (US-08) | `server/tests/integration/sellerContact.test.js` |
| Moderation (US-12) | `server/tests/integration/moderation.test.js` |
| Health check and database pool | `server/tests/integration/health.test.js`, `server/tests/unit/db.test.js` |
| React components | `CreateListingForm`, `SellerContact`, `Navbar`, `App` (`*.test.jsx`) |

## API Documentation

With the server running, interactive Swagger documentation is available at:

**http://localhost:5001/api-docs**

Main endpoints:

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/api/auth/register` | No | Register a student |
| POST | `/api/auth/login` | No | Log in |
| POST | `/api/auth/logout` | Yes | Log out |
| GET | `/api/auth/me` | Yes | Get the current user |
| POST | `/api/listings` | Yes | Create a listing |
| POST | `/api/listings/:id/photos` | Yes | Upload a listing photo |
| GET | `/api/listings/:id/contact` | Yes | Get the seller's email |
| GET | `/api/health` | No | Health check |
| `/api/admin/*` | | Admin or moderator | Reports queue, remove listing, suspend user |

## Trying the Moderation Dashboard

The dashboard only appears for users whose role is `admin` or `moderator`. To try it locally, register a normal account, then promote it in the database:

```sql
UPDATE users SET role = 'admin' WHERE email = 'you@lakeheadu.ca';
```

Reports must exist in the `reports` table for the queue to show anything, so insert a few test rows first. (A seed script is planned.)

## Continuous Integration

GitHub Actions (`.github/workflows/ci.yml`) runs on every push and pull request to `main` and `develop`. It starts a PostgreSQL service, initializes the schema, runs linting, the server tests and the client tests, and builds the frontend.

## Development Workflow

- Work on a feature branch (for example `feat/US-03-search`) and open a pull request into `main`.
- Use clear commit prefixes: `feat:`, `fix:`, `docs:`, `chore:`, `ci:`, `test:`.
- Husky and lint-staged run linting and formatting before each commit.
- Make sure the tests pass locally before opening a pull request.

## Team

**Tristar Digital**

| Member | GitHub |
|--------|--------|
| Morina Singh | [@msingh-crypto](https://github.com/msingh-crypto) |
| Ricardo Andrade | [@nopusmiau](https://github.com/nopusmiau) |
| Jatin Sagar | [@justacoder52](https://github.com/justacoder52) |
| Nicholas D'Uva |  |

## License

License to be decided by the team.
