
# College ERP System - GitHub Themed Monorepo

This project is a production-ready blueprint for a Real-time College ERP System, tailored for a local development environment. It features a pnpm monorepo, a Next.js frontend with a GitHub-inspired theme, and an Express.js backend.

## Project Overview

The ERP system aims to streamline administrative and academic operations. Initial features include:
- User Management (Authentication, Profile Viewing)
- Academic Scheduling (Personalized Class/Event Schedules)
- Real-time Communication (Administrative Announcements)

## Aesthetic Guidelines (Frontend - GitHub Inspired)

The UI precisely emulates GitHub's light theme.
- **Color Palette**: Uses GitHub's official colors for primary actions, success, destructive operations, and neutrals.
- **Typography**: `Inter` font for body text, bolder sans-serif for headings.
- **Shadows & Borders**: Subtle shadows and thin borders mirroring GitHub's UI elements.
- **Spacing**: Generous padding and margins for a clean layout.

## Monorepo Structure

```
.
├── apps
│   ├── backend         # Express.js REST API and WebSocket server
│   └── frontend        # Next.js application (GitHub-themed UI)
├── packages
│   └── common          # Shared TypeScript types and utilities
├── pnpm-workspace.yaml # PNPM workspace configuration
├── package.json        # Root monorepo scripts
└── README.md           # This file
```

## Technology Stack

- **Monorepo Tool**: pnpm workspaces
- **Frontend**: Next.js (App Router), Tailwind CSS, Shadcn UI, React Query, Socket.IO Client
- **Backend**: TypeScript (Node.js/Express.js), SQLite3, Socket.IO
- **Database**: SQLite3 (for local development)

## Getting Started Guide

Follow these steps to set up and run the project locally:

**1. Prerequisites:**
   - Node.js (version 18.0.0 or higher recommended)
   - pnpm (version 8.0.0 or higher recommended)

**2. Clone the Repository (if applicable):**
   ```bash
   # If you have this project in a Git repository
   # git clone <repository-url>
   # cd college-erp-monorepo
   ```

**3. Install Dependencies:**
   From the root of the monorepo, run:
   ```bash
   pnpm install
   ```
   This will install dependencies for all workspaces (root, frontend, backend, common).

**4. Backend Setup:**
   - **Environment Variables:**
     Navigate to `apps/backend`. Copy `.env.example` to a new file named `.env`:
     ```bash
     cd apps/backend
     cp .env.example .env
     ```
     Review and update the variables in `.env` if necessary (defaults are generally fine for local dev). `JWT_SECRET` should be a strong, random string.
     ```
     # .env content example
     NODE_ENV=development
     PORT=3001
     DATABASE_URL=./dev.sqlite # Path to SQLite file
     JWT_SECRET=your-super-secret-jwt-key # CHANGE THIS!
     ```
     Return to the monorepo root:
     ```bash
     cd ../..
     ```

   - **Database Initialization:**
     Initialize the SQLite database schema. From the monorepo root:
     ```bash
     pnpm db:init
     ```
     This executes the `init.ts` script in the backend, creating tables.

   - **Database Seeding (Optional but Recommended):**
     Populate the database with initial sample data. From the monorepo root:
     ```bash
     pnpm db:seed
     ```
     This executes the `seed.ts` script in the backend.

**5. Frontend Setup:**
   - **Shadcn UI Components:**
     The project is configured to use Shadcn UI components. You'll need to add them to the `apps/frontend` workspace.
     Navigate to the frontend directory:
     ```bash
     cd apps/frontend
     ```
     Then, run the following commands to add the core components used in this blueprint:
     ```bash
     npx shadcn@latest add button
     npx shadcn@latest add input
     npx shadcn@latest add card
     npx shadcn@latest add form 
     npx shadcn@latest add table
     npx shadcn@latest add toast
     npx shadcn@latest add dialog
     npx shadcn@latest add label
     npx shadcn@latest add dropdown-menu
     npx shadcn@latest add avatar
     npx shadcn@latest add textarea
     npx shadcn@latest add separator
     ```
     When prompted, confirm the settings (they should align with `components.json`).
     Return to the monorepo root:
     ```bash
     cd ../..
     ```

**6. Running the Applications:**

   - **Start Both Frontend and Backend (Parallel):**
     From the monorepo root, run:
     ```bash
     pnpm dev
     ```
     This will start the backend server (typically on `http://localhost:3001`) and the Next.js frontend development server (typically on `http://localhost:3000`).

   - **Start Individually:**
     - **Backend:**
       ```bash
       pnpm dev:backend
       ```
     - **Frontend:**
       ```bash
       pnpm dev:frontend
       ```

**7. Accessing the Application:**
   - Open your browser and navigate to `http://localhost:3000` to see the frontend.
   - The backend API will be available at `http://localhost:3001/api`.

## Available Monorepo Scripts

(Located in the root `package.json`)

- `pnpm dev`: Starts both frontend and backend in development mode.
- `pnpm dev:frontend`: Starts only the frontend dev server.
- `pnpm dev:backend`: Starts only the backend dev server.
- `pnpm build`: Builds both frontend and backend for production.
- `pnpm build:frontend`: Builds only the frontend.
- `pnpm build:backend`: Builds only the backend.
- `pnpm lint`: Runs linters for all packages.
- `pnpm db:init`: Initializes the backend database schema.
- `pnpm db:seed`: Seeds the backend database with sample data.
- `pnpm clean`: Removes `node_modules` and build artifacts from all packages.

## Important Notes

- **GitHub Theme:** The frontend uses specific hex/HSL values and Tailwind CSS configurations to emulate the GitHub light theme. Key files for this are `apps/frontend/tailwind.config.js` and `apps/frontend/app/globals.css`.
- **Local Development Database:** SQLite is used for simplicity in local development. The backend structure is designed to be adaptable to other databases (e.g., PostgreSQL with Prisma) for production.
- **No Location/AR:** This blueprint strictly excludes any location tracking or Augmented Reality features.
- **Dummy Data:** The seed script provides basic dummy users (admin, student, faculty) and sample data. Credentials can be found in `apps/backend/src/db/seed.ts`. For example:
    - Admin: `admin` / `password123`
    - Student: `student1` / `password123`
    - Faculty: `faculty1` / `password123`
```
