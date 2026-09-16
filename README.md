# CreditSea Loan Management System (LMS)

A production-grade, full-stack monorepo for an end-to-end Loan Management System built with **Next.js 16**, **Express 5**, **TypeScript**, **MongoDB / Mongoose**, and **pnpm workspaces + Turborepo**.

---

## Workspace Structure

```text
├── apps/
│   ├── web/                  # Next.js 16 — Borrower Application Portal (Port 3000)
│   ├── admin/                # Next.js 16 — Operations Dashboard (Port 3001)
│   └── api/                  # Express 5 + TypeScript REST API (Port 8000)
└── packages/
    ├── types/                # Shared domain models, enums, loan math, Zod schemas (@repo/types)
    ├── database/             # Shared MongoDB connection & Mongoose schemas (@repo/database)
    ├── ui/                   # Shared React component library (@repo/ui)
    ├── typescript-config/    # Shared tsconfig bases (@repo/typescript-config)
    └── eslint-config/        # Shared ESLint rules (@repo/eslint-config)
```

---

## Prerequisites

- **Node.js**: `>= 24.0.0`
- **pnpm**: `>= 11.0.0` (`npm i -g pnpm`)
- **MongoDB**: Local MongoDB instance (`mongodb://localhost:27017`) or MongoDB Atlas URI

---

## Quick Start / Setup Instructions

### 1. Install Dependencies

```bash
pnpm install
```

> Automatically initializes Husky pre-commit hooks via the `prepare` script.

### 2. Configure Environment

Copy the example environment configuration into `apps/api/.env`:

```bash
cp apps/api/.env.example apps/api/.env
```

#### Base Configuration

```env
PORT=8000
NODE_ENV=development
JWT_SECRET=your-super-secure-jwt-secret-min-32-chars
MONGO_URI=mongodb://localhost:27017/lms
```

#### File Storage Configuration (Local vs. AWS S3)

The API supports pluggable storage drivers via `STORAGE_DRIVER`:

- **Option A: Local Filesystem (Default — Zero Setup)**  
  Files are stored locally under `apps/api/uploads/`. Ideal for local development and testing without cloud accounts:

  ```env
  STORAGE_DRIVER=local
  ```

- **Option B: AWS S3 Storage (Cloud Production)**  
  Stores documents in a private S3 bucket and serves downloads via short-lived (5-minute) presigned URLs:

  ```env
  STORAGE_DRIVER=s3
  AWS_REGION=ap-south-1
  S3_BUCKET=your-bucket-name
  AWS_ACCESS_KEY_ID=your-aws-access-key-id
  AWS_SECRET_ACCESS_KEY=your-aws-secret-access-key
  ```

  > **S3 Security & Permissions**:
  >
  > 1. Keep the S3 bucket **private** with _Block all public access_ turned **ON** (no public bucket policy).
  > 2. Attach an IAM policy granting `s3:PutObject`, `s3:GetObject`, and `s3:DeleteObject` on `arn:aws:s3:::<your-bucket-name>/salary-slips/*`.
  > 3. Downloads never expose permanent public URLs; files are accessed via temporary signed URLs minted on demand after server-side authorization.

### 3. Seed Initial Accounts & Data

Populate canonical user accounts for all roles and demo borrower records:

```bash
pnpm seed
```

> The seed runner is **idempotent** and safe to execute multiple times.

### 4. Start Development Servers

Run all workspace applications concurrently:

```bash
pnpm dev
```

Available endpoints:

- **Borrower Portal**: [http://localhost:3000](http://localhost:3000)
- **Operations Dashboard**: [http://localhost:3001](http://localhost:3001)
- **REST API**: [http://localhost:8000](http://localhost:8000)
- **API Health Check**: [http://localhost:8000/health](http://localhost:8000/health)

---

## Default Seed Credentials

All seeded accounts share the default password: **`Password123!`**

| Role           | Email                            | Name                 | Accessible Modules                             |
| :------------- | :------------------------------- | :------------------- | :--------------------------------------------- |
| `ADMIN`        | `admin@creditsea.com`            | System Administrator | Unrestricted access across all dashboards      |
| `SALES`        | `sales@creditsea.com`            | Ananya Sales         | Sales leads pipeline & pre-application triage  |
| `SANCTION`     | `sanction@creditsea.com`         | Rahul Sanction       | Loan application review, approval & rejection  |
| `DISBURSEMENT` | `disbursement@creditsea.com`     | Priya Disbursement   | Sanctioned loan verification & fund release    |
| `COLLECTION`   | `collection@creditsea.com`       | Amit Collection      | Repayment recording, UTR entry & auto-closure  |
| `BORROWER`     | `borrower@creditsea.com`         | Rahul Sharma         | Multi-step loan application & repayment status |
| `BORROWER`     | `borrower.lead@creditsea.com`    | Priya Patel          | Pre-application lead demo (`REGISTERED_ONLY`)  |
| `BORROWER`     | `borrower.brefail@creditsea.com` | Vikram Singh         | Pre-application lead demo (`BRE_REJECTED`)     |

---

## Common Scripts

| Command            | Action                                              |
| :----------------- | :-------------------------------------------------- |
| `pnpm dev`         | Starts all apps concurrently in development mode    |
| `pnpm seed`        | Populates default role accounts and demo loans      |
| `pnpm test`        | Runs the test suite across all packages (181 tests) |
| `pnpm lint`        | Runs ESLint across all workspaces                   |
| `pnpm check-types` | Type-checks all packages without emitting output    |
| `pnpm build`       | Builds production bundles for all apps and packages |
| `pnpm format`      | Formats the entire codebase using Prettier          |

---

## Key Architecture Highlights

- **Financial Exactness**: All financial amounts are represented in integer paise ($\text{₹}1 = 100\text{ paise}$) with zero floating-point accumulation drift.
- **Server-Authoritative BRE**: Pure-function rule engine enforcing PAN format, Age (23–50 inclusive), Salary ($\ge \text{₹}25,000$), and Employment criteria.
- **Declarative State Machine**: Guarded transitions (`APPLIED` $\rightarrow$ `SANCTIONED` / `REJECTED` $\rightarrow$ `DISBURSED` $\rightarrow$ `CLOSED`) with immutable `statusHistory` audit records.
- **Atomic Repayment Ledger**: Append-only payment records, global unique UTR enforcement, and system auto-close upon reaching zero outstanding balance.
- **Dynamic Sales Leads**: High-performance MongoDB aggregation pipeline deriving leads on-the-fly from users without loans, eliminating dual-write sync issues.
