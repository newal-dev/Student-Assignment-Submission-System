# AssignTrack — Student Assignment Submission System

A full-stack web application that lets teachers create and manage assignments, and gives students a centralized place to view, complete, and submit their work — with grading and feedback built in.

## Tech Stack

**Backend**
- Node.js + Express
- PostgreSQL (via `pg`)
- JWT authentication (`jsonwebtoken`)
- `bcryptjs` for password hashing
- `express-validator` for request validation
- `multer` for file upload handling
- `winston` + `morgan` for logging
- `express-rate-limit`, `sanitize-html`, `cors` for security/hardening

**Frontend**
- Vanilla HTML/CSS/JavaScript (no framework/build step)
- Served as static files via [`serve`](https://github.com/vercel/serve)

## Project Structure

```
Student Assignment Submission System/
├── backend/
│   ├── server.js               # Entry point — connects to DB, starts Express
│   ├── src/
│   │   ├── app.js              # Express app setup (middleware, routes, error handling)
│   │   ├── config/
│   │   │   ├── database.js     # PostgreSQL connection pool
│   │   │   └── upload.js       # Multer file upload config
│   │   ├── controllers/        # Request handlers (auth, assignments, submissions, grading)
│   │   ├── middleware/
│   │   │   ├── auth.js         # JWT authentication + role-based authorization
│   │   │   ├── validate.js     # express-validator schemas (assignments, auth)
│   │   │   ├── sanitize.js     # Input sanitization
│   │   │   ├── rateLimiter.js
│   │   │   ├── requestLogger.js
│   │   │   └── errorHandler.js
│   │   ├── models/              # DB query layer (User, Assignment, Submission)
│   │   ├── routes/              # Route definitions, mounted under /api
│   │   └── utils/
│   │       ├── logger.js
│   │       └── validation.js    # express-validator schemas (submissions — legacy, see note below)
│   ├── public/uploads/          # Uploaded submission files served statically
│   └── logs/                    # Winston log output
├── frontend/
│   └── public/                  # Static site root (served via `serve public`)
│       ├── index.html
│       ├── login.html / register.html
│       ├── student-dashboard.html
│       ├── teacher-dashboard.html
│       ├── assignment-detail.html
│       ├── css/
│       └── js/
│           ├── api.js           # Central API client (fetch wrapper, auth headers)
│           ├── auth.js          # Login/register/session/route-guarding
│           ├── utils.js         # Shared helpers (formatting, toasts, card rendering)
│           ├── student.js       # Student dashboard logic
│           ├── teacher.js       # Teacher dashboard logic
│           └── assignment-detail.js  # Single-assignment view + submission form
└── database/
    └── schema.sql                # Table definitions, indexes, triggers, sample data
```

## Data Model

Three tables, defined in `database/schema.sql`:

- **`users`** — students and teachers in one table, distinguished by `role` (`'student'` | `'teacher'`)
- **`assignments`** — created by a teacher (`teacher_id`), has a `title`, `description`, `due_date`
- **`submissions`** — one per (student, assignment) pair (enforced by a unique constraint), holds `content` and/or `file_url`, plus `grade` and `feedback` once graded

Timestamps (`created_at`/`updated_at`) are auto-maintained via Postgres triggers.

## API Overview

All routes are mounted under `/api` (see `backend/src/routes/index.js`).

| Base path | Purpose | Auth |
|---|---|---|
| `/api/auth` | register, login, profile, change password, logout | mixed |
| `/api/assignments` | CRUD for assignments, statistics | authenticated (write ops: teacher only) |
| `/api/submissions` | create/update/delete/grade submissions | authenticated (role-gated per route) |
| `/api/grading` | grading dashboard, analytics, CSV export, batch grading | teacher only |

Full request/response shapes are documented via comments directly above each controller function in `backend/src/controllers/`.

## Setup

### 1. Database
```bash
createdb assignment_system
psql -d assignment_system -f database/schema.sql
```

### 2. Backend
```bash
cd backend
npm install
cp .env.example .env   # then fill in DB_PASSWORD and JWT_SECRET
npm run dev             # nodemon, http://localhost:5000
```

Required `.env` values (see `.env.example`):
```
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=assignment_system
DB_USER=postgres
DB_PASSWORD=your_password_here
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:3000
```

### 3. Frontend
```bash
cd frontend
serve public             # http://localhost:3000
```

The frontend's API base URL is hardcoded in `frontend/public/js/api.js` (`API_BASE_URL = 'http://localhost:5000/api'`) — update this if the backend runs elsewhere.

> **Note:** Do not add a `serve.json` file to `frontend/public/` unless you specifically need to. Its mere presence has been observed to interfere with `serve`'s automatic `index.html` resolution at the root path, independent of whatever options are set inside it. All internal links in this app already use full `.html` paths, so `serve`'s default config works correctly without any override.

## Roles & Permissions

- **Students** can view assignments, submit work (text and/or file upload), edit/delete their own ungraded submissions before the due date, and view their grades/feedback.
- **Teachers** can create/edit/delete assignments, view all submissions for their assignments, grade and leave feedback, and view class-wide statistics.

Authorization is enforced both at the route level (`authorize('student' | 'teacher')` middleware) and again inside controllers as a defense-in-depth check.

## Known Issues / Notes for Contributors

- **Two parallel validation systems exist in the backend:** `backend/src/utils/validation.js` (used by `submissionRoutes.js`) and `backend/src/middleware/validate.js` (used by `assignmentRoutes.js` and `authRoutes.js`, and more thorough — includes `.escape()` calls and a fuller `createSubmission` schema that isn't currently wired up). Worth consolidating onto `middleware/validate.js`.
- File uploads are stored locally under `backend/public/uploads/` and served statically — there's no cloud storage integration.
- No automated test framework is wired in yet; `backend/test-*.js` are standalone manual test scripts, not a test suite (e.g. no Jest/Mocha runner).
