// ────────────────────────────────────────────────────────────────
// Centralised aggregation for ALL pages (Dashboard, P&L, Ledger,
// Farmer, Reports). Every page must derive its numbers from here so
// the same filter always produces the same totals.
// ────────────────────────────────────────────────────────────────
import { AreaUnit, WeightUnit, toAcres, toKg, fromKg, decomposeMaundKg, formatMaundCompound, type MaundBreakdown } from "./calc";

export interface LedgerRow {
  id?: string;
  farmer_id?: string | null;
  entry_type: string;
  amount: number | string | null;
  category?: string | null;
  crop_type?: string | null;
  field_name?: string | null;
  entry_date?: string | null;
  created_at?: string | null;
  season_id?: string | null;
  // sale specific
  gross_weight?: number | string | null;
  deductions?: number | string | null;
  net_weight?: number | string | null;
  weight_unit?: string | null;
  rate?: number | string | null;
  rate_unit?: string | null;
  transport_cost?: number | string | null;
  labour_cost?: number | string | null;
  commission_cost?: number | string | null;
  other_costs?: number | string | null;
  total_area?: number | string | null;
  area_unit?: string | null;
  total_yield?: number | string | null;
  yield_unit?: string | null;
  paid_amount?: number | string | null;
  payment_status?: string | null;
  payment_method?: string | null;
  is_shared?: boolean | null;
  shared_amount?: number | string | null;
  [k: string]: any;
}

export const n = (v: unknown) => {
  const x = typeof v === "number" ? v : parseFloat(String(v ?? ""));
  return Number.isFinite(x) ? x : 0;
};

export const dateOf = (e: LedgerRow) => e.entry_date || e.created_at || null;

/** Currency — one formatter for the whole app. */
export const money = (v: number) => `Rs ${Math.round(v).toLocaleString("en-PK")}`;
/** Weight / yield / area — 2 decimals, never more. */
export const qty = (v: number, digits = 2) =>
  v.toLocaleString("en-PK", { minimumFractionDigits: digits, maximumFractionDigits: digits });
export const withUnit = (v: number, unit: string, digits = 2) => `${qty(v, digits)} ${unit}`;

/** Preferred display unit for weights across the app. */
export const DISPLAY_WEIGHT_UNIT: WeightUnit = "maund";
export const DISPLAY_AREA_UNIT: AreaUnit = "acre";

// ── per-sale derivation ─────────────────────────────────────────
export interface SaleDerived {
  netWeight: number;
  netWeightUnit: WeightUnit;
  netWeightKg: number;
  netWeightDisplay: number; // in DISPLAY_WEIGHT_UNIT
  netWeightCompound: string;
  netWeightBreakdown: MaundBreakdown;
  grossSale: number;
  costs: number;
  transport: number;
  labour: number;
  commission: number;
  other: number;
  netSale: number;
  paid: number;
  remaining: number;
  paymentStatus: "unpaid" | "partial" | "paid";
  areaAcres: number;
  yieldKg: number;
  yieldDisplay: number;
  yieldPerAcre: number | null; // in DISPLAY_WEIGHT_UNIT per acre
  revenuePerAcre: number | null;
  costPerAcre: number | null;
  profitPerAcre: number | null;
  buyerPayable: number;
  buyerRemaining: number;
}

/** Check if a ledger entry is a payment received from a buyer */
export function isBuyerPayment(e: LedgerRow): boolean {
  if (e.entry_type !== "payment") return false;
  if (e.category === "buyer_payment" || e.category === "buyer_receipt") return true;
  if (typeof e.notes === "string" && (e.notes.includes("[buyer_receipt]") || e.notes.includes("[sale:"))) return true;
  return false;
}

/** Extract linked sale ID from notes or sale_id column if present */
export function getLinkedSaleId(e: LedgerRow): string | null {
  if (e.sale_id) return String(e.sale_id);
  if (!e.notes) return null;
  const match = e.notes.match(/\[sale:([^\]]+)\]/);
  if (match) return match[1];
  const match2 = e.notes.match(/Linked Sale:\s*([^\s,]+)/);
  if (match2) return match2[1];
  return null;
}

/** Derive every sale metric from a stored row. Backward compatible:
 *  old rows without the new columns simply yield 0 / null. */
