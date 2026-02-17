

# Agriculture Ledger - Professional Finance App

## Phase 1: Foundation & Authentication
- **Branded Login Page** with email/password authentication via Supabase Auth
- **Role-Based Access Control (RBAC)** with 3 roles: Admin, Manager, Staff
  - Separate `user_roles` table with secure RLS policies
  - Admin Panel to create users, assign roles, toggle permissions (canCreate, canEdit, canDelete, isActive)
  - Enforced permission checks throughout the app
- **Slate sidebar navigation** with premium SaaS aesthetic, fully responsive for mobile

## Phase 2: Farmer Management
- **Farmer onboarding form** with contact info, farm details, initial balances
- Confirmation step before saving
- Farmer list with search/filter
- Individual farmer profile pages showing account summary

## Phase 3: Ledger System
- **Expenses entries** with 50/50 cost-sharing toggle
- **Sales entries** with net weight and rate calculation
- **Payment History** (money return records) — tracks both loans given and payments received
- Full account statement per farmer ("taken vs. returned")
- Permission-based controls (staff can add, only authorized users can delete)

## Phase 4: Inventory Management
- Stock tracking for items (fertilizer bags, seeds, etc.)
- **Auto-Inventory Deduct**: giving items to a farmer automatically deducts from stock and adds to farmer's balance
- Low stock alerts

## Phase 5: Profit/Loss Calculator
- Monthly earnings calculation
- Expense categories (electricity, diesel, labor, etc.)
- Clear net profit display after all deductions
- Dashboard with summary charts (income vs. expenses over time)

## Phase 6: PDF Bill Generation
- Professional bill generation using jsPDF
- Separate tables for costs and income
- Final Profit/Loss summary section
- Farmer account statement export

## Phase 7: Multi-Language Support
- Language toggle: **English, Urdu, Sindhi**
- **RTL layout** support for Urdu/Sindhi
- All UI labels, buttons, placeholders switch instantly
- PDF bills generated in the selected language with proper Unicode support

## Design & UX
- Premium slate-themed sidebar with dark mode support
- Mobile-first responsive design optimized for farmers on phones
- Fast, clean interface with minimal loading times
- Toast notifications for all actions
- Confirmation dialogs for destructive operations

## Backend (Supabase)
- Cloud database with real-time sync (data safe across devices)
- Row-Level Security policies enforcing role-based permissions
- Secure authentication with password reset flow
- Edge functions for sensitive operations

