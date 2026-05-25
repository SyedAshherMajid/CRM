# PhoneStore CRM — Project Bible

## 1. Project Overview

A **mobile-first web application** for a Pakistani mobile phone shop owner to replace his manual notebook system. The owner and 5–6 team members all share the same account/access — everyone can see and do everything. Accessible from any phone, laptop, or tablet anywhere in the world.

**Golden Rule:** Keep everything SIMPLE. The client is non-technical. If a feature feels complex, simplify it. Every screen must work perfectly on a small phone screen.

**Currency:** Pakistani Rupees (PKR). Display large amounts in lakh format (e.g., "10,00,000" shown as "10 Lakh").

**Language:** English only.

**PWA:** Not in current scope. Will be added after client tests and approves the app.

---

## 2. Users & Access

All 6 users have **identical, full access** to everything in the app. There are no roles or permission levels. Every user can:
- Create / edit purchase lots
- Add phones to inventory
- Record sales (customer and shop)
- Record payments (to suppliers, from shops)
- View all reports and financial data
- Manage suppliers and shop buyers

The only admin action is managing user accounts (add/remove team members) — this is only accessible from Settings by whoever set up the account first (the owner), but no role system is enforced in the app itself.

Login: email + password via Supabase Auth. Each team member has their own login so we can log who added/changed what.

---

## 3. Tech Stack

### Frontend
- **Next.js 14+** (App Router, TypeScript)
- **Tailwind CSS** — mobile-first responsive styling
- **shadcn/ui** — pre-built accessible components (buttons, cards, forms, dialogs, tables)
- **React Hook Form + Zod** — form handling + validation
- **Recharts** — charts for reports
- **Zustand** — lightweight state for multi-step flows (bulk phone entry)

### Backend
- **Next.js API Routes** — serverless API, same repo as frontend
- **Prisma ORM** — type-safe, auto-generated database queries

### Database & Auth
- **Supabase** — hosted PostgreSQL database + email/password authentication

### Deployment
- **Vercel** — frontend + API (free tier, auto-deploys from GitHub)
- **Supabase** — database + auth (free tier)

**Total monthly cost: PKR 0** on free tiers for 5–6 users.

---

## 4. Database Schema (Complete)

### `users`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | Supabase Auth user ID |
| name | text | Display name |
| email | text | Login email |
| created_at | timestamp | |

---

### `suppliers`
People/dealers the owner buys phones from.
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| name | text | Required |
| phone | text | Optional contact number |
| notes | text | Optional |
| created_at | timestamp | |

---

### `purchase_lots`
One bulk order from one supplier.
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| name | text | Custom label owner gives it (e.g., "Ali bhai July batch") |
| supplier_id | uuid FK → suppliers | Optional — can be unnamed supplier |
| total_amount | decimal | Total owed to supplier in PKR |
| amount_paid | decimal | Cumulative payments made so far |
| notes | text | Optional |
| created_by | uuid FK → users | Who created this lot |
| created_at | timestamp | |

*Computed:* `remaining = total_amount - amount_paid`

---

### `lot_payments`
Each installment paid to a supplier for a lot.
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| lot_id | uuid FK → purchase_lots | |
| amount | decimal | PKR |
| paid_at | timestamp | |
| notes | text | e.g., "cash", "bank transfer" |
| recorded_by | uuid FK → users | |

---

### `phones`
One row = one physical phone device.
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| lot_id | uuid FK → purchase_lots | Required — every phone belongs to a lot |
| brand | enum | `iPhone` or `Google Pixel` |
| model | text | e.g., "iPhone 13 Pro Max" |
| storage | enum | `64GB`, `128GB`, `256GB`, `512GB`, `1TB` |
| color | text | e.g., "Midnight Black", "Gold" |
| imei | text UNIQUE | Required. 15-digit IMEI |
| condition | enum | `New`, `Like New`, `Good`, `Fair`, `Poor`, `Refurbished` |
| battery_health | integer | Optional. 1–100%. Mainly for iPhones |
| cost_price | decimal | What was paid for this phone from the lot (PKR) |
| status | enum | `available`, `sold`, `defective`, `returned` |
| notes | text | Optional extra notes |
| added_by | uuid FK → users | |
| created_at | timestamp | |

---