export function deriveSale(e: LedgerRow, extraPaid = 0): SaleDerived {
  const weightUnit = ((e.weight_unit as WeightUnit) || "kg") as WeightUnit;
  const gross = n(e.gross_weight);
  const ded = n(e.deductions);
  const stored = n(e.net_weight);
  const netWeight = stored > 0 ? stored : Math.max(gross - ded, 0);
  const netWeightKg = toKg(netWeight, weightUnit);
  const netWeightBreakdown = decomposeMaundKg(netWeightKg);
  const netWeightCompound = weightUnit === "maund"
    ? formatMaundCompound(netWeightKg)
    : `${qty(netWeight)} ${weightUnit}`;

  const rate = n(e.rate);
  const rateUnit = ((e.rate_unit as WeightUnit) || weightUnit) as WeightUnit;
  const netWeightInRateUnit = fromKg(netWeightKg, rateUnit);
  const calculatedGross = rate > 0 && netWeightInRateUnit > 0 ? Math.round(netWeightInRateUnit * rate * 100) / 100 : 0;
  const storedAmount = n(e.amount);
  // Authoritative gross sale: use rate * quantity when both rate and weight exist; fallback to stored amount
  const grossSale = calculatedGross > 0 ? calculatedGross : storedAmount;

  const transport = n(e.transport_cost);
  const labour = n(e.labour_cost);
  const commission = n(e.commission_cost);
  const other = n(e.other_costs);
  const costs = transport + labour + commission + other;
  const netSale = grossSale - costs;
  const buyerPayable = Math.max(grossSale - commission, 0);

  const initialPaid = n(e.paid_amount);
  const paid = initialPaid + extraPaid;
  const buyerRemaining = Math.max(buyerPayable - paid, 0);
  const remaining = Math.max(netSale - paid, 0);
  const targetThreshold = buyerPayable > 0 ? buyerPayable : netSale;
  const paymentStatus: SaleDerived["paymentStatus"] =
    paid <= 0 ? "unpaid" : paid >= targetThreshold - 0.01 ? "paid" : "partial";

  const areaAcres = n(e.total_area) > 0 ? toAcres(n(e.total_area), (e.area_unit as AreaUnit) || "acre") : 0;
  const yieldKg = n(e.total_yield) > 0 ? toKg(n(e.total_yield), (e.yield_unit as WeightUnit) || "kg") : 0;
  const yieldDisplay = fromKg(yieldKg, DISPLAY_WEIGHT_UNIT);

  const ok = (v: number) => v > 0;
  return {
    netWeight,
    netWeightUnit: weightUnit,
    netWeightKg,
    netWeightDisplay: fromKg(netWeightKg, DISPLAY_WEIGHT_UNIT),
    netWeightCompound,
    netWeightBreakdown,
    grossSale,
    costs,
    transport,
    labour,
    commission,
    other,
    netSale,
    buyerPayable,
    buyerRemaining,
    paid,
    remaining,
    paymentStatus,
    areaAcres,
    yieldKg,
    yieldDisplay,
    yieldPerAcre: ok(areaAcres) && ok(yieldKg) ? yieldDisplay / areaAcres : null,
    revenuePerAcre: ok(areaAcres) ? netSale / areaAcres : null,
    costPerAcre: ok(areaAcres) && ok(costs) ? costs / areaAcres : null,
    profitPerAcre: ok(areaAcres) ? netSale / areaAcres : null,
  };
}

// ── filters (same rules on every page) ──────────────────────────
export interface LedgerFilter {
  seasonId?: string | null;
  farmerId?: string | null;
  crop?: string | null;
  field?: string | null;
  category?: string | null;
  from?: string | null; // yyyy-mm-dd
  to?: string | null;
}

const same = (a?: string | null, b?: string | null) =>
  (a || "").trim().toLowerCase() === (b || "").trim().toLowerCase();

export function applyFilter(entries: LedgerRow[], f: LedgerFilter = {}): LedgerRow[] {
  return entries.filter((e) => {
    if (f.seasonId && e.season_id !== f.seasonId) return false;
    if (f.farmerId && f.farmerId !== "all" && e.farmer_id !== f.farmerId) return false;
    if (f.crop && f.crop !== "all" && !same(e.crop_type, f.crop)) return false;
    if (f.field && f.field !== "all" && !same(e.field_name, f.field)) return false;
    if (f.category && f.category !== "all" && !same(e.category, f.category)) return false;
    const d = dateOf(e)?.slice(0, 10);
    if (f.from && (!d || d < f.from)) return false;
    if (f.to && (!d || d > f.to)) return false;
    return true;
  });
}

