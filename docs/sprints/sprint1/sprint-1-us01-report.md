BookLink — Project Progress & Engineering Work Report
Project: Lakehead University Textbook Marketplace (BookLink)
Team: Tristar Digital
Date: October 12, 2026
Author / Contributor: Morina Singh
1. Executive Summary & Session Objective
The primary objective of today's engineering session was to transition the BookLink platform from an initial repository structure—comprising a bare client skeleton and baseline Express/PostgreSQL backend services—into a functional, vertically integrated application slice.

Through systematic backlog review and technical refinement, the team focused on implementing, verifying, and testing User Story 1 (US-01: Student Registration). By the end of the session, end-to-end functionality was successfully established across the full technology stack. The delivery encompasses domain-restricted validation, secure password hashing, robust database insertion, full API documentation, interactive React UI components, and automated integration test coverage.
2. Project Analysis & Backlog Review
Prior to technical execution, a comprehensive audit of the repository architecture and product backlog was conducted:

Repository Architecture: The repository is structured as a decoupled monorepo. The frontend (client/) utilizes React, Vite, and Tailwind CSS. The backend (server/) is built on Node.js, Express, PostgreSQL, OpenAPI/Swagger JSDoc, and a Jest/Supertest testing framework.
Requirements & Backlog Evaluation: Review of the P1 Requirements Document confirmed 15 total user stories spanning 91 story points across the project lifecycle.
Foundational Architecture: Evaluated initial platform scaffolding established under US-15 (Core Infrastructure Setup), ensuring database connection pooling and environment configurations were operational.
Sprint Focus: Identified US-01 (Student Registration with Lakehead Email — 5 Story Points, Blocker Priority) as the critical prerequisite path for all subsequent authentication and user-dependent capabilities in Sprint 1.

Metric / Parameter
Status / Value
Total Requirements Scope
15 User Stories (91 Story Points)
Selected Sprint Focus
US-01: Student Registration
Priority Level
Blocker (P0)
Target Domain Restriction
@lakeheadu.ca

3. Scope of User Story 1 (US-01)
The scope for US-01 was defined by strict functional and non-functional acceptance criteria required to guarantee data integrity and operational security:

Domain Verification: Strict server-side and client-side enforcement limiting registration exclusively to official @lakeheadu.ca email addresses.
Cryptographic Security (NFR-02 Compliance): Mandatory one-way password salting and hashing prior to persistence in the database layer. Raw passwords must never be stored or logged.
Conflict Handling: Graceful rejection of duplicate email address registrations, returning an explicit HTTP 409 Conflict status code.
Input Validation: Comprehensive validation guarding against missing, malformed, or undersized payload attributes (e.g., short passwords or empty fields).
User Interface: A clean, accessible, and responsive React component providing real-time client feedback and status notifications.
4. Technical Implementation Details
The implementation spanned all layers of the platform architecture. The key modifications and newly introduced modules are outlined below.
Dependency Addition
Added bcryptjs to the backend workspace to facilitate asynchronous password salting and hashing without native compilation overhead.
Database Layer (server/src/models/userModel.js)
Implemented findUserByEmail utilizing parameterized SQL queries against the users PostgreSQL table to prevent SQL injection vulnerabilities.
Implemented createUser to handle secure inserts, returning generated user identifiers and timestamps while omitting sensitive credential data.
Controller Layer (server/src/controllers/authController.js)
Implemented payload sanitization and regex validation enforcing @lakeheadu.ca email structure.
Integrated pre-lookup logic using findUserByEmail to throw an early HTTP 409 Conflict if an account exists.
Applied bcryptjs password hashing using 10 salt rounds before dispatching records to the database model.
Formatted structured JSON responses that return essential profile metadata while explicitly stripping password hashes.
Route Layer & API Documentation (server/src/routes/auth.js)
Created the primary authentication router exposing POST /api/auth/register.
Embedded OpenAPI/Swagger JSDoc annotations specifying request body schemas, required fields, and possible status codes (201 Created, 400 Bad Request, 409 Conflict).
Mounted the authentication router within the primary Express application (server/src/app.js).
Frontend Client Layer (client/src/Register.jsx & client/src/App.jsx)
Built a dedicated React registration component configured with Tailwind CSS utility classes for dynamic styling.
Added client-side validation logic verifying matching password confirmation fields, minimum character counts, and domain matching.
Integrated asynchronous fetch calls to dispatch JSON payloads to the backend API.
Implemented stateful UI feedback banners to render inline success indicators and contextual error notifications dynamically.
5. Testing & Quality Assurance
Quality assurance involved both automated testing suites and manual end-to-end verification.
Automated Integration Tests (server/tests/auth.test.js)
A robust test suite was developed using Jest and Supertest to validate the HTTP endpoints against an isolated database context:

Test Case 1: Successful user registration returning HTTP 201 and sanitized payload.
Test Case 2: Rejection of non-Lakehead email domains returning HTTP 400.
Test Case 3: Rejection of missing required fields returning HTTP 400.
Test Case 4: Rejection of duplicate registration attempts returning HTTP 409.

=============================== Coverage Summary ===============================

Statements   : 100% ( 34/34 )

Branches     : 100% ( 12/12 )

Functions    : 100% (  8/8  )

Lines        : 100% ( 34/34 )

Result       : 3 passed suites, 8 passed tests (100% pass rate)

================================================================================
Manual End-to-End & Acceptance Verification
Environment Alignment: Resolved client-to-server port misalignment between Vite (localhost:5173) and Express (localhost:5001), establishing proper CORS headers and request proxying.
User Flow Verification: Executed live register flow using testuser@lakeheadu.ca. Confirmed entry generation in PostgreSQL.
Boundary Testing: Attempted re-registration with identical credentials; verified the UI correctly displayed the expected duplicate user error banner.
6. Next Steps & Sprint Roadmap
With US-01 complete and verified, the engineering roadmap for the remainder of Sprint 1 involves the following sequence:

US-02 (Secure Session Login & Logout): Implement JWT issuing/verification or session handling to enable authenticated persistent user state.
US-08 (Protected Contact Information): Restrict access to seller contact details, ensuring only verified, logged-in Lakehead students can view contact attributes.
Sprint Tracking: Maintain velocity targets to complete the remaining Sprint 1 story points on schedule.

