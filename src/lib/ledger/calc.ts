// Centralised calculation logic for ledger sale transactions.
// Keep ALL sale math here so no duplicate logic lives in components.

export type WeightUnit = "kg" | "maund" | "ton";
export type AreaUnit = "acre" | "hectare";

export const WEIGHT_UNITS: { value: WeightUnit; label: string }[] = [
  { value: "kg", label: "Kg" },
  { value: "maund", label: "Maund" },
  { value: "ton", label: "Ton" },
];

export const AREA_UNITS: { value: AreaUnit; label: string }[] = [
  { value: "acre", label: "Acre" },
  { value: "hectare", label: "Hectare" },
];

/** kilograms contained in one unit */
const KG_PER_UNIT: Record<WeightUnit, number> = {
  kg: 1,
  maund: 40,
  ton: 1000,
};

/** acres contained in one area unit */
const ACRE_PER_UNIT: Record<AreaUnit, number> = {
  acre: 1,
  hectare: 2.47105,
};

export const toKg = (value: number, unit: WeightUnit) => value * (KG_PER_UNIT[unit] ?? 1);
export const fromKg = (kg: number, unit: WeightUnit) => kg / (KG_PER_UNIT[unit] ?? 1);
export const toAcres = (value: number, unit: AreaUnit) => value * (ACRE_PER_UNIT[unit] ?? 1);

export const num = (v: string | number | null | undefined) => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? ""));
  return Number.isFinite(n) ? n : 0;
};

export interface SaleInput {
  grossWeight: number;
  deductions: number;
  weightUnit: WeightUnit;
  rate: number;
  rateUnit: WeightUnit;
  transportCost: number;
  labourCost: number;
  commissionCost: number;
  otherCosts: number;
  totalArea: number;
  areaUnit: AreaUnit;
  totalYield: number;
  yieldUnit: WeightUnit;
  paidAmount: number;
}

export interface SaleResult {
  netWeight: number;
  netWeightKg: number;
  grossSale: number;
  totalCosts: number;
  netSale: number;
  remaining: number;
  paymentStatus: "unpaid" | "partial" | "paid";
  areaAcres: number;
  yieldPerAcre: number | null;
  costPerAcre: number | null;
  saleValuePerAcre: number | null;
  profitPerAcre: number | null;
  costPerUnit: number | null;
  effectiveRate: number | null;
}

export function computeSale(i: SaleInput): SaleResult {
  const netWeight = Math.max(i.grossWeight - i.deductions, 0);
  const netWeightKg = toKg(netWeight, i.weightUnit);

  // rate is expressed per rateUnit → convert net weight into that unit
  const netWeightInRateUnit = fromKg(netWeightKg, i.rateUnit);
  const grossSale = netWeightInRateUnit * i.rate;

  const totalCosts = i.transportCost + i.labourCost + i.commissionCost + i.otherCosts;
  const netSale = grossSale - totalCosts;

  const remaining = Math.max(netSale - i.paidAmount, 0);
  const paymentStatus: SaleResult["paymentStatus"] =
    i.paidAmount <= 0 ? "unpaid" : i.paidAmount >= netSale - 0.01 ? "paid" : "partial";

  const areaAcres = i.totalArea > 0 ? toAcres(i.totalArea, i.areaUnit) : 0;
  const has = (v: number) => v > 0;

  const yieldPerAcre = has(areaAcres) && has(i.totalYield) ? i.totalYield / areaAcres : null;
  const costPerAcre = has(areaAcres) && has(totalCosts) ? totalCosts / areaAcres : null;
  const saleValuePerAcre = has(areaAcres) && has(netSale) ? netSale / areaAcres : null;
  const profitPerAcre = has(areaAcres) && netSale !== 0 ? (netSale - totalCosts) / areaAcres : null;
  const costPerUnit = has(netWeight) && has(totalCosts) ? totalCosts / netWeight : null;
  const effectiveRate = has(netWeight) && has(netSale) ? netSale / netWeight : null;

  return {
    netWeight,
    netWeightKg,
    grossSale,
    totalCosts,
    netSale,
    remaining,
    paymentStatus,
    areaAcres,
    yieldPerAcre,
    costPerAcre,
    saleValuePerAcre,
    profitPerAcre,
    costPerUnit,
    effectiveRate,
  };
}

/**
 * Average yield per acre from the user's own historical sale entries,
 * optionally narrowed to the same crop. Returns null when there is not
 * enough history (fewer than 2 usable records) — never a fake number.
 */
export function averageYieldPerAcre(
  entries: any[],
  opts: { cropType?: string | null; excludeId?: string | null } = {}
): { value: number; unit: WeightUnit; samples: number } | null {
  const crop = (opts.cropType || "").trim().toLowerCase();
  const usable = entries.filter((e) => {
    if (e.entry_type !== "sale") return false;
    if (opts.excludeId && e.id === opts.excludeId) return false;
    if (!(Number(e.total_area) > 0) || !(Number(e.total_yield) > 0)) return false;
    if (crop) return (e.crop_type || "").trim().toLowerCase() === crop;
    return true;
  });
  if (usable.length < 2) return null;

  const unit = (usable[0].yield_unit as WeightUnit) || "kg";
  const perAcre = usable.map((e) => {
    const areaAcres = toAcres(Number(e.total_area), (e.area_unit as AreaUnit) || "acre");
    const yieldInUnit = fromKg(toKg(Number(e.total_yield), (e.yield_unit as WeightUnit) || "kg"), unit);
    return yieldInUnit / areaAcres;
  });
  const value = perAcre.reduce((s, v) => s + v, 0) / perAcre.length;
  return { value, unit, samples: usable.length };
}

export const money = (n: number) =>
  `₨ ${Math.round(n).toLocaleString("en-PK")}`;

export const qty = (n: number, digits = 2) =>
  n.toLocaleString("en-PK", { maximumFractionDigits: digits });