// ── totals ──────────────────────────────────────────────────────
export interface LedgerTotals {
  count: number;
  salesCount: number;
  grossSales: number;
  saleCosts: number;
  /** Sale-cost breakdown (same rows as saleCosts — never counted as expenses). */
  transportCosts: number;
  labourCosts: number;
  commissionCosts: number;
  otherSaleCosts: number;
  netSales: number;
  expenses: number;
  /** Operating expenses + sale-level costs */
  totalExpenses: number;
  payments: number;
  farmerPaymentsCash: number;
  farmerPaymentsCrop: number;
  loans: number;
  /** Money actually received against sales (buyer side). */
  saleReceived: number;
  /** Still receivable from buyers on recorded sales. */
  saleOutstanding: number;
  /** Actual cash received (saleReceived + cash payments from farmers). */
  cashReceived: number;
  /** Actual cash outflows (operating expenses + sale costs + loans). */
  cashDisbursed: number;
  /** Operating cash balance (cashReceived - cashDisbursed). */
  cashBalance: number;
  netProfit: number;
  profitMargin: number;
  totalAreaAcres: number;
  totalYieldDisplay: number; // maund
  totalQuantitySold: number; // maund (net weight)
  yieldPerAcre: number | null;
  revenuePerAcre: number | null;
  costPerAcre: number | null;
  profitPerAcre: number | null;
  weightUnitLabel: string;
  areaUnitLabel: string;
}

export function computeTotals(entries: LedgerRow[]): LedgerTotals {
  let grossSales = 0,
    saleCosts = 0,
    transportCosts = 0,
    labourCosts = 0,
    commissionCosts = 0,
    otherSaleCosts = 0,
    expenses = 0,
    payments = 0,
    farmerPaymentsCash = 0,
    farmerPaymentsCrop = 0,
    loans = 0,
    saleReceived = 0,
    saleOutstanding = 0,
    area = 0,
    yieldSum = 0,
    qtySold = 0,
    salesCount = 0;

  // Pre-calculate buyer receipts allocated to specific sales or general
  const buyerReceiptsBySale = new Map<string, number>();
  let unlinkedBuyerReceipts = 0;
  entries.forEach((e) => {
    if (isBuyerPayment(e)) {
      const amt = n(e.amount);
      const saleId = getLinkedSaleId(e);
      if (saleId) {
        buyerReceiptsBySale.set(saleId, (buyerReceiptsBySale.get(saleId) || 0) + amt);
      } else {
        unlinkedBuyerReceipts += amt;
      }
    }
  });

  entries.forEach((e) => {
    const amt = n(e.amount);
    if (e.entry_type === "sale") {
      const extraReceipts = e.id ? (buyerReceiptsBySale.get(e.id) || 0) : 0;
      const s = deriveSale(e, extraReceipts);
      salesCount += 1;
      grossSales += s.grossSale;
      saleCosts += s.costs;
      transportCosts += s.transport;
      labourCosts += s.labour;
      commissionCosts += s.commission;
      otherSaleCosts += s.other;
      saleReceived += s.paid;
      saleOutstanding += s.remaining;
      area += s.areaAcres;
      yieldSum += s.yieldDisplay;
      qtySold += s.netWeightDisplay;
    } else if (e.entry_type === "expense") {
      expenses += amt;
    } else if (e.entry_type === "payment") {
      if (!isBuyerPayment(e)) {
        payments += amt;
        if (e.payment_method === "crop_return") {
          farmerPaymentsCrop += amt;
        } else {
          farmerPaymentsCash += amt;
        }
      }
    } else if (e.entry_type === "loan") {
      loans += amt;
    }
  });

  if (unlinkedBuyerReceipts > 0) {
    saleReceived += unlinkedBuyerReceipts;
    saleOutstanding = Math.max(saleOutstanding - unlinkedBuyerReceipts, 0);
  }

  const netSales = grossSales - saleCosts;
  // Sale costs are stored on the sale row and are NOT separate expense
  // entries, so counting both here does not double-count.
  const totalExpenses = expenses + saleCosts;
  const netProfit = netSales - expenses;

  const cashReceived = saleReceived + farmerPaymentsCash;
  const cashDisbursed = expenses + saleCosts + loans;
  const cashBalance = cashReceived - cashDisbursed;

  return {
    count: entries.length,
    salesCount,
    grossSales,
    saleCosts,
    transportCosts,
    labourCosts,
    commissionCosts,
    otherSaleCosts,
    netSales,
    expenses,
    totalExpenses,
    payments,
    farmerPaymentsCash,
    farmerPaymentsCrop,
    loans,
    saleReceived,
    saleOutstanding,
    cashReceived,
    cashDisbursed,
    cashBalance,
    netProfit,
    profitMargin: grossSales > 0 ? (netProfit / grossSales) * 100 : 0,
    totalAreaAcres: area,
    totalYieldDisplay: yieldSum,
    totalQuantitySold: qtySold,
    yieldPerAcre: area > 0 && yieldSum > 0 ? yieldSum / area : null,
    revenuePerAcre: area > 0 ? netSales / area : null,
    costPerAcre: area > 0 ? (saleCosts + expenses) / area : null,
    profitPerAcre: area > 0 ? netProfit / area : null,
    weightUnitLabel: "Maund",
    areaUnitLabel: "Acre",
  };
}

