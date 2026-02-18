

# Ledger Page - Professional Upgrade

## Overview
Complete redesign of the Ledger's "New Transaction" dialog into a professional, tab-based form with three distinct entry types: Expense, Sale, and Payment. Each type will have its own tailored fields, matching the reference screenshots.

## Database Changes
Add new columns to `ledger_entries` table:
- `category` (text, nullable) - for expense categories (seed, fertilizer, pesticide, labour, tractor, irrigation, cash, others)
- `entry_date` (date, default today) - user-selectable transaction date
- `inventory_item_id` (uuid, nullable, FK to inventory) - link expense to inventory item
- `gross_weight` (numeric, nullable) - for sales gross weight
- `deductions` (numeric, nullable) - for sales deductions (moisture, etc.)
- `payment_method` (text, nullable) - "cash" or "crop_return"
- `crop_type` (text, nullable) - for crop return payments
- `crop_weight` (numeric, nullable) - for crop return payments

Net weight for sales will be auto-calculated: `gross_weight - deductions`.

## UI Changes (Ledger.tsx)

### Transaction Type Tabs
Three styled tab buttons at the top (like the reference): **Expense** | **Sale** | **Payment**

### Expense Form
1. **Farmer** - Select dropdown
2. **Date** - Date picker (defaults to today)
3. **Category** - Select: Seed, Fertilizer, Pesticide, Labour, Tractor, Irrigation, Cash, Others
4. **Description** - Text input
5. **Link to Inventory** (Optional) - Select from inventory items; auto-fills price from inventory (editable)
6. **Quantity** - Number input
7. **Amount** - Auto-calculated (price x quantity) or manual entry
8. **50/50 Cost Sharing** - Toggle switch with split amount display

### Sale Form
1. **Farmer** - Select dropdown
2. **Date** - Date picker
3. **Description** - Text input
4. **Gross Weight (kg)** - Number input
5. **Deductions (kg)** - Number input (moisture, etc.)
6. **Net Weight** - Auto-calculated display (gross - deductions)
7. **Rate per kg (Rs)** - Number input
8. **Total Amount** - Auto-calculated display (net weight x rate)

### Payment Form
1. **Farmer** - Select dropdown
2. **Date** - Date picker
3. **Description** - Text input
4. **Payment Method** - Select: Cash Payment / Crop Return
5. If **Cash**: Amount input field
6. If **Crop Return**: Crop Type, Crop Weight (kg), Rate per kg, auto-calculated total

### Inventory Integration
- When user selects an inventory item in Expense form, the price_per_unit auto-fills
- User can override the price
- On save, inventory stock is deducted by the quantity entered

### Entry List Table
Enhanced table showing: Date, Farmer, Type (colored badge), Category, Description, Amount with edit/delete buttons for authorized users.

## Technical Details

### Migration SQL
```sql
ALTER TABLE ledger_entries 
  ADD COLUMN category text,
  ADD COLUMN entry_date date DEFAULT CURRENT_DATE,
  ADD COLUMN inventory_item_id uuid REFERENCES inventory(id),
  ADD COLUMN gross_weight numeric,
  ADD COLUMN deductions numeric,
  ADD COLUMN payment_method text,
  ADD COLUMN crop_type text,
  ADD COLUMN crop_weight numeric;
```

### Files Modified
- `src/pages/Ledger.tsx` - Complete rewrite of the form dialog with tabbed interface, inventory linking, and all new fields
- Database migration for new columns

### Auto-Inventory Deduction Logic
When saving an expense linked to an inventory item:
1. Insert ledger entry
2. Update inventory: `current_stock = current_stock - quantity`
3. Both operations in sequence with error handling