### `shop_buyers`
Other shop owners / dealers the owner sells phones to in bulk.
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| name | text | Required |
| phone | text | Optional |
| address | text | Optional |
| notes | text | Optional |
| created_at | timestamp | |

---

### `sales`
Every sold phone — whether to a walk-in customer or a shop.
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| phone_id | uuid FK → phones | The specific phone sold |
| sale_type | enum | `customer` or `shop` |
| shop_buyer_id | uuid FK → shop_buyers | Only if sale_type = `shop` |
| customer_name | text | Optional, only for customer sales |
| selling_price | decimal | PKR |
| amount_received | decimal | How much has been collected so far |
| sold_at | timestamp | |
| notes | text | Optional |
| sold_by | uuid FK → users | |

*Computed:* `profit = selling_price - phones.cost_price`
*Computed:* `amount_pending = selling_price - amount_received`

---

### `sale_payments`
Each payment installment received against a shop sale.
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| sale_id | uuid FK → sales | |
| amount | decimal | PKR |
| received_at | timestamp | |
| notes | text | Optional |
| recorded_by | uuid FK → users | |

---

## 5. Supported Phone Models

### iPhones
| Base | Mini | Pro | Pro Max | Plus/Air |
|------|------|-----|---------|----------|
| iPhone 11 | — | iPhone 11 Pro | iPhone 11 Pro Max | — |
| iPhone 12 | iPhone 12 Mini | iPhone 12 Pro | iPhone 12 Pro Max | — |
| iPhone 13 | iPhone 13 Mini | iPhone 13 Pro | iPhone 13 Pro Max | — |
| iPhone 14 | — | iPhone 14 Pro | iPhone 14 Pro Max | iPhone 14 Plus |
| iPhone 15 | — | iPhone 15 Pro | iPhone 15 Pro Max | iPhone 15 Plus |
| iPhone 16 | — | iPhone 16 Pro | iPhone 16 Pro Max | iPhone 16 Plus |
| iPhone 17 | — | iPhone 17 Pro | iPhone 17 Pro Max | iPhone 17 Air |

### Google Pixel
| Base | Pro | a-series | Other |
|------|-----|----------|-------|
| Pixel 6 | Pixel 6 Pro | Pixel 6a | — |
| Pixel 7 | Pixel 7 Pro | Pixel 7a | — |
| Pixel 8 | Pixel 8 Pro | Pixel 8a | — |
| Pixel 9 | Pixel 9 Pro | Pixel 9a | Pixel 9 Pro XL, Pixel 9 Pro Fold |

Models stored as a config list in `lib/phone-models.ts`. New models added there only — no hardcoding elsewhere.

---

## 6. Full Feature & Screen Breakdown

---

### SCREEN 1 — Login Page
**URL:** `/login`

What's on it:
- App logo / name "PhoneStore CRM"
- Email input
- Password input
- Login button
- Error message if wrong credentials

No sign-up page. Accounts are created by the owner through Settings.

---

### SCREEN 2 — Dashboard
**URL:** `/` (home after login)

**Top Stats Row (4 cards):**
1. **In Stock** — total phones currently available
2. **Sold This Month** — phones sold in current calendar month
3. **You Owe (Suppliers)** — total remaining unpaid balance across all lots
4. **Shops Owe You** — total pending receivables from all shop buyers

**Second Row — Profit Card:**
- This Month's Profit (big number, prominent)
- Revenue this month vs Cost this month

**Recent Activity Feed:**
- Last 10 actions (phone added, sale recorded, payment made) with who did it and when

**Quick Action Buttons (large, easy to tap):**
- `+ New Purchase Lot`
- `+ Record Sale`
- `View Inventory`

**Mobile layout:** All cards stack vertically. Quick action buttons are full-width. Bottom navigation bar fixed at bottom.

---

### SCREEN 3 — Purchase Lots List
**URL:** `/lots`

**Header:** "Purchase Lots" + `+ New Lot` button (top right)

**Search bar:** Search by lot name or supplier name

**Each lot shown as a card:**
- Lot name (big, bold)
- Supplier name
- Date created
- Total phones in lot (e.g., "85 phones")
- Payment status bar: `Paid: 5 Lakh / 10 Lakh` with a visual progress bar
- Status badge: `Fully Paid` (green) / `Partial` (orange) / `Unpaid` (red)
- Quick stat: how many phones are still available vs sold