// ── grouped views ───────────────────────────────────────────────
export interface CropRow {
  crop: string;
  grossSales: number;
  netSales: number;
  expenses: number;
  costs: number;
  profit: number;
  areaAcres: number;
  yieldDisplay: number;
  yieldPerAcre: number | null;
  received: number;
  outstanding: number;
}

export function groupByCrop(entries: LedgerRow[]): CropRow[] {
  const map = new Map<string, { crop: string; rows: LedgerRow[] }>();
  entries.forEach((e) => {
    const raw = (e.crop_type || "").trim();
    const key = raw.toLowerCase() || "uncategorized";
    const existing = map.get(key);
    if (existing) {
      existing.rows.push(e);
      if (raw && (existing.crop === "Uncategorized" || (raw[0] === raw[0].toUpperCase() && existing.crop[0] !== existing.crop[0].toUpperCase()))) {
        existing.crop = raw;
      }
    } else {
      map.set(key, { crop: raw || "Uncategorized", rows: [e] });
    }
  });
  return Array.from(map.values(), ({ crop, rows }) => {
    const t = computeTotals(rows);
    return {
      crop,
      grossSales: t.grossSales,
      netSales: t.netSales,
      expenses: t.expenses,
      costs: t.saleCosts,
      profit: t.netProfit,
      areaAcres: t.totalAreaAcres,
      yieldDisplay: t.totalYieldDisplay,
      yieldPerAcre: t.yieldPerAcre,
      received: t.saleReceived,
      outstanding: t.saleOutstanding,
    };
  }).sort((a, b) => b.profit - a.profit);
}

export interface MonthRow {
  month: string;
  income: number;
  netSales: number;
  saleCosts: number;
  expenses: number;
  totalExpenses: number;
  profit: number;
  received: number;
  outstanding: number;
}

export function groupByMonth(entries: LedgerRow[]): MonthRow[] {
  const map = new Map<string, LedgerRow[]>();
  entries.forEach((e) => {
    const d = dateOf(e);
    if (!d) return;
    const key = d.slice(0, 7);
    if (!key || key.length < 7) return;
    const arr = map.get(key) || [];
    arr.push(e);
    map.set(key, arr);
  });
  return Array.from(map, ([month, rows]) => {
    const t = computeTotals(rows);
    return {
      month,
      income: t.grossSales,
      netSales: t.netSales,
      saleCosts: t.saleCosts,
      expenses: t.expenses,
      totalExpenses: t.expenses + t.saleCosts,
      profit: t.netProfit,
      received: t.saleReceived,
      outstanding: t.saleOutstanding,
    };
  }).sort((a, b) => a.month.localeCompare(b.month));
}

export interface FarmerSummary extends LedgerTotals {
  farmerId: string;
  openingBalance: number;
  /** Expense amount allocated to the farmer (respects 50/50 & landlord-only). */
  farmerExpenses: number;
  /** Farmer's 50% share of net profit. */
  farmerProfitShare: number;
  /** Opening + farmer expenses + loans − farmer profit share − payments. */
  balanceDue: number;
  lastActivity: string | null;
}

