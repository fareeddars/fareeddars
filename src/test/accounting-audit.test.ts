import { describe, it, expect } from "vitest";
import {
  computeSale,
  type SaleInput,
} from "../lib/ledger/calc";
import {
  computeTotals,
  groupByCrop,
  groupByBuyer,
  groupByMonth,
  summarizeFarmer,
  type LedgerRow,
} from "../lib/ledger/aggregate";

describe("Agri Ledger Accounting Audit & Verification", () => {
  // Test baseline audited dataset
  const currentSeasonId = "season-current-2026";
  const legacySeasonId = "season-legacy-2025";
  const shahidId = "farmer-shahid-1";

  // Audited current season sales: gross total = 1,426,000, costs = 11,500, paid = 207,000, outstanding = 1,207,500
  const currentSeasonSales: LedgerRow[] = [
    {
      id: "sale-shahid-1",
      farmer_id: shahidId,
      entry_type: "sale",
      season_id: currentSeasonId,
      crop_type: "Wheat",
      amount: 45000, // Gross: 9 maund * 5000
      gross_weight: 9,
      deductions: 0,
      net_weight: 9,
      weight_unit: "maund",
      rate: 5000,
      rate_unit: "maund",
      transport_cost: 1000,
      labour_cost: 0,
      commission_cost: 0,
      other_costs: 0,
      paid_amount: 3000,
      buyer: "Fareed",
      entry_date: "2026-05-10",
    },
    {
      id: "sale-2",
      farmer_id: "farmer-2",
      entry_type: "sale",
      season_id: currentSeasonId,
      crop_type: "wheat", // Lowercase test for normalization
      amount: 400000,
      gross_weight: 80,
      deductions: 0,
      net_weight: 80,
      weight_unit: "maund",
      rate: 5000,
      rate_unit: "maund",
      transport_cost: 3000,
      labour_cost: 1000,
      commission_cost: 0,
      other_costs: 0,
      paid_amount: 50000,
      buyer: "fareed", // Case-insensitive test
      entry_date: "2026-05-15",
    },
    {
      id: "sale-3",
      farmer_id: "farmer-3",
      entry_type: "sale",
      season_id: currentSeasonId,
      crop_type: "Cotton",
      amount: 981000,
      gross_weight: 150,
      deductions: 0,
      net_weight: 150,
      weight_unit: "maund",
      rate: 6540,
      rate_unit: "maund",
      transport_cost: 4500,
      labour_cost: 2000,
      commission_cost: 0,
      other_costs: 0,
      paid_amount: 154000,
      buyer: "Fareed Dars", // Distinct buyer from Fareed
      entry_date: "2026-06-20",
    },
  ];

  // Current season operating expenses = 127,000
  const currentSeasonExpenses: LedgerRow[] = [
    {
      id: "exp-1",
      farmer_id: shahidId,
      entry_type: "expense",
      season_id: currentSeasonId,
      crop_type: "Wheat",
      amount: 70000,
      category: "fertilizer",
      is_shared: true, // 50/50
      shared_amount: 35000,
      entry_date: "2026-05-02",
    },
    {
      id: "exp-2",
      farmer_id: "farmer-2",
      entry_type: "expense",
      season_id: currentSeasonId,
      crop_type: "Wheat",
      amount: 57000,
      category: "seeds",
      is_shared: false,
      entry_date: "2026-05-05",
    },
  ];

  // 4 legacy sales from previous season = 48,186 total
  const legacySales: LedgerRow[] = [
    { id: "leg-1", farmer_id: "farmer-old", entry_type: "sale", season_id: legacySeasonId, amount: 12000, entry_date: "2025-01-10" },
    { id: "leg-2", farmer_id: "farmer-old", entry_type: "sale", season_id: legacySeasonId, amount: 15000, entry_date: "2025-02-10" },
    { id: "leg-3", farmer_id: "farmer-old", entry_type: "sale", season_id: legacySeasonId, amount: 11186, entry_date: "2025-03-10" },
    { id: "leg-4", farmer_id: "farmer-old", entry_type: "sale", season_id: legacySeasonId, amount: 10000, entry_date: "2025-04-10" },
  ];

  describe("Audit Baseline & Centralized Accounting", () => {
    it("matches all audited financial figures for the current season", () => {
      const allCurrentEntries = [...currentSeasonSales, ...currentSeasonExpenses];
      const totals = computeTotals(allCurrentEntries);

      // Audit baselines:
      expect(totals.grossSales).toBe(1426000);
      expect(totals.saleCosts).toBe(11500);
      expect(totals.netSales).toBe(1414500);
      expect(totals.saleReceived).toBe(207000);
      expect(totals.saleOutstanding).toBe(1207500);
      expect(totals.expenses).toBe(127000);
      expect(totals.totalExpenses).toBe(138500);
      expect(totals.netProfit).toBe(1287500);
    });

    it("verifies legacy sales sum to 48,186 and are excluded by season filter", () => {
      const legacySum = legacySales.reduce((s, e) => s + Number(e.amount), 0);
      expect(legacySum).toBe(48186);

      const allEntries = [...currentSeasonSales, ...currentSeasonExpenses, ...legacySales];
      const filteredCurrent = allEntries.filter((e) => e.season_id === currentSeasonId);
      const totals = computeTotals(filteredCurrent);

      expect(totals.grossSales).toBe(1426000);
      expect(totals.netProfit).toBe(1287500);
    });

    it("verifies Shahid sale restoration values", () => {
      const saleInput: SaleInput = {
        grossWeight: 9,
        deductions: 0,
        weightUnit: "maund",
        rate: 5000,
        rateUnit: "maund",
        transportCost: 1000,
        labourCost: 0,
        commissionCost: 0,
        otherCosts: 0,
        totalArea: 0,
        areaUnit: "acre",
        totalYield: 0,
        yieldUnit: "maund",
        paidAmount: 3000,
      };
      const res = computeSale(saleInput);

      expect(res.grossSale).toBe(45000);
      expect(res.totalCosts).toBe(1000);
      expect(res.netSale).toBe(44000);
      expect(res.remaining).toBe(41000);
      expect(res.paymentStatus).toBe("partial");
    });
  });

  describe("Issue 1: Correct Cash Balance & Buyer Outstanding", () => {
    it("distinguishes cash received from gross sales and calculates true cash balance", () => {
      const entries = [...currentSeasonSales, ...currentSeasonExpenses];
      const totals = computeTotals(entries);

      // Does not treat gross sale (1,426,000) as cash received!
      // Real cash received is from actual recorded payments = 207,000.
      expect(totals.saleReceived).toBe(207000);
      expect(totals.saleOutstanding).toBe(1207500);

      // Cash flow: Cash received (207,000) - Cash disbursed (127,000 expenses + 11,500 sale costs)
      expect(totals.cashReceived).toBe(207000);
      expect(totals.cashDisbursed).toBe(138500);
      expect(totals.cashBalance).toBe(68500);
    });
  });

  describe("Issue 2: Crop Breakdown, Monthly, and Insights Reconciliation", () => {
    it("reconciles sum of crop profits with total P&L net profit (Rs 1,287,500)", () => {
      const entries = [...currentSeasonSales, ...currentSeasonExpenses];
      const cropList = groupByCrop(entries);

      const totalCropProfit = cropList.reduce((s, c) => s + c.profit, 0);
      expect(totalCropProfit).toBe(1287500);

      // Crops include sale-level costs (Rs 11,500)
      const totalCropCosts = cropList.reduce((s, c) => s + c.costs, 0);
      expect(totalCropCosts).toBe(11500);
    });

    it("reconciles sum of monthly profits with total P&L net profit (Rs 1,287,500)", () => {
      const entries = [...currentSeasonSales, ...currentSeasonExpenses];
      const monthList = groupByMonth(entries);

      const totalMonthlyProfit = monthList.reduce((s, m) => s + m.profit, 0);
      expect(totalMonthlyProfit).toBe(1287500);
    });
  });

  describe("Issue 4: Safe Case-Insensitive Normalization", () => {
    it("normalizes crop names case-insensitively without creating duplicate crops", () => {
      const entries = [...currentSeasonSales, ...currentSeasonExpenses];
      const cropList = groupByCrop(entries);

      // "Wheat" and "wheat" must group into a single "Wheat" row
      const wheatRows = cropList.filter((c) => c.crop.toLowerCase() === "wheat");
      expect(wheatRows.length).toBe(1);
      expect(wheatRows[0].grossSales).toBe(445000); // 45,000 + 400,000
    });

    it("normalizes buyer names case-insensitively and preserves distinct people", () => {
      const buyerList = groupByBuyer(currentSeasonSales);

      // "Fareed" and "fareed" group together
      const fareedGroup = buyerList.find((b) => b.buyer.toLowerCase() === "fareed");
      expect(fareedGroup).toBeDefined();
      expect(fareedGroup?.salesCount).toBe(2);
      expect(fareedGroup?.grossSales).toBe(445000);

      // "Fareed Dars" remains a separate buyer
      const fareedDarsGroup = buyerList.find((b) => b.buyer.toLowerCase() === "fareed dars");
      expect(fareedDarsGroup).toBeDefined();
      expect(fareedDarsGroup?.salesCount).toBe(1);
      expect(fareedDarsGroup?.grossSales).toBe(981000);

      expect(buyerList.length).toBe(2);
    });
  });

  describe("Issue 5: Dashboard Outstanding Balances", () => {
    it("handles negative farmer balances as farmer payables without hiding them", () => {
      const entries: LedgerRow[] = [
        ...currentSeasonSales,
        ...currentSeasonExpenses,
      ];
      // Shahid balanceDue of -597,250 indicates farm owes Shahid money
      const shahidSummary = summarizeFarmer(entries, shahidId, -645250);
      expect(shahidSummary.balanceDue).toBe(-597250);

      // Outstanding balance is negative (farm owes Shahid money)
      expect(shahidSummary.balanceDue < 0).toBe(true);
    });
  });
});