**Tap a card → Lot Detail page**

---

### SCREEN 4 — Create New Purchase Lot
**URL:** `/lots/new`

This is a **2-step form.**

#### Step 1 — Lot Info
| Field | Type | Required |
|-------|------|----------|
| Lot Name | Text input | Yes — owner names it freely |
| Supplier | Dropdown (from saved suppliers) + "Add New Supplier" option inline | No |
| Total Amount (PKR) | Number input | Yes |
| Amount Paid Now | Number input | Yes (can be 0) |
| Notes | Text area | No |

After Step 1, user clicks "Next — Add Phones"

#### Step 2 — Add Phones (Bulk Entry)

This is the most important UX screen in the app.

**The Concept:** Owner does not add 100 phones one by one. He adds them in groups that share the same attributes.

**How it works:**

There is an `+ Add Phone Group` button. Clicking it opens a small form:

| Field | Type | Required |
|-------|------|----------|
| Brand | iPhone / Google Pixel toggle | Yes |
| Model | Dropdown (filtered by brand) | Yes |
| Storage | 64GB / 128GB / 256GB / 512GB / 1TB buttons | Yes |
| Color | Text input with suggestions | Yes |
| Condition | New / Like New / Good / Fair / Poor / Refurbished | Yes |
| Battery Health | Number input (%) | No |
| Cost Price Per Phone | Number input (PKR) | Yes |
| Quantity | Number input (e.g., 20) | Yes |

After clicking "Add Group", the system creates 20 numbered phone slots below:

```
── iPhone 13 Pro Max · 256GB · Gold · Good ──────────────
  Phone 1   IMEI: [_______________]
  Phone 2   IMEI: [_______________]
  Phone 3   IMEI: [_______________]
  ...
  Phone 20  IMEI: [_______________]
```

- Each IMEI field auto-advances to the next after 15 digits are entered
- IMEIs are validated (must be 15 digits, must be unique)
- Owner can add multiple groups (different models, colors, etc.)
- Running total at bottom: "Total phones added: 85"
- Any slot can be left empty if IMEI not available yet (phone can be completed later)

**Save Lot button** at bottom → saves everything.

---

### SCREEN 5 — Lot Detail Page
**URL:** `/lots/[id]`

**Top section:**
- Lot name (large heading)
- Supplier name + contact
- Date created
- Notes

**Payment Section (card):**
- Visual bar: `████████░░ Paid: 7 Lakh / 10 Lakh`
- Remaining: `3 Lakh remaining`
- `+ Record Payment` button (opens a small dialog: amount, date, notes)
- Payment History: list of all payments made with date, amount, who recorded it

**Phones in this Lot (section):**
- Filter tabs: `All (85)` | `Available (42)` | `Sold (40)` | `Defective (3)`
- Grouped by model for easy reading:
  ```
  iPhone 13 Pro Max (20)
    ├ Gold 256GB — 12 available, 8 sold
  iPhone 14 Pro (15)
    ├ Black 512GB — 10 available, 5 sold
  ...
  ```
- Each phone row: IMEI (last 6 digits), Color, Storage, Status badge, Cost Price
- Tap phone → Phone Detail

**Lot Stats (bottom card):**
- Phones Sold: 40 | Revenue: 15 Lakh | Cost: 12 Lakh | **Profit: 3 Lakh**
- Phones Still Available: 42 | Estimated Stock Value: 18 Lakh

---

### SCREEN 6 — Inventory (All Phones)
**URL:** `/inventory`

**Search bar at top:** Search by IMEI (even partial — last 4–6 digits), model name

**Filter chips below search (horizontally scrollable on mobile):**
- Status: All | Available | Sold | Defective | Returned
- Brand: All | iPhone | Google Pixel
- Model: dropdown
- Storage: All | 64 | 128 | 256 | 512 | 1TB
- Lot: dropdown (pick a lot to filter)

**Sort by:** Date Added | Model | Lot

**Phone cards (compact):**
```
┌─────────────────────────────────────────┐
│ iPhone 13 Pro Max  256GB  Gold           │
│ IMEI: ••••••• 4521    Condition: Good    │
│ Lot: Ali bhai July batch                 │
│ Cost: 85,000           [AVAILABLE] ✓    │
└─────────────────────────────────────────┘
```