/** Farmer-share of an expense row (respects 50/50 split & landlord-only). */
export const farmerShareOfExpense = (e: LedgerRow) => {
  if (e.payment_method === "landlord_only") return 0;
  if (e.is_shared) return n(e.shared_amount) || n(e.amount) / 2;
  return n(e.amount);
};

export function summarizeFarmer(
  entries: LedgerRow[],
  farmerId: string,
  openingBalance = 0
): FarmerSummary {
  const rows = entries.filter((e) => e.farmer_id === farmerId);
  const totals = computeTotals(rows);
  const farmerExpenses = rows
    .filter((e) => e.entry_type === "expense")
    .reduce((s, e) => s + farmerShareOfExpense(e), 0);
  // Profit is split 50/50 between farmer and landlord — only the profit is
  // split, never the expenses (those are already allocated per row).
  const farmerProfitShare = totals.netProfit / 2;
  const balanceDue =
    openingBalance + farmerExpenses + totals.loans - farmerProfitShare - totals.payments;
  const last = rows
    .map((e) => dateOf(e))
    .filter(Boolean)
    .sort()
    .pop() as string | undefined;
  return {
    ...totals,
    farmerId,
    openingBalance,
    farmerExpenses,
    farmerProfitShare,
    balanceDue,
    lastActivity: last ?? null,
  };
}


/** Average yield/acre across sales with usable area+yield. Null when <2 samples. */
export function averageYield(entries: LedgerRow[], crop?: string | null) {
  const usable = entries.filter(
    (e) =>
      e.entry_type === "sale" &&
      n(e.total_area) > 0 &&
      n(e.total_yield) > 0 &&
      (!crop || same(e.crop_type, crop))
  );
  if (usable.length < 2) return null;
  const vals = usable.map((e) => {
    const s = deriveSale(e);
    return s.yieldPerAcre ?? 0;
  });
  return { value: vals.reduce((a, b) => a + b, 0) / vals.length, samples: usable.length };
}

// ── buyer / shopkeeper / mill view ──────────────────────────────
export interface BuyerRow {
  buyer: string;
  salesCount: number;
  grossSales: number;
  costs: number;
  netSales: number;
  paid: number;
  outstanding: number;
}

/** Group sale rows and buyer payments by buyer (shopkeeper / mill). Reuses computeTotals — no new formulas. */
export function groupByBuyer(entries: LedgerRow[]): BuyerRow[] {
  const sales = entries.filter((e) => e.entry_type === "sale");
  const buyerReceipts = entries.filter(isBuyerPayment);
  const map = new Map<string, { buyer: string; rows: LedgerRow[] }>();
  sales.forEach((e) => {
    const raw = (e.buyer || "").trim();
    const key = raw.toLowerCase() || "unspecified buyer";
    const existing = map.get(key);
    if (existing) {
      existing.rows.push(e);
      if (raw && (existing.buyer === "Unspecified buyer" || (raw[0] === raw[0].toUpperCase() && existing.buyer[0] !== existing.buyer[0].toUpperCase()))) {
        existing.buyer = raw;
      }
    } else {
      map.set(key, { buyer: raw || "Unspecified buyer", rows: [e] });
    }
  });

  // Group buyer receipts under corresponding buyer
  buyerReceipts.forEach((e) => {
    const raw = (e.buyer || "").trim();
    const key = raw.toLowerCase() || "unspecified buyer";
    const existing = map.get(key);
    if (existing) {
      existing.rows.push(e);
      if (raw && (existing.buyer === "Unspecified buyer" || (raw[0] === raw[0].toUpperCase() && existing.buyer[0] !== existing.buyer[0].toUpperCase()))) {
        existing.buyer = raw;
      }
    } else {
      map.set(key, { buyer: raw || "Unspecified buyer", rows: [e] });
    }
  });
  return Array.from(map.values(), ({ buyer, rows }) => {
    const t = computeTotals(rows);
    return {
      buyer,
      salesCount: t.salesCount,
      grossSales: t.grossSales,
      costs: t.saleCosts,
      netSales: t.netSales,
      paid: t.saleReceived,
      outstanding: t.saleOutstanding,
    };
  }).sort((a, b) => b.outstanding - a.outstanding || b.netSales - a.netSales);
}
