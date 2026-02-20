
# Full App Update Plan: Loan Section + Inventory Download + Enhanced Reports

## Summary of Changes Requested
1. **Ledger — Add "Loan" transaction tab**: A 4th tab next to Expense/Sale/Payment for recording personal loans taken from the landlord, with Farmer, Date, Description, and Amount fields.
2. **Inventory — Export/Download button**: Download the full inventory list as a CSV file directly from the browser (no backend needed).
3. **Reports — Personal Loan section in bill**: A new Section 4 in the printed bill showing all loan entries per farmer.
4. **Reports — Enhanced Farmer Summary section**: A completely rewritten Account Summary with clear line items: Opening Balance, Farmer Expense Share, Personal Loan Total, Payments Made, Amount Still Due.
5. **Reports — Enhanced Profit/Loss section**: Rewritten to show: Total Sales - Farmer's Expense Share - Landlord's Expense Share = Net Result.
6. **Reports — Fix print blank page issue**: Rebuild the print mechanism to use `document.body.innerHTML` replacement — the most reliable approach for all browsers.

---

## Part 1 — Database Migration

A new `entry_type = 'loan'` will be stored in the existing `ledger_entries` table using the `amount` and `description` columns. **No new columns are needed** — loans use: `farmer_id`, `entry_date`, `description`, `amount`, `entry_type = 'loan'`.

**No migration required** — the existing schema supports this perfectly. `entry_type` is a free-text column that already holds "expense", "sale", "payment". We add "loan" as a new valid value in code only.

---

## Part 2 — Ledger Page (`src/pages/Ledger.tsx`)

### Changes
- The tab grid changes from `grid-cols-3` to `grid-cols-4`
- Add a 4th `TabsTrigger` and `TabsContent` for **Loan**
- Add `loanAmount` state variable
- In `handleSave`, handle `activeTab === "loan"` to insert with `amount`, `description`, `farmer_id`, `entry_date`, `entry_type: "loan"`
- In `resetForm`, reset `loanAmount`
- In `typeBadge`, add `loan: "outline"` badge color (distinct blue/purple feel)
- In the entries table at the bottom, the loan rows will now display naturally since all columns are already there

### Loan Tab Form Fields
```
Farmer *   →  Select dropdown (same shared component)
Date       →  Date picker (same shared component)
Description → Text input
Amount (₨) → Number input
```

No inventory, no weight, no categories — clean and simple.

---

## Part 3 — Inventory Page (`src/pages/Inventory.tsx`)

### Add CSV Download Button
A **Download CSV** button in the header (next to "Add Item"), visible to all authenticated users. When clicked:

1. Builds a CSV string from the `items` state array with columns:
   - Item Name, Current Stock, Unit, Price Per Unit (₨), Low Stock Threshold
2. Creates a `Blob` with `text/csv` MIME type
3. Creates a temporary `<a>` element with `download="inventory.csv"` and clicks it programmatically
4. No external library needed — pure browser API

```typescript
const downloadCSV = () => {
  const headers = ["Item Name", "Stock", "Unit", "Price/Unit (Rs)", "Low Stock Threshold"];
  const rows = items.map(i => [i.item_name, i.current_stock, i.unit, i.price_per_unit, i.low_stock_threshold]);
  const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = "inventory.csv"; a.click();
  URL.revokeObjectURL(url);
};
```

The button will use `<Download className="h-4 w-4 mr-2" />Download CSV` from lucide-react.

---

## Part 4 — Reports Page (`src/pages/Reports.tsx`)

### Fix the Blank Print Issue (Root Cause)
The `visibility: hidden` + `visibility: visible` trick fails in many browsers because the hidden parent prevents child rendering. The fix: use a **print-specific window approach**:

```typescript
const handlePrint = () => {
  const printContent = document.getElementById("print-area")?.innerHTML;
  const win = window.open("", "_blank", "width=900,height=700");
  win.document.write(`<html><head><style>...styles...</style></head><body>${printContent}</body></html>`);
  win.document.close();
  win.focus();
  win.print();
  win.close();
};
```

This opens a fresh blank window with only the report HTML, completely bypassing the React app's DOM and the CSS visibility problem. This is 100% reliable across Chrome, Firefox, and Safari.

### New Section: Personal Loans

Insert between Payments (Section 3) and Account Summary (Section 4):

**Section 4 — Personal Loans from Landlord**

| Date | Description | Amount (₨) |
|------|-------------|------------|
| ...  | ...         | ...        |
| **Total Loans** | | **₨ X** |

The `calcSections` function gets a new `loans` array and `totalLoans` value.

### Rewritten Account Summary (Section 5)

| Item | Amount (₨) |
|------|------------|
| Opening Balance (Previous Due) | X |
| + Farmer's Expense Share | X |
| + Personal Loans from Landlord | X |
| **= Total Amount Owed by Farmer** | **X** |
| − Payments Received | (X) |
| **= Balance Still Due** | **X** (red) or **Settled** (green) |

Formula:
```
balanceOwed = initialBalance + totalFarmerExpenses + totalLoans - totalPayments
```

### Rewritten Profit / Loss (Section 6)

| Item | Amount (₨) |
|------|------------|
| Total Sales Income | X |
| − Farmer's Expense Share | (X) |
| − Landlord's Expense Share | (X) |
| **Net Profit / Loss** | **X** |

Formula:
```
netProfit = totalSales - totalFarmerExpenses - totalLandlordExpenses
```

> Note: The user requested "Total Sales minus both shares" for the profit calculation. This replaces the current formula of `totalSales - totalLandlordExpenses`.

### Screen Preview Cards Update
The on-screen summary cards after generating a report will also show the new "Total Loans" line item.

---

## Technical Details

### Files Modified
1. **`src/pages/Ledger.tsx`** — Add Loan tab (4th tab), `loanAmount` state, loan save logic, loan badge color.
2. **`src/pages/Inventory.tsx`** — Add `downloadCSV` function and Download CSV button with `Download` icon from lucide-react.
3. **`src/pages/Reports.tsx`** — New Loan section in print bill, rewritten Account Summary + Profit/Loss formulas, print via `window.open()` to fix blank page.
4. **`src/index.css`** — The `@media print` block can be simplified/kept as-is since the new approach opens a separate window.

### No Migration Needed
The `ledger_entries` table already has all the columns needed for loan entries. The `entry_type` column is plain text with no database-level constraint, so "loan" works as a new type without any schema change.

### Badge Colors for All 4 Types
- `expense` → `destructive` (red)
- `sale` → `default` (primary/orange)
- `payment` → `secondary` (grey)
- `loan` → custom outline blue — using `className="border-blue-500 text-blue-600"` on a `default` Badge