Tap card → Phone Detail

---

### SCREEN 7 — Phone Detail
**URL:** `/inventory/[id]`

**Full info section:**
- Brand, Model, Storage, Color
- IMEI (full number, shown clearly)
- Condition, Battery Health
- Cost Price
- Which lot it came from (clickable link)
- Added by / Added on

**Status section:**
- Current status badge (large)
- If `sold`:
  - Sold to: (customer name or shop name)
  - Selling Price: X
  - Profit: X (green)
  - Sold on: date
  - Amount Received: X | Pending: X
- If `defective` or `returned`: notes shown

**Action buttons:**
- `Edit Phone` (update color, condition, battery health, notes)
- `Mark as Defective` (asks for confirmation + reason)
- `Mark as Returned` (asks for confirmation)

---

### SCREEN 8 — Sales Page
**URL:** `/sales`

Two tabs: **Customer Sale** | **Shop Sale**

Also shows: **Recent Sales** list at bottom (last 20 sales with model, price, date, type)

---

### SCREEN 8A — Customer Sale Tab

Simple 3-step flow:

**Step 1 — Find the Phone**
- Search bar: type IMEI or model name
- Shows matching available phones as cards
- Tap to select

**Step 2 — Enter Sale Details**
| Field | Required |
|-------|----------|
| Selling Price (PKR) | Yes |
| Amount Received Now | Yes (can equal full price or partial) |
| Customer Name | No |
| Notes | No |

**Step 3 — Confirm**
- Summary: "Selling iPhone 13 Pro Max to [customer] for 95,000 PKR"
- Shows profit: Cost was 80,000 → **Profit: 15,000 PKR**
- Confirm button → phone marked sold

---

### SCREEN 8B — Shop Sale Tab

**Step 1 — Select Shop**
- Dropdown of saved shop buyers
- `+ Add New Shop` option inline

**Step 2 — Add Phones**
- Search available phones (IMEI or model)
- Each selected phone shows: model, IMEI, and a selling price input
- Can add multiple phones
- Running total: "5 phones selected | Total: 4,50,000 PKR"

**Step 3 — Payment**
| Field | Required |
|-------|----------|
| Amount Received Now | Yes (can be 0) |
| Notes | No |

**Step 4 — Confirm**
- Summary table of all phones, prices, total
- Remaining balance after initial payment
- Confirm → all phones marked sold, sale record created

---

### SCREEN 9 — Shop Buyers List
**URL:** `/shops`

**Header:** "Shop Buyers" + `+ Add Shop` button

**Each shop card:**
- Shop name (bold)
- Contact number
- Outstanding balance (red if > 0, green if settled)
- Phones currently pending payment: count
- Last transaction date

**Tap → Shop Detail**

---

### SCREEN 10 — Shop Detail
**URL:** `/shops/[id]`

**Top section:**
- Shop name, contact, address, notes
- Edit button

**Outstanding Balance card (prominent):**
- Big number: "Owes You: 3,20,000 PKR"
- `+ Record Payment` button

**Payment History:**
- List of all payments received: date, amount, who recorded it, notes

**Phones Given to This Shop (tabs):**
- `All` | `Payment Pending` | `Fully Paid`

**Each phone row:**
- Model, Storage, Color
- IMEI (last 6 digits)
- Selling Price | Received | **Pending**
- From Lot: [lot name] (clickable)
- Sold on: date

---

### SCREEN 11 — Suppliers List
**URL:** `/suppliers`

**Header:** "Suppliers" + `+ Add Supplier` button

**Each supplier card:**
- Name, contact
- Total lots: count
- Total amount paid to them (all time)
- Outstanding: still owed to them

**Tap → Supplier Detail**

---

### SCREEN 12 — Supplier Detail
**URL:** `/suppliers/[id]`

- Supplier info + edit
- Outstanding amount owed (big number)
- All lots from this supplier (cards, same as Lots list)
- All payments ever made to this supplier (history list)

---

### SCREEN 13 — Reports
**URL:** `/reports`

