# Deutsch Leseecke

Modern German reading platform built with Express and EJS. Stories are gated behind authentication and stored in MySQL. The admin account (`karen12389033@gmail.com`) can publish new stories directly from the web UI.

## Key Features

- Secure sessions with signup/login flows (passwords hashed with bcrypt).
- Story catalogue available only to authenticated readers.
- Admin tooling for creating stories from the browser with live database persistence.
- Level filtering (A1&ndash;C2), improved navigation, and refined UI.
- Express + EJS server-side rendering with modular partials and modern styling.

## Tech Stack

- **Runtime:** Node.js 18+, Express 4
- **Views:** EJS templates
- **Database:** MySQL (via `mysql2/promise`)
- **Styles:** Custom CSS (Inter font, responsive layout)
- **Auth:** `express-session` + hashed passwords (`bcryptjs`)

## Getting Started

1. Install dependencies
   ```bash
   npm install
   ```
2. Provide environment variables (see `.env.example` if available)  
   Required keys:
   ```env
   PORT=3000
   SESSION_SECRET=replace-me
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_USER=your_mysql_user
   DB_PASSWORD=your_mysql_password
   DB_NAME=deutsch_leseecke
   DB_SSL=false
   ```
3. Prepare the database schema (see below).
4. Run the server:
   ```bash
   npm run dev   # nodemon auto-reload
   # or
   npm start
   ```
5. Visit [http://localhost:3000](http://localhost:3000).

## Database Schema

The application expects `users` and `stories` tables. Below is a reference schema (feel free to adjust column types to your needs).

```sql
CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

Add the `stories` table to persist story content authored by the admin:

```sql
CREATE TABLE IF NOT EXISTS stories (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  level ENUM('A1','A2','B1','B2','C1','C2') NOT NULL,
  summary VARCHAR(255) NOT NULL,
  body MEDIUMTEXT NOT NULL,
  author_id INT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_stories_author
    FOREIGN KEY (author_id) REFERENCES users(id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

> **Tip:** Seed the `users` table with the admin account (`karen12389033@gmail.com`). After creating the user through the signup form you can update the email directly in MySQL if required.

## Roles and Access

- **Readers:** Any authenticated user can browse and read stories.
- **Admin (karen12389033@gmail.com):** Gains access to the "Neue Geschichte" button to publish stories.
- Story detail pages, list, and creation routes are all protected; unauthenticated visitors are redirected to `/login`.

## Project Structure

```
.
├─ server.js
├─ public/
│  ├─ css/main.css
│  └─ js/
│     ├─ home.js
│     └─ ai-chat.js
├─ views/
│  ├─ partials/ (head, header, footer)
│  ├─ stories/new.ejs
│  ├─ errors/{403,404,500}.ejs
│  ├─ home.ejs
│  ├─ story.ejs
│  ├─ login.ejs
│  ├─ signup.ejs
│  └─ about.ejs
└─ lib/db.js (MySQL connection pool)
```

## Development Notes

- Password hashing uses 12 salt rounds; adjust in `server.js` if needed.
- `express-session` stores session data in-memory; switch to a persistent store (Redis/MySQL) for production.
- Story filtering is performed client-side (`public/js/home.js`) by toggling visibility classes.
- The floating AI helper is UI-only; integrate an API by replacing the stub in `public/js/ai-chat.js`.

## Next Steps

1. Add pagination or search across the story catalogue.
2. Implement editing/deleting stories for the admin role.
3. Replace session store with a production-ready adapter.
4. Connect the AI helper to an actual language assistant API.
5. Add automated tests for auth and story creation workflows.

Mit viel Erfolg beim Deutschlernen!
