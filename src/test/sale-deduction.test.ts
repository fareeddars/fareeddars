import { describe, it, expect } from "vitest";
import { computeSale, toKg, fromKg } from "@/lib/ledger/calc";

describe("Sale Deduction Unit Conversion Logic", () => {
  it("converts Maund gross weight with default Kg deductions accurately (1 maund = 40 kg)", () => {
    // 100 Maunds gross (4,000 kg), 40 kg deduction (= 1 maund deduction)
    // Net weight must be exactly 99 Maunds (3,960 kg)
    const result = computeSale({
      grossWeight: 100,
      deductions: 40,
      deductionUnit: "kg",
      weightUnit: "maund",
      rate: 5000,
      rateUnit: "maund",
      transportCost: 0,
      labourCost: 0,
      commissionCost: 0,
      otherCosts: 0,
      totalArea: 0,
      areaUnit: "acre",
      totalYield: 0,
      yieldUnit: "maund",
      paidAmount: 0,
    });

    expect(result.netWeight).toBe(99);
    expect(result.netWeightKg).toBe(3960);
    expect(result.grossSale).toBe(495000); // 99 * 5,000
  });

  it("automatically defaults deduction unit to kg when weightUnit is maund and deductionUnit is omitted", () => {
    // Omitted deductionUnit on maund sale should default to kg
    const result = computeSale({
      grossWeight: 50,
      deductions: 20, // 20 kg = 0.5 maund
      weightUnit: "maund",
      rate: 4000,
      rateUnit: "maund",
      transportCost: 0,
      labourCost: 0,
      commissionCost: 0,
      otherCosts: 0,
      totalArea: 0,
      areaUnit: "acre",
      totalYield: 0,
      yieldUnit: "maund",
      paidAmount: 0,
    });

    expect(result.netWeight).toBe(49.5);
    expect(result.netWeightKg).toBe(1980);
    expect(result.grossSale).toBe(198000);
  });

  it("correctly handles explicit Maund deductions when user selects Maund deduction unit", () => {
    // 100 Maunds gross, 2 Maunds deduction
    // Net weight must be 98 Maunds (3,920 kg)
    const result = computeSale({
      grossWeight: 100,
      deductions: 2,
      deductionUnit: "maund",
      weightUnit: "maund",
      rate: 5000,
      rateUnit: "maund",
      transportCost: 0,
      labourCost: 0,
      commissionCost: 0,
      otherCosts: 0,
      totalArea: 0,
      areaUnit: "acre",
      totalYield: 0,
      yieldUnit: "maund",
      paidAmount: 0,
    });

    expect(result.netWeight).toBe(98);
    expect(result.netWeightKg).toBe(3920);
    expect(result.grossSale).toBe(490000);
  });

  it("handles Kg sale with Kg deductions correctly", () => {
    // 500 Kg gross, 25 Kg deduction
    // Net weight = 475 Kg
    const result = computeSale({
      grossWeight: 500,
      deductions: 25,
      deductionUnit: "kg",
      weightUnit: "kg",
      rate: 120,
      rateUnit: "kg",
      transportCost: 0,
      labourCost: 0,
      commissionCost: 0,
      otherCosts: 0,
      totalArea: 0,
      areaUnit: "acre",
      totalYield: 0,
      yieldUnit: "kg",
      paidAmount: 0,
    });

    expect(result.netWeight).toBe(475);
    expect(result.netWeightKg).toBe(475);
    expect(result.grossSale).toBe(57000);
  });

  it("handles Ton sale with default Kg deductions correctly", () => {
    // 2 Tons gross (2,000 kg), 100 kg deduction
    // Net weight = 1.9 Tons (1,900 kg)
    const result = computeSale({
      grossWeight: 2,
      deductions: 100,
      deductionUnit: "kg",
      weightUnit: "ton",
      rate: 80000,
      rateUnit: "ton",
      transportCost: 0,
      labourCost: 0,
      commissionCost: 0,
      otherCosts: 0,
      totalArea: 0,
      areaUnit: "acre",
      totalYield: 0,
      yieldUnit: "ton",
      paidAmount: 0,
    });

    expect(result.netWeight).toBe(1.9);
    expect(result.netWeightKg).toBe(1900);
    expect(result.grossSale).toBe(152000);
  });

  it("clamps net weight to 0 if deductions exceed gross weight", () => {
    const result = computeSale({
      grossWeight: 1, // 1 maund = 40 kg
      deductions: 50, // 50 kg > 40 kg
      deductionUnit: "kg",
      weightUnit: "maund",
      rate: 5000,
      rateUnit: "maund",
      transportCost: 0,
      labourCost: 0,
      commissionCost: 0,
      otherCosts: 0,
      totalArea: 0,
      areaUnit: "acre",
      totalYield: 0,
      yieldUnit: "maund",
      paidAmount: 0,
    });

    expect(result.netWeight).toBe(0);
    expect(result.netWeightKg).toBe(0);
    expect(result.grossSale).toBe(0);
  });
});