**Monthly Report (default view):**
- Month/Year selector (e.g., May 2025)
- Summary cards:
  - Phones Purchased this month: count + total cost
  - Phones Sold this month: count + total revenue
  - Gross Profit this month
  - New Pending Payables (to suppliers)
  - New Pending Receivables (from shops)
- Bar chart: Sales per day this month
- Bar chart: Profit per day this month
- Table: Every sale this month (model, IMEI, cost, sell price, profit, buyer)

**Inventory Snapshot:**
- Total phones in stock: count
- Stock value at cost price
- By brand: iPhone X phones | Pixel Y phones
- By model breakdown

**Lot Performance:**
- Table of all lots: name, phones sold/total, revenue, cost, profit, pending supplier payment

---

### SCREEN 14 — Settings
**URL:** `/settings`

Sections:
1. **Team Members** — list of users, `+ Add Member` (name + email + password), remove member
2. **Suppliers** — shortcut to manage saved suppliers (same as `/suppliers`)
3. **Shop Buyers** — shortcut (same as `/shops`)
4. **My Account** — change password

---

## 7. Navigation

### Mobile (bottom bar, always visible)
```
[ Home ] [ Inventory ] [ + Sale ] [ Lots ] [ More ]
```
- `+Sale` is the center button, larger, easy to tap
- `More` opens a slide-up sheet: Reports, Shops, Suppliers, Settings

### Desktop / Tablet (left sidebar)
- Full sidebar with all sections visible

---

## 8. UI/UX Rules (Non-Negotiable)

1. **Mobile-first.** Design for 375px width first, then scale up.
2. **Large tap targets.** All buttons minimum 48px height.
3. **Cards, not tables** on mobile. Tables only on desktop for data-heavy views.
4. **PKR everywhere.** Format: `85,000 PKR` for small, `1.5 Lakh` or `10 Lakh` for large amounts.
5. **IMEI is king.** IMEI input fields are always large, clear, with a number keyboard on mobile.
6. **Auto-advance IMEI fields.** After 15 digits, automatically jump to next IMEI input.
7. **Partial IMEI search.** Searching last 4–6 digits of an IMEI should find the phone instantly.
8. **Confirm destructive actions.** Delete, mark defective, mark returned — always ask "Are you sure?"
9. **Instant loading feedback.** Every button click shows a spinner. Every success shows a toast message.
10. **Smart dropdowns.** Model dropdown filters based on brand selected. Never show all models at once.

---

## 9. Project Folder Structure

```
phonestore_CRM/
├── app/
│   ├── (auth)/
│   │   └── login/
│   │       └── page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx              ← Nav layout (bottom bar + sidebar)
│   │   ├── page.tsx                ← Dashboard
│   │   ├── inventory/
│   │   │   ├── page.tsx            ← All phones with filters
│   │   │   └── [id]/page.tsx       ← Single phone detail
│   │   ├── lots/
│   │   │   ├── page.tsx            ← Lot list
│   │   │   ├── new/page.tsx        ← Create lot (2-step)
│   │   │   └── [id]/page.tsx       ← Lot detail
│   │   ├── sales/
│   │   │   └── page.tsx            ← Customer + Shop sale tabs
│   │   ├── shops/
│   │   │   ├── page.tsx            ← Shop buyers list
│   │   │   └── [id]/page.tsx       ← Shop detail
│   │   ├── suppliers/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── reports/
│   │   │   └── page.tsx
│   │   └── settings/
│   │       └── page.tsx
│   └── api/
│       ├── lots/
│       │   ├── route.ts            ← GET all, POST create
│       │   └── [id]/
│       │       ├── route.ts        ← GET, PATCH, DELETE
│       │       └── payments/route.ts
│       ├── phones/
│       │   ├── route.ts
│       │   └── [id]/route.ts
│       ├── sales/
│       │   ├── route.ts
│       │   └── [id]/
│       │       └── payments/route.ts
│       ├── shops/
│       │   ├── route.ts
│       │   └── [id]/route.ts
│       ├── suppliers/
│       │   ├── route.ts
│       │   └── [id]/route.ts
│       └── reports/route.ts
│
├── components/
│   ├── ui/                         ← shadcn auto-generated
│   ├── layout/
│   │   ├── BottomNav.tsx
│   │   ├── Sidebar.tsx
│   │   └── Header.tsx
│   ├── dashboard/
│   │   ├── StatCard.tsx
│   │   └── RecentActivity.tsx
│   ├── lots/
│   │   ├── LotCard.tsx
│   │   ├── LotForm.tsx             ← Step 1
│   │   ├── BulkPhoneEntry.tsx      ← Step 2 (most complex component)
│   │   ├── ImeiInputSlot.tsx       ← Single IMEI field with auto-advance
│   │   └── LotPaymentForm.tsx
│   ├── phones/
│   │   ├── PhoneCard.tsx
│   │   └── PhoneFilters.tsx
│   ├── sales/
│   │   ├── CustomerSaleForm.tsx
│   │   ├── ShopSaleForm.tsx
│   │   └── PhoneSearchSelect.tsx   ← Search available phones
│   ├── shops/
│   │   ├── ShopCard.tsx
│   │   └── ShopPaymentForm.tsx
│   └── reports/
│       └── MonthlyCharts.tsx
│
├── lib/
│   ├── db.ts                       ← Prisma client singleton
│   ├── supabase/
│   │   ├── client.ts               ← Browser Supabase client
│   │   └── server.ts               ← Server Supabase client
│   ├── utils/
│   │   ├── currency.ts             ← PKR formatting (lakh display)
│   │   ├── imei.ts                 ← IMEI validation (Luhn algorithm)
│   │   └── dates.ts                ← Date helpers
│   └── phone-models.ts             ← All iPhone + Pixel models list
│
├── prisma/
│   ├── schema.prisma
│   └── seed.ts                     ← Seeds phone models + owner account
│
├── types/
│   └── index.ts                    ← Shared TypeScript types/interfaces
│
└── middleware.ts                   ← Redirect unauthenticated users to /login
```

