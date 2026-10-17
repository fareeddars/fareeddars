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

export const KG_PER_UNIT: Record<WeightUnit, number> = {
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

export interface MaundBreakdown {
  maunds: number;
  kg: number;
  totalKg: number;
  totalMaunds: number;
}

/**
 * Decomposes a weight (in kg) into whole Maunds and remainder Kilograms,
 * adhering to the application's standard conversion factor (1 Maund = 40 Kg).
 * E.g., 3994 kg -> 99 Maunds, 34 kg.
 */
export function decomposeMaundKg(totalKg: number): MaundBreakdown {
  const kgPerMaund = KG_PER_UNIT.maund ?? 40;
  if (!Number.isFinite(totalKg) || totalKg <= 0) {
    return { maunds: 0, kg: 0, totalKg: 0, totalMaunds: 0 };
  }
  const safeKg = Math.round(totalKg * 1000) / 1000;
  let maunds = Math.floor(safeKg / kgPerMaund);
  let remKg = Math.round((safeKg - maunds * kgPerMaund) * 100) / 100;
  if (remKg >= kgPerMaund) {
    maunds += 1;
    remKg = 0;
  }
  return {
    maunds,
    kg: remKg,
    totalKg: safeKg,
    totalMaunds: safeKg / kgPerMaund,
  };
}

/**
 * Formats a weight in kilograms into the standard agricultural "Mann + remaining Kg" representation.
 * Example: 3994 kg -> "99 Mann 34 Kg" (Urdu: "99 من 34 کلو", Sindhi: "99 مڻ 34 ڪلو").
 * If remainder kg is 0: "100 Mann".
 */
export function formatMaundCompound(
  totalKg: number,
  options: { lang?: "en" | "ur" | "sd"; showDecimalSuffix?: boolean } = {}
): string {
  const { maunds, kg } = decomposeMaundKg(totalKg);
  const lang = options.lang || "en";
  const mannLabel = lang === "ur" ? "من" : lang === "sd" ? "مڻ" : "Mann";
  const kgLabel = lang === "ur" ? "کلو" : lang === "sd" ? "ڪلو" : "Kg";

  if (maunds === 0 && kg === 0) {
    return `0 ${mannLabel}`;
  }

  let text = "";
  if (maunds > 0 && kg > 0) {
    const formattedKg = kg % 1 === 0 ? String(kg) : qty(kg, 2);
    text = `${maunds} ${mannLabel} ${formattedKg} ${kgLabel}`;
  } else if (maunds > 0) {
    text = `${maunds} ${mannLabel}`;
  } else {
    const formattedKg = kg % 1 === 0 ? String(kg) : qty(kg, 2);
    text = `0 ${mannLabel} ${formattedKg} ${kgLabel}`;
  }

  if (options.showDecimalSuffix) {
    const totalMaunds = totalKg / (KG_PER_UNIT.maund ?? 40);
    text += ` (${qty(totalMaunds, 2)} ${mannLabel})`;
  }

  return text;
}

export const num = (v: string | number | null | undefined) => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? ""));
  return Number.isFinite(n) ? n : 0;
};

export interface SaleInput {
  grossWeight: number;
  deductions: number;
  deductionUnit?: WeightUnit;
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
  netWeightBreakdown: MaundBreakdown;
  netWeightFormatted: string;
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
  // Agricultural standard: deductions default to Kg when sale unit is Maund or Ton, or fallback to weightUnit
  const dedUnit = i.deductionUnit ?? (i.weightUnit === "maund" || i.weightUnit === "ton" ? "kg" : i.weightUnit);
  const grossWeightKg = toKg(i.grossWeight, i.weightUnit);
  const deductionsKg = toKg(i.deductions, dedUnit);
  const netWeightKg = Math.max(grossWeightKg - deductionsKg, 0);
  const netWeight = fromKg(netWeightKg, i.weightUnit);
  const netWeightBreakdown = decomposeMaundKg(netWeightKg);
  const netWeightFormatted =
    i.weightUnit === "maund"
      ? formatMaundCompound(netWeightKg)
      : `${qty(netWeight)} ${i.weightUnit}`;

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
    netWeightBreakdown,
    netWeightFormatted,
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
