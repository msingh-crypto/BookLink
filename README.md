# BookLink

A campus-only marketplace where Lakehead University (Thunder Bay) students can buy and sell used textbooks. Access is limited to verified `@lakeheadu.ca` accounts, and seller contact details are only shown to logged-in students.

**Team:** Tristar Digital

[![CI](https://github.com/msingh-crypto/BookLink/actions/workflows/ci.yml/badge.svg)](https://github.com/msingh-crypto/BookLink/actions/workflows/ci.yml)

---

## Table of Contents

1. [Features](#features)
2. [Project Status](#project-status)
3. [Tech Stack](#tech-stack)
4. [Project Structure](#project-structure)
5. [Getting Started](#getting-started)
6. [Running Tests](#running-tests)
7. [API Documentation](#api-documentation)
8. [Demo Walkthrough](#demo-walkthrough)
9. [Contributing](#contributing)
10. [Team](#team)

---

## Features

**Available now**

- **Student registration (US-01):** `@lakeheadu.ca` email, password and first name. Passwords are hashed with bcrypt and duplicate accounts are rejected.
- **Login, logout and sessions (US-02):** HttpOnly cookie sessions, restored on page load.
- **Browse listings:** public, paginated feed (newest first) with a detail view.
- **Create listings with photos (US-06):** title, ISBN, course code, edition, price, condition, campus meetup zone and description, with optional photo upload.
- **Protected seller contact (US-08):** the seller's email is only returned to authenticated users.
- **Moderation (US-12, partial):** admins and moderators can review the reports queue, remove listings and suspend users.

## Project Status

| Story | Feature | Status |
|---|---|---|
| US-01 | Student registration | Done |
| US-02 | Login / logout / sessions | Done |
| US-06 | Create listing + photos | Done |
| US-08 | Protected seller contact | Backend done; UI component not yet shown on the detail page |
| US-12 | Moderation dashboard | Partial (queue, remove listing, suspend user) |
| US-15 | Modular architecture, API docs | Partial |
| US-03 | Search by title / ISBN / course code | In progress |
| US-04 | Filtering and sorting | In progress (branch `US-04-Sorting`) |
| US-05 | Favourites | Planned |
| US-07 | Seller listing management | Planned |
| US-09 | In-app messaging | Planned |
| US-10 | Seller ratings | Planned |
| US-11 | User-submitted reports | Planned |
| US-13 | Admin roles and category management | Planned |
| US-14 | Admin analytics | Planned |

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React, Vite, Tailwind CSS |
| Backend | Node.js, Express |
| Database | PostgreSQL (UUID primary keys) |
| File storage | Supabase Storage (listing photos) |
| Uploads | Multer |
| API docs | Swagger (OpenAPI) |
| Testing | Jest + Supertest (server), Vitest + React Testing Library (client) |
| CI | GitHub Actions |

## Project Structure

```
BookLink/
├── client/                  # React + Vite frontend
│   └── src/components/      # App, Navbar, ListingsView, CreateListingForm, ModerationDashboard, ...
├── server/                  # Express API
│   ├── src/
│   │   ├── config/          # db, session, upload, supabase, swagger
│   │   ├── controllers/     # auth, listing, photo, admin
│   │   ├── middleware/      # requireAuth, requireRole
│   │   ├── models/          # user, session, listing, photo, admin
│   │   └── routes/          # auth, listings, admin, health
│   └── tests/               # unit and integration tests
├── docs/sprints/            # sprint reports
├── schema.sql               # database schema
└── .github/workflows/       # CI pipeline
```

## Getting Started

### Prerequisites

- Node.js (LTS) and npm
- PostgreSQL running locally
- A Supabase project with a storage bucket for listing photos

### 1. Clone and install

```bash
git clone https://github.com/msingh-crypto/BookLink.git
cd BookLink

cd server && npm install
cd ../client && npm install
```

### 2. Configure environment variables

Create a `.env` file in `server/` (use the example file in the repository if one is provided). Typical values:

```env
PORT=5001
DATABASE_URL=postgresql://<user>:<password>@localhost:5432/<database>
SESSION_SECRET=<a long random string>
SUPABASE_URL=<your Supabase project URL>
SUPABASE_KEY=<your Supabase service key>
SUPABASE_BUCKET=<your storage bucket name>
```

> Variable names must match what `server/src/config` reads. If anything differs, follow the names in the repository's example env file.

### 3. Initialize the database

```bash
cd server
npm run db:init
```

### 4. Start the app

In one terminal (API on port **5001**):

```bash
cd server
npm run dev
```

In a second terminal (frontend on port **5173**):

```bash
cd client
npm run dev
```

Open http://localhost:5173.

## Running Tests

The server tests need PostgreSQL, a valid `.env` and an initialized schema.

```bash
# Server
cd server
npm run db:init
npm test

# Client
cd client
npm test

# From the repository root
npm run test:server
npm run test:client
```

GitHub Actions (`.github/workflows/ci.yml`) runs lint, server tests, client tests and the frontend build on every push and pull request.

## API Documentation

With the server running, interactive Swagger documentation is available at http://localhost:5001/api-docs.

Main endpoints:

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| POST | `/api/auth/register` | Public | Register a student |
| POST | `/api/auth/login` | Public | Log in |
| POST | `/api/auth/logout` | Authenticated | Log out |
| GET | `/api/auth/me` | Authenticated | Restore session / current user |
| GET | `/api/listings` | Public | Paginated active listings |
| GET | `/api/listings/:id` | Public | Single listing |
| POST | `/api/listings` | Authenticated | Create a listing (+ photo) |
| GET | `/api/listings/:id/contact` | Authenticated | Seller email |
| GET/POST | `/api/admin/*` | Admin / moderator | Reports queue, remove listing, suspend user |

> Confirm exact paths and methods against `/api-docs` before sharing.

## Demo Walkthrough

1. Start the database, server and client as described above.
2. Register with a `@lakeheadu.ca` email, password and first name, then log in.
3. Open the **Books** view, browse the paginated listings and open a listing detail card.
4. Click **+ Sell Book** and create a listing, optionally with a photo.
5. *(Optional, for moderation)* Promote your user to admin in the database:
   ```sql
   UPDATE users SET role = 'admin' WHERE email = '<your email>';
   ```
   Then open the **Moderation** view to review the reports queue, remove a listing or suspend a user. Reports must be seeded in the database for now, because user-submitted reports are not built yet.

## Contributing

- Create a feature branch from `main` named after the story, for example `US-04-Sorting`.
- Keep commits small and write clear messages.
- Open a pull request into `main`. A team member reviews and approves it before merging.
- Make sure lint and tests pass locally and that CI is green before requesting review.
- Do not commit `.env` files or secrets.

## Team

**Tristar Digital**

| Member | GitHub |
|---|---|
| Morina Singh | [msingh-crypto](https://github.com/msingh-crypto) / morinasingh |
| Ricardo Andrade | [nopusmiau](https://github.com/nopusmiau) |
| Nicholas D’Uva | [nicholasDuva](https://github.com/nicholasDuva) |
| Jatin Sagar | [justacoder52](https://github.com/justacoder52) |

Course project for Lakehead University. Sprint documentation is in [`docs/sprints/`](docs/sprints/).
