# Alpine-Eco Workflow — Project Recreation Guide

This document describes everything needed to recreate **Alpine-Eco Workflow** from scratch: a manufacturing operations app for quotes, invoices, delivery notes, and job cards, built for **Alpine-Eco** (notebooks and diaries).

---

## Table of contents

1. [What you're building](#1-what-youre-building)
2. [Tech stack](#2-tech-stack)
3. [Fastest path: clone the repo](#3-fastest-path-clone-the-repo)
4. [From-scratch scaffolding](#4-from-scratch-scaffolding)
5. [Environment variables](#5-environment-variables)
6. [Supabase setup](#6-supabase-setup)
7. [Database schema (full SQL)](#7-database-schema-full-sql)
8. [Project structure](#8-project-structure)
9. [Routing](#9-routing)
10. [Architecture](#10-architecture)
11. [Business workflows](#11-business-workflows)
12. [Document statuses](#12-document-statuses)
13. [Roles & permissions](#13-roles--permissions)
14. [UI & design system](#14-ui--design-system)
15. [PDF generation](#15-pdf-generation)
16. [Key components](#16-key-components)
17. [Deployment](#17-deployment)
18. [Development commands](#18-development-commands)

---

## 1. What you're building

**Alpine-Eco Workflow** is an internal staff tool for a South African factory. It manages the full document lifecycle:

```
Quote → Invoice → Delivery Note
  └────────────→ Job Card (with tasks)
```

### Features

| Area | Capabilities |
|------|-------------|
| **Dashboard** | Pending quotes, unpaid/overdue invoices, active jobs, deliveries in motion; recent activity; admin-only invoice totals |
| **Quotations** | Create/edit quotes with line items, customer autocomplete, PDF export, convert to invoice, create job card |
| **Invoices** | Tabbed list (all/unpaid/paid/cancelled), mark paid, create delivery note, create job card, PDF with paid stamp |
| **Delivery notes** | Tabbed list, mark delivered, signature blocks on PDF |
| **Job cards** | Task checklist per card, status tabs, PDF export, admin-only delete |
| **Order tracker** | Quote-centric timeline showing related documents and activity |
| **Auth** | Email/password sign-in and sign-up via Supabase |
| **Roles** | `admin` can delete documents; `staff` cannot (enforced in UI + RLS) |
| **Mobile** | Responsive tables → cards, larger tap targets, collapsible sidebar |

### Branding

- **Company:** Alpine-Eco
- **Tagline:** Notebooks and diaries
- **Address:** 22 Stevens Rd Stafford, Johannesburg
- **Phone:** 011 493 0113
- **Email:** info@alpine-eco.co.za
- **Currency:** ZAR (South African Rand)
- **Watermarks:** "Built by Muzi" on login + dashboard; "The Accounting Tool" on login hero panel

---

## 2. Tech stack

| Layer | Technology |
|-------|------------|
| Framework | [TanStack Start](https://tanstack.com/start) (React 19, SSR) |
| Routing | [TanStack Router](https://tanstack.com/router) (file-based) |
| Data fetching | [TanStack React Query](https://tanstack.com/query) v5 |
| Backend | [Supabase](https://supabase.com) (Postgres, Auth, RLS) |
| Styling | Tailwind CSS v4 + custom CSS variables |
| UI primitives | shadcn/ui (Radix) — `components.json` style: `new-york` |
| Icons | lucide-react |
| Animations | motion (Framer Motion successor), View Transitions API |
| PDFs | jsPDF + jspdf-autotable |
| Toasts | sonner |
| Build / SSR deploy | Vite 8 + Nitro 3 (`@lovable.dev/vite-tanstack-config`) |
| Language | TypeScript (strict) |

---

## 3. Fastest path: clone the repo

If you have the source repository:

```bash
git clone <your-repo-url> alpine-eco-workflow
cd alpine-eco-workflow
npm install
```

1. Create a Supabase project (see [§6](#6-supabase-setup)).
2. Run the SQL migrations in [§7](#7-database-schema-full-sql).
3. Copy `.env` values (see [§5](#5-environment-variables)).
4. Start dev: `npm run dev` → http://localhost:8080
5. Sign up a user, then promote to admin (see [§13](#13-roles--permissions)).

---

## 4. From-scratch scaffolding

If rebuilding without the repo:

### 4.1 Initialize project

Use a **TanStack Start + TypeScript** template, or scaffold via [Lovable](https://lovable.dev) with the Lovable TanStack config. The project uses `@lovable.dev/vite-tanstack-config` which wires up:

- `@tanstack/react-start` plugin
- `@vitejs/plugin-react`
- `@tailwindcss/vite`
- `vite-tsconfig-paths`
- `nitro` (build-only; Cloudflare default, Vercel on `VERCEL=1`)
- Dev error logging plugins

### 4.2 Install dependencies

Copy `package.json` from the repo and run:

```bash
npm install
```

Critical packages beyond a basic React app:

```
@tanstack/react-start @tanstack/react-router @tanstack/react-query
@supabase/supabase-js
jspdf jspdf-autotable
motion sonner
@lovable.dev/vite-tanstack-config
nitro (devDependency)
```

### 4.3 Config files to create

| File | Purpose |
|------|---------|
| `vite.config.ts` | Lovable config + Vercel Nitro preset + `server: { entry: "server" }` |
| `tsconfig.json` | `@/*` → `./src/*`, strict, ES2022 |
| `components.json` | shadcn/ui aliases pointing at `src/` |
| `vercel.json` | `framework: null`, `buildCommand: npm run build` |
| `.gitignore` | `node_modules`, `dist`, `.vercel`, `.tanstack/**`, etc. |
| `src/styles.css` | Tailwind v4 + Alpine-Eco design tokens |
| `src/server.ts` | SSR error wrapper around TanStack server entry |
| `src/start.ts` | TanStack Start instance + Supabase auth middleware |
| `src/router.tsx` | Router + QueryClient with global error toasts |

### 4.4 shadcn/ui components

The `src/components/ui/` folder contains standard shadcn components (button, dialog, input, table, etc.). Install via:

```bash
npx shadcn@latest init
npx shadcn@latest add button dialog input label table tabs ... # as needed
```

Match `components.json` settings: `new-york` style, CSS variables, `@/` aliases.

---

## 5. Environment variables

Create `.env` in the project root:

```env
# Supabase — required
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_or_publishable_key
VITE_SUPABASE_PROJECT_ID=your_project_ref

# SSR fallback (same values, no VITE_ prefix)
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_PUBLISHABLE_KEY=your_anon_or_publishable_key
SUPABASE_PROJECT_ID=your_project_ref
```

**Where to find them:** Supabase Dashboard → Project Settings → API → Project URL + `anon` / `publishable` key.

> **Never commit** the Supabase `service_role` key. Only the publishable/anon key is used in this app.

For **Vercel**, add the same variables in Project → Settings → Environment Variables (Production, Preview, Development), then redeploy.

---

## 6. Supabase setup

### 6.1 Create project

1. Go to [supabase.com](https://supabase.com) → New project.
2. Note the project URL and anon key.
3. Enable **Email** auth provider (Authentication → Providers → Email).

### 6.2 Run migrations

In Supabase Dashboard → **SQL Editor**, run both migration files in order:

1. `supabase/migrations/20260702203246_f59e987c-a0bc-4f92-b36f-ca02644e53ba.sql` (core schema)
2. `supabase/migrations/20260703090000_admin_delete_role.sql` (admin delete RLS)

Or use the Supabase CLI:

```bash
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

### 6.3 Create first admin user

1. Sign up through the app at `/auth`.
2. In SQL Editor:

```sql
UPDATE public.profiles
SET role = 'admin'
WHERE email = 'your-admin@example.com';
```

### 6.4 Auth settings

- **Site URL:** your production URL (e.g. `https://your-app.vercel.app`)
- **Redirect URLs:** add `http://localhost:8080/**` for local dev

---

## 7. Database schema (full SQL)

### Migration 1 — Core schema

```sql
-- Profiles table for staff info
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'staff',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- Handle new user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email
  ) ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Documents (all 4 types)
CREATE TABLE public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_type text NOT NULL CHECK (doc_type IN ('quote','invoice','delivery_note','job_card')),
  doc_number text UNIQUE NOT NULL,
  parent_id uuid REFERENCES public.documents(id) ON DELETE SET NULL,
  customer_name text NOT NULL DEFAULT '',
  customer_email text,
  customer_phone text,
  customer_address text,
  project_description text,
  status text NOT NULL DEFAULT 'draft',
  notes text,
  subtotal numeric(10,2) NOT NULL DEFAULT 0,
  tax_rate numeric(5,2) NOT NULL DEFAULT 0,
  tax_amount numeric(10,2) NOT NULL DEFAULT 0,
  total numeric(10,2) NOT NULL DEFAULT 0,
  doc_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents TO authenticated;
GRANT ALL ON public.documents TO service_role;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read docs" ON public.documents FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert docs" ON public.documents FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Auth update docs" ON public.documents FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth delete docs" ON public.documents FOR DELETE TO authenticated USING (true);

CREATE INDEX idx_documents_type ON public.documents(doc_type);
CREATE INDEX idx_documents_parent ON public.documents(parent_id);
CREATE INDEX idx_documents_status ON public.documents(status);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER trg_docs_updated BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Line items
CREATE TABLE public.line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  description text NOT NULL DEFAULT '',
  quantity numeric(10,2) NOT NULL DEFAULT 1,
  unit_price numeric(10,2) NOT NULL DEFAULT 0,
  total_price numeric(10,2) NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.line_items TO authenticated;
GRANT ALL ON public.line_items TO service_role;
ALTER TABLE public.line_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth all line items" ON public.line_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX idx_line_items_doc ON public.line_items(document_id);

-- Job tasks
CREATE TABLE public.job_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_card_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  task_description text NOT NULL DEFAULT '',
  assigned_to text,
  status text NOT NULL DEFAULT 'pending',
  completed_at timestamptz,
  sort_order integer NOT NULL DEFAULT 0
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_tasks TO authenticated;
GRANT ALL ON public.job_tasks TO service_role;
ALTER TABLE public.job_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth all job tasks" ON public.job_tasks FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX idx_job_tasks_jc ON public.job_tasks(job_card_id);

-- Activity log
CREATE TABLE public.activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  action text NOT NULL,
  description text,
  performed_by uuid REFERENCES auth.users(id),
  performed_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.activity_log TO authenticated;
GRANT ALL ON public.activity_log TO service_role;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read activity" ON public.activity_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert activity" ON public.activity_log FOR INSERT TO authenticated WITH CHECK (auth.uid() = performed_by);
CREATE INDEX idx_activity_doc ON public.activity_log(document_id);

-- Doc number generator
CREATE OR REPLACE FUNCTION public.generate_doc_number(p_doc_type text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_prefix text;
  v_year text := to_char(now(), 'YYYY');
  v_max int;
  v_next int;
BEGIN
  v_prefix := CASE p_doc_type
    WHEN 'quote' THEN 'QT'
    WHEN 'invoice' THEN 'INV'
    WHEN 'delivery_note' THEN 'DN'
    WHEN 'job_card' THEN 'JC'
    ELSE 'DOC' END;
  SELECT COALESCE(MAX(CAST(split_part(doc_number, '-', 3) AS int)), 0)
    INTO v_max
    FROM public.documents
    WHERE doc_type = p_doc_type AND doc_number LIKE v_prefix || '-' || v_year || '-%';
  v_next := v_max + 1;
  RETURN v_prefix || '-' || v_year || '-' || lpad(v_next::text, 4, '0');
END; $$;
GRANT EXECUTE ON FUNCTION public.generate_doc_number(text) TO authenticated;
```

**Document number format:** `QT-2026-0001`, `INV-2026-0001`, `DN-2026-0001`, `JC-2026-0001`

### Migration 2 — Admin-only delete

```sql
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

DROP POLICY IF EXISTS "Auth delete docs" ON public.documents;
CREATE POLICY "Admins delete docs" ON public.documents
  FOR DELETE TO authenticated
  USING (public.is_admin());
```

---

## 8. Project structure

```
cloud-app-builder/
├── src/
│   ├── routes/                 # TanStack file-based routes
│   │   ├── __root.tsx          # HTML shell, QueryClient, AuthProvider, AppShell gate
│   │   ├── index.tsx           # Dashboard
│   │   ├── auth.tsx            # Login / sign-up
│   │   ├── quotes.tsx          # Layout (Outlet)
│   │   ├── quotes.index.tsx    # Quote list
│   │   ├── quotes.new.tsx      # New quote form
│   │   ├── quotes.$id.tsx      # Quote detail
│   │   ├── invoices.tsx
│   │   ├── invoices.index.tsx
│   │   ├── invoices.$id.tsx
│   │   ├── delivery.tsx
│   │   ├── delivery.index.tsx
│   │   ├── delivery.$id.tsx
│   │   ├── jobs.tsx            # Job cards + tasks
│   │   └── tracker.tsx         # Order tracker
│   ├── components/
│   │   ├── AppShell.tsx        # Sidebar, mobile nav, auth guard
│   │   ├── DocumentList.tsx    # Shared list (quotes/invoices/delivery)
│   │   ├── DocumentDetail.tsx  # Shared detail view
│   │   ├── QuoteForm.tsx       # Quote creation form
│   │   ├── DeleteDocButton.tsx # Admin-only delete
│   │   ├── StatusBadge.tsx
│   │   ├── TabBar.tsx
│   │   ├── Breadcrumbs.tsx
│   │   ├── EmptyState.tsx
│   │   ├── TableSkeleton.tsx
│   │   ├── ConfirmDialog.tsx
│   │   └── ui/                 # shadcn primitives
│   ├── lib/
│   │   ├── auth.tsx            # AuthProvider + useAuth
│   │   ├── queries.ts          # React Query hooks
│   │   ├── pdf.ts              # PDF generation
│   │   ├── format.ts           # money(), fmtDate(), labels
│   │   └── utils.ts            # cn() helper
│   ├── integrations/supabase/
│   │   ├── client.ts           # Browser + SSR Supabase client
│   │   ├── types.ts            # Generated Database types
│   │   ├── auth-attacher.ts    # SSR auth middleware
│   │   └── auth-middleware.ts
│   ├── hooks/
│   │   ├── useDebounced.ts
│   │   ├── useCountUp.ts
│   │   └── use-mobile.tsx
│   ├── router.tsx              # createRouter + QueryClient
│   ├── start.ts                # createStart middleware
│   ├── server.ts               # Nitro SSR entry wrapper
│   ├── routeTree.gen.ts        # Auto-generated — do not edit
│   └── styles.css              # Design tokens + utilities
├── supabase/
│   ├── config.toml
│   └── migrations/             # SQL files (see §7)
├── vite.config.ts
├── vercel.json
├── components.json
├── package.json
└── tsconfig.json
```

---

## 9. Routing

| URL | File | Description |
|-----|------|-------------|
| `/` | `index.tsx` | Dashboard |
| `/auth` | `auth.tsx` | Login (no sidebar) |
| `/quotes` | `quotes.index.tsx` | Quote list |
| `/quotes/new` | `quotes.new.tsx` | Create quote |
| `/quotes/:id` | `quotes.$id.tsx` | Quote detail |
| `/invoices` | `invoices.index.tsx` | Invoice list (`?tab=unpaid`) |
| `/invoices/:id` | `invoices.$id.tsx` | Invoice detail |
| `/delivery` | `delivery.index.tsx` | Delivery list |
| `/delivery/:id` | `delivery.$id.tsx` | Delivery detail |
| `/jobs` | `jobs.tsx` | Job cards |
| `/tracker` | `tracker.tsx` | Order tracker |

**Important:** `AuthProvider` and `AppShell` mount once in `__root.tsx` via `ShellGate`. Individual routes must **not** wrap themselves in `AppShell` or the sidebar will remount on navigation.

`routeTree.gen.ts` is regenerated on `npm run build`.

---

## 10. Architecture

### 10.1 Data layer (`src/lib/queries.ts`)

Central React Query hooks:

| Hook | Purpose |
|------|---------|
| `useDocuments()` | All documents (dashboard, sidebar counts) |
| `useDocumentsByType(type)` | Filtered from shared cache |
| `useDocument(id)` | Single document |
| `useLineItems(docId)` | Line items for a document |
| `useActivity(docId)` | Activity log |
| `useJobTasks()` | All job tasks |
| `useProfile(userId)` | Name + role |
| `useRole()` / `useIsAdmin()` | Role helpers |
| `useCustomers()` | Autocomplete from past customers |
| `useUpdateStatus()` | Optimistic status updates |
| `useDeleteDocument()` | Admin delete |
| `useToggleTask()` / `useAddTask()` / `useDeleteTask()` | Job task CRUD |
| `useDeleteJob()` | Delete job card document |

Global errors toast via `QueryCache` / `MutationCache` in `router.tsx`.

### 10.2 Auth (`src/lib/auth.tsx`)

- `AuthProvider` listens to `supabase.auth.onAuthStateChange`
- `signIn`, `signUp`, `signOut` wrap Supabase auth methods
- `AppShell` redirects unauthenticated users to `/auth`

### 10.3 Supabase client (`src/integrations/supabase/client.ts`)

- Uses `VITE_*` env vars on client, `process.env` fallback on SSR
- Lazy singleton via Proxy
- Custom fetch sets `apikey` header (supports new Supabase API key format)

### 10.4 SSR (`src/server.ts` + `src/start.ts`)

- `server.ts` wraps TanStack's server entry with HTML error pages
- `start.ts` attaches Supabase auth middleware and error middleware

### 10.5 Vite config (`vite.config.ts`)

```ts
const isVercel = !!process.env.VERCEL || !!process.env.NOW_BUILDER;

export default defineConfig({
  ...(isVercel ? { nitro: { preset: "vercel" } } : {}),
  tanstackStart: {
    server: { entry: "server" },
  },
});
```

---

## 11. Business workflows

### Quote → Invoice

1. Call `generate_doc_number('invoice')`
2. Insert `documents` row with `parent_id = quote.id`, copy customer + totals
3. Copy `line_items` to new document
4. Log activity on quote: `converted_to_invoice`
5. Navigate to `/invoices/:id`

### Quote or Invoice → Job Card

1. Call `generate_doc_number('job_card')`
2. Insert `documents` with `parent_id` = quote id (or invoice's parent quote if from invoice)
3. Log activity, navigate to `/jobs`

### Invoice → Delivery Note

1. Call `generate_doc_number('delivery_note')`
2. Insert document with `parent_id = invoice.id`, `status = 'ready'`
3. Copy line items
4. Log activity, navigate to `/delivery/:id`

### New Quote

1. `QuoteForm` collects customer, project, line items, tax rate
2. `generate_doc_number('quote')`
3. Insert document + line items
4. Status: `draft` or `sent` depending on save mode

### Document deletion

- UI: `DeleteDocButton` renders only for `useIsAdmin()`
- DB: RLS policy `Admins delete docs` via `is_admin()`
- Cascade deletes line items, activity, job tasks

---

## 12. Document statuses

| Type | Statuses used |
|------|---------------|
| **Quote** | `draft`, `sent`, `approved` |
| **Invoice** | `unpaid`, `sent`, `overdue`, `paid`, `cancelled` |
| **Delivery note** | `ready`, `in_transit`, `delivered`, `returned` |
| **Job card** | `pending`, `in_progress`, `completed` |

List pages use `TabBar` to filter by status. Overdue invoices: `due_date < today` and status in `unpaid|sent|overdue`.

---

## 13. Roles & permissions

| Action | Staff | Admin |
|--------|-------|-------|
| View/create/edit documents | ✅ | ✅ |
| Update status | ✅ | ✅ |
| Convert quote → invoice | ✅ | ✅ |
| Create job cards / delivery notes | ✅ | ✅ |
| Delete documents | ❌ | ✅ |
| Delete job cards | ❌ | ✅ |
| See invoice totals on dashboard | ❌ | ✅ |

Promote user to admin:

```sql
UPDATE public.profiles SET role = 'admin' WHERE email = 'user@example.com';
```

---

## 14. UI & design system

### Fonts (Google Fonts)

- **Serif:** Cormorant Garamond — headings, brand
- **Sans:** Inter — body text

### CSS variables (`src/styles.css`)

| Token | Value | Usage |
|-------|-------|-------|
| `--royal` | `#1b3fbe` | Primary brand blue |
| `--royal-deep` | `#122e9a` | Hover states |
| `--eco` | `#1e9e5e` | Success / approve actions |
| `--ink` | `#0d1a2e` | Primary text |
| `--muted-navy` | `#6b7e95` | Secondary text |
| `--offwhite` | `#f4f7f2` | Backgrounds |
| `--danger` | `#ef4444` | Overdue / destructive |
| `--amber-warn` | `#f59e0b` | Warnings |

### Patterns

- **Page titles:** `font-serif text-4xl` + `.page-title`
- **Buttons:** uppercase, `text-[11px]`, `tracking-[0.08em]`, `rounded-[4px]`
- **Sidebar:** 260px desktop, slide-out drawer on mobile
- **View transitions:** `defaultViewTransition: true` on router; elements use `vt-*` classes
- **Reduced motion:** respected via CSS
- **Mobile:** tables hidden below `md`, card layouts shown instead

---

## 15. PDF generation

Implemented in `src/lib/pdf.ts` using jsPDF + autoTable.

### Company block (all PDFs)

```
Alpine-Eco
Notebooks and diaries
22 Stevens Rd Stafford, Johannesburg
011 493 0113 · info@alpine-eco.co.za
```

### Per document type

| Type | Extras |
|------|--------|
| Quote | Standard line items + totals |
| Invoice | Paid stamp (reserved space so table doesn't overlap); **no payment details** |
| Delivery note | "Delivered by" / "Received by" signature lines with name + date |
| Job card | Task list with status |

### Colors (RGB)

- Royal: `27, 63, 190`
- Eco green: `30, 158, 94`
- Ink: `13, 26, 46`

Triggered from `DocumentDetail` and list pages via `generatePDF(doc, items, options)`.

---

## 16. Key components

### `AppShell`

- Persistent sidebar with nav + document counts
- Mobile hamburger menu
- Auth guard + loading skeleton
- User name + role in footer

### `DocumentList`

Shared list for quotes, invoices, delivery notes:
- Search (debounced 200ms)
- Status tabs with counts
- Desktop table + mobile cards
- Inline actions: view, PDF, convert, mark paid/delivered
- `AnimatePresence` for list animations

### `DocumentDetail`

Shared detail page:
- Breadcrumbs, status badge, info cards
- Line items (table desktop / cards mobile)
- Totals box
- Activity timeline
- PDF download + custom action slot

### `QuoteForm`

- Customer fields with autocomplete from `useCustomers()`
- Dynamic line items (grid desktop / cards mobile)
- Tax rate, auto-calculated subtotal/tax/total
- Save as draft or send

### `DeleteDocButton`

- Admin-only
- Confirmation dialog
- Calls `useDeleteDocument()`, navigates to list

### `ConfirmDialog`

- Context provider `useConfirm()` for async confirm/cancel

---

## 17. Deployment

### Vercel

1. Connect GitHub repo to Vercel.
2. `vercel.json` sets `framework: null` so Nitro's Build Output API is used.
3. Add environment variables (§5).
4. Deploy — build runs `vite build` with `VERCEL=1`, outputting `.vercel/output/`.

### Lovable / Cloudflare

- Default Nitro preset is `cloudflare-module` (no `VERCEL` env var).
- Do not force-push git history (see `AGENTS.md`).

### Local preview

```bash
npm run dev      # http://localhost:8080
npm run build    # production build
npm run preview  # preview production build
```

---

## 18. Development commands

```bash
npm run dev        # Start dev server (port 8080)
npm run build      # Production build + regenerate routeTree.gen.ts
npm run build:dev  # Development-mode build
npm run preview    # Preview built app
npm run lint       # ESLint
npm run format     # Prettier
```

---

## Checklist: full recreation

- [ ] Scaffold TanStack Start + TypeScript project
- [ ] Install all dependencies from `package.json`
- [ ] Add `vite.config.ts`, `tsconfig.json`, `components.json`, `vercel.json`
- [ ] Copy `src/styles.css` design tokens
- [ ] Set up shadcn/ui components in `src/components/ui/`
- [ ] Create Supabase project + run both SQL migrations
- [ ] Configure `.env` with Supabase keys
- [ ] Implement `src/integrations/supabase/` (client + types)
- [ ] Implement `src/lib/` (auth, queries, format, pdf, utils)
- [ ] Implement shared components (`AppShell`, `DocumentList`, etc.)
- [ ] Implement all routes under `src/routes/`
- [ ] Wire `__root.tsx` with `ShellGate` pattern
- [ ] Add `server.ts` and `start.ts`
- [ ] Sign up first user, promote to admin
- [ ] Test full workflow: quote → invoice → delivery → job card
- [ ] Deploy to Vercel with env vars

---

*Generated from the Alpine-Eco Workflow codebase. For the live source, use the git repository as the source of truth for implementation details beyond this guide.*
