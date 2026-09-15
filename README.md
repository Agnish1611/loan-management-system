# Loan Management System (LMS) — Full-Stack Monorepo

A scalable, production-grade full-stack monorepo for the **CreditSea Loan Management System (LMS)** built with **Next.js 16**, **Node.js / Express**, **MongoDB / Mongoose**, **HeroUI**, and **pnpm workspaces + Turborepo**.

---

## Architecture Overview

```
.
├── apps/
│   ├── web/                  # Next.js 16 App Router — Borrower Portal (Port 3000)
│   ├── admin/                # Next.js 16 App Router — Operations Dashboard (Port 3001)
│   └── api/                  # Node.js + Express + TypeScript API (Port 8000)
├── packages/
│   ├── database/             # Shared MongoDB + Mongoose connection package (@repo/database)
│   ├── ui/                   # Shared UI design system & HeroUI components (@repo/ui)
│   ├── types/                # Shared domain types, enums, DTOs (@repo/types)
│   ├── typescript-config/    # Shared tsconfig configurations (@repo/typescript-config)
│   └── eslint-config/        # Shared ESLint configurations (@repo/eslint-config)
├── .husky/                   # Git automation hooks (pre-commit, commit-msg)
├── commitlint.config.mjs     # Conventional Commits rules
├── vitest.config.mts         # Root workspace test runner configuration
├── turbo.json                # Turborepo build pipeline
└── pnpm-workspace.yaml       # pnpm workspace definition
```

---

## Prerequisites

Ensure you have the following installed on your machine:

- **Node.js**: `>= 24.0.0`
- **pnpm**: `>= 11.0.0` (Corepack or standalone: `npm i -g pnpm`)
- **MongoDB**: Local `mongod` instance or a MongoDB Atlas connection URI

---

## Quick Start / Setup Instructions

### 1. Clone the Repository

```bash
git clone <repo-url>
cd loan-management-system
```

### 2. Install Dependencies

```bash
pnpm install
```

> Running `pnpm install` installs dependencies across all workspaces and automatically initializes **Husky** Git hooks via the `prepare` script.

### 3. Configure Environment Variables

Copy the example environment configuration into `apps/api/.env`:

```bash
cp apps/api/.env.example apps/api/.env
```

Review and adjust `apps/api/.env` if necessary:

```env
# Server
PORT=8000
NODE_ENV=development

# Authentication
JWT_SECRET=change-me-before-production

# Database
MONGO_URI=mongodb://localhost:27017/lms

# File Storage ("local" | "s3")
STORAGE_DRIVER=local
```

### 4. Run Development Servers

Start all applications and services concurrently:

```bash
pnpm dev
```

Once started, the following services will be available:

- **Borrower Portal (`web`)**: [http://localhost:3000](http://localhost:3000)
- **Operations Dashboard (`admin`)**: [http://localhost:3001](http://localhost:3001)
- **Backend API (`api`)**: [http://localhost:8000](http://localhost:8000)
- **API Health Check**: [http://localhost:8000/health](http://localhost:8000/health)

---

## Running Specific Applications

You can run, test, or build individual apps using pnpm `--filter`:

```bash
# Run only the Borrower Portal
pnpm --filter web dev

# Run only the Operations Dashboard
pnpm --filter admin dev

# Run only the Express API
pnpm --filter api dev
```

---

## Available Monorepo Scripts

| Command            | Description                                                     |
| :----------------- | :-------------------------------------------------------------- |
| `pnpm dev`         | Starts all applications in watch/development mode via Turborepo |
| `pnpm build`       | Compiles and builds all apps and packages                       |
| `pnpm test`        | Runs the workspace test suite using Vitest                      |
| `pnpm test:watch`  | Runs Vitest in interactive watch mode                           |
| `pnpm lint`        | Runs ESLint across all apps and packages                        |
| `pnpm check-types` | Type-checks all TypeScript projects without emitting output     |
| `pnpm format`      | Formats all code files using Prettier                           |

---

## Quality Assurance & Git Automation

This repository enforces strict code quality and consistency through automated hooks:

### 1. Git Pre-Commit Hook (Husky)

Before every commit, [.husky/pre-commit](.husky/pre-commit) automatically executes:

1. `pnpm format`: Formats staged code with Prettier.
2. `pnpm test`: Runs Vitest unit and integration tests.
3. `pnpm lint`: Validates code against shared ESLint rules.
4. `pnpm check-types`: Validates TypeScript types across all workspaces.

If any check fails, the commit is safely blocked.

### 2. Commit Message Conventions (Commitlint)

Commit messages must follow the [Conventional Commits](https://www.conventionalcommits.org/) format enforced by [.husky/commit-msg](.husky/commit-msg):

```text
type: description

Examples:
  feat: add loan calculation slider
  fix: correct PAN regex validation
  chore: update dependencies
```

**Allowed types**: `feat`, `fix`, `chore`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `revert`.