---

## 10. Build Phases

### Phase 1 — Foundation (Start Here)
- [ ] Init Next.js 14 project (TypeScript, Tailwind, App Router)
- [ ] Install and configure shadcn/ui
- [ ] Create Supabase project, get credentials
- [ ] Write Prisma schema, run migration, connect to Supabase
- [ ] Build login page + auth middleware (redirect to /login if not logged in)
- [ ] Build main layout with mobile bottom nav + desktop sidebar
- [ ] Create `lib/phone-models.ts` with all iPhone + Pixel models
- [ ] Create `lib/utils/currency.ts` for PKR formatting

### Phase 2 — Suppliers & Purchase Lots
- [ ] Suppliers list + add/edit supplier
- [ ] Purchase Lots list page
- [ ] Create Lot — Step 1 (lot info form)
- [ ] Create Lot — Step 2 (bulk phone entry with IMEI slots)
- [ ] Lot detail page (phones list + payment section)
- [ ] Record payment against a lot
- [ ] Edit phone details

### Phase 3 — Inventory
- [ ] Inventory list with all filters
- [ ] Phone search (by partial IMEI or model)
- [ ] Phone detail page
- [ ] Mark as defective / returned

### Phase 4 — Sales
- [ ] Customer sale flow
- [ ] Shop Buyers list + add/edit
- [ ] Shop sale flow (multi-phone)
- [ ] Shop detail page
- [ ] Record payment from shop
- [ ] Sale payment history

### Phase 5 — Dashboard & Reports
- [ ] Dashboard stats (live from DB)
- [ ] Recent activity feed
- [ ] Monthly reports page
- [ ] Inventory snapshot report
- [ ] Lot performance table
- [ ] Charts (bar charts for sales + profit)

### Phase 6 — Settings & Polish
- [ ] Settings page (team member management)
- [ ] Mobile UX polish (spacing, tap targets, keyboard behavior)
- [ ] Loading states + error states everywhere
- [ ] Test entire app on real mobile device
- [ ] Deploy to Vercel + Supabase

---

## 11. Key Business Rules

- IMEI is the unique identifier for every phone. No duplicates allowed.
- A sold phone cannot be sold again without manually changing its status.
- `profit` = `selling_price − cost_price` — always computed, never stored.
- `remaining_to_supplier` = `total_amount − amount_paid` — computed.
- `pending_from_shop` = `selling_price − amount_received` — computed.
- All 6 users have identical access. No restrictions.
- Every record stores `created_by` / `added_by` (the user who did it) for audit trail.
