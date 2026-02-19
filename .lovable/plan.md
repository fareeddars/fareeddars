
# Three-Part Professional Upgrade Plan

## What Will Be Built

### Part 1 - Farmer Edit & Delete
Add edit and delete buttons to each farmer card. Managers/Admins can edit, Admins can delete.

### Part 2 - Inventory Edit & Delete
Add edit and delete buttons to each inventory item card. Managers/Admins can edit, Admins can delete.

### Part 3 - Professional Reports Page (PDF Bills)
Complete rewrite of `src/pages/Reports.tsx` with full PDF generation using the browser's built-in print system (no extra package needed), with professional bill layout showing all data in tables.

---

## Detailed Design

### Farmer Cards - Edit & Delete

Each farmer card will get two icon buttons in the header:
- **Edit** (pencil icon) — opens a pre-filled dialog to update name, phone, address, farm details, initial balance. Visible to managers and admins.
- **Delete** (trash icon) — shows a confirmation alert dialog. Visible to admins only.

RLS already supports both: `Managers can update farmers` and `Admins can delete farmers` policies are in place.

### Inventory Cards - Edit & Delete

Same pattern as farmer cards:
- **Edit** — pre-fills item name, current stock, unit, price per unit, low stock threshold.
- **Delete** — confirmation dialog before deleting. Admins only.

RLS already supports both: `Managers can update inventory` and `Admins can delete inventory` policies exist.

---

### Reports Page - Professional PDF Bill

#### Selection Controls
At the top of the page, two controls:
1. **Farmer Selector** — dropdown with "All Farmers" option plus individual farmer names
2. **Date Range** — Month/Year picker (optional filter)
3. **Generate Report** button — opens a print-ready view

#### Report Content (per farmer or all farmers combined)

The printed bill will have clearly separated sections with professional tables:

**Section 1 — Expenses Breakdown**

| Date | Category | Description | Farmer Share (₨) | Landlord Share (₨) | Total (₨) |
|---|---|---|---|---|---|
| ... | Seed | ... | 5,000 | 5,000 | 10,000 |

- If `is_shared = true`, split 50/50 between farmer and landlord columns
- If not shared, full amount goes to farmer column
- **Footer row**: Total Farmer Expenses | Total Landlord Expenses | Grand Total

**Section 2 — Sales Summary**

| Date | Description | Gross Weight (kg) | Deductions (kg) | Net Weight (kg) | Rate (₨/kg) | Total (₨) |
|---|---|---|---|---|---|---|

- **Footer**: Total kg sold | Total Sale Amount

**Section 3 — Payments from Farmer**

| Date | Method | Details | Amount (₨) |
|---|---|---|---|
| ... | Cash | — | 50,000 |
| ... | Crop Return | Wheat 500kg @ ₨80 | 40,000 |

- **Footer**: Total Received from Farmer

**Section 4 — Account Summary**

| Item | Amount (₨) |
|---|---|
| Total Expenses (Farmer's Share) | X |
| Total Sales Income | X |
| Total Received (Payments) | X |
| **Balance Owed by Farmer** | X |

**Section 5 — Profit / Loss**

| Item | Amount (₨) |
|---|---|
| Total Sales Income | X |
| Total Expenses (Landlord Share) | X |
| **Net Profit / Loss** | X (green if profit, red if loss) |

#### Print Implementation
- A `<div id="print-area">` is rendered off-screen (or shown in a modal) with professional styling
- `window.print()` is called, with `@media print` CSS that shows only the report area
- No extra npm packages needed — uses browser's native print dialog
- The print layout uses clean black-and-white styling, company/farm name header, date generated, page numbers

---

## Files to Modify

1. **`src/pages/Farmers.tsx`** — Add edit dialog (pre-filled form + update call) and delete confirmation dialog to each farmer card.

2. **`src/pages/Inventory.tsx`** — Add edit dialog (pre-filled form + update call) and delete confirmation dialog to each inventory item card.

3. **`src/pages/Reports.tsx`** — Complete rewrite: farmer selector, data fetching from `ledger_entries` joined with `farmers`, all 5 calculation sections, and `window.print()` based PDF generation.

4. **`src/index.css`** — Add `@media print` styles to hide the sidebar/nav and show only the report area when printing.

---

## Technical Notes

- No database migrations needed — all required data already exists in `ledger_entries`, `farmers`, and `inventory` tables.
- Expense sharing logic: `is_shared = true` means 50/50 split; `shared_amount` stores the farmer's half.
- Farmer balance = `initial_balance + total_expenses_farmer_share - total_payments_received`.
- Profit = `total_sales - total_expenses_landlord_share`.
- All monetary values displayed in `₨` with `toLocaleString()` formatting.
- Role-based visibility: edit shown to `isManagerOrAdmin`, delete shown to `isAdmin` (matching existing RLS policies).
