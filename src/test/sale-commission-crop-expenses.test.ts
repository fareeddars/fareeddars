import { describe, it, expect } from "vitest";
import { computeSale, type SaleInput } from "../lib/ledger/calc";
import { computeTotals, deriveSale, type LedgerRow } from "../lib/ledger/aggregate";

describe("Agri Ledger: Commission Deduction & Separate Crop Expenses", () => {
  describe("1. Buyer Commission Deduction", () => {
    it("deducts buyer commission from gross sale amount to determine net buyer payable", () => {
      // Example from prompt:
      // Gross wheat sale: Rs 10,000
      // Commission: Rs 2,000
      // Net buyer payable: Rs 8,000
      const saleInput: SaleInput = {
        grossWeight: 2, // 2 maunds = 80 kg
        deductions: 0,
        weightUnit: "maund",
        rate: 5000, // 2 * 5,000 = 10,000 gross
        rateUnit: "maund",
        transportCost: 0,
        labourCost: 0,
        commissionCost: 2000,
        otherCosts: 0,
        totalArea: 0,
        areaUnit: "acre",
        totalYield: 0,
        yieldUnit: "maund",
        paidAmount: 8000,
      };

      const res = computeSale(saleInput);

      expect(res.grossSale).toBe(10000);
      expect(res.buyerPayable).toBe(8000); // 10,000 - 2,000
      expect(res.buyerRemaining).toBe(0); // If buyer pays 8,000, outstanding = 0
      expect(res.buyerPaymentStatus).toBe("paid");
    });

    it("calculates buyer outstanding as 3,000 when buyer pays 5,000 on an 8,000 payable sale", () => {
      // If the buyer pays only Rs 5,000, the outstanding must be Rs 3,000
      const saleInput: SaleInput = {
        grossWeight: 2,
        deductions: 0,
        weightUnit: "maund",
        rate: 5000,
        rateUnit: "maund",
        transportCost: 0,
        labourCost: 0,
        commissionCost: 2000,
        otherCosts: 0,
        totalArea: 0,
        areaUnit: "acre",
        totalYield: 0,
        yieldUnit: "maund",
        paidAmount: 5000,
      };

      const res = computeSale(saleInput);

      expect(res.grossSale).toBe(10000);
      expect(res.buyerPayable).toBe(8000);
      expect(res.buyerRemaining).toBe(3000); // 8,000 - 5,000 = 3,000
      expect(res.buyerPaymentStatus).toBe("partial");
    });

    it("does not deduct anything if commission is 0 or omitted", () => {
      const saleInput: SaleInput = {
        grossWeight: 2,
        deductions: 0,
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
      };

      const res = computeSale(saleInput);

      expect(res.grossSale).toBe(10000);
      expect(res.buyerPayable).toBe(10000);
      expect(res.buyerRemaining).toBe(10000);
      expect(res.buyerPaymentStatus).toBe("unpaid");
    });
  });

  describe("2. Separate Crop Expenses Do Not Reduce Buyer Payable", () => {
    it("keeps buyer payable at 8,000 even when 2,000 of crop expenses (Rent 1,000, Labour 500, Other 500) occur", () => {
      // Scenario from prompt:
      // Gross wheat sale: Rs 10,000
      // Buyer commission: Rs 2,000
      // Net buyer payable: Rs 8,000
      // Rent: Rs 1,000
      // Labour: Rs 500
      // Other crop expenses: Rs 500
      // Total separate crop expenses: Rs 2,000.
      // The Rs 2,000 in crop expenses must not reduce the buyer's Rs 8,000 payable.

      // Sale row with only commission deducted:
      const saleRow: LedgerRow = {
        id: "sale-101",
        farmer_id: "farmer-1",
        entry_type: "sale",
        season_id: "season-2026",
        crop_type: "Wheat",
        buyer: "Test Buyer",
        amount: 10000, // Gross sale amount
        commission_cost: 2000,
        transport_cost: 0,
        labour_cost: 0,
        other_costs: 0,
        paid_amount: 8000,
        entry_date: "2026-06-01",
      };

      // Separate crop expenses recorded in Expenses system:
      const rentExpense: LedgerRow = {
        id: "exp-rent-1",
        farmer_id: "farmer-1",
        entry_type: "expense",
        season_id: "season-2026",
        crop_type: "Wheat",
        category: "Tractor",
        amount: 1000,
        description: "Transport / Rent for Wheat sale",
        notes: "Linked Sale: sale-101",
        entry_date: "2026-06-01",
      };

      const labourExpense: LedgerRow = {
        id: "exp-labour-1",
        farmer_id: "farmer-1",
        entry_type: "expense",
        season_id: "season-2026",
        crop_type: "Wheat",
        category: "Labour",
        amount: 500,
        description: "Labour for Wheat sale",
        notes: "Linked Sale: sale-101",
        entry_date: "2026-06-01",
      };

      const otherExpense: LedgerRow = {
        id: "exp-other-1",
        farmer_id: "farmer-1",
        entry_type: "expense",
        season_id: "season-2026",
        crop_type: "Wheat",
        category: "Others",
        amount: 500,
        description: "Other crop expenses for Wheat sale",
        notes: "Linked Sale: sale-101",
        entry_date: "2026-06-01",
      };

      // Check deriveSale on the sale row:
      const s = deriveSale(saleRow);
      expect(s.grossSale).toBe(10000);
      expect(s.commission).toBe(2000);
      expect(s.buyerPayable).toBe(8000);
      expect(s.paid).toBe(8000);
      expect(s.remaining).toBe(0); // Buyer outstanding is 0

      // Compute aggregate totals across sale and separate expenses:
      const allEntries = [saleRow, rentExpense, labourExpense, otherExpense];
      const totals = computeTotals(allEntries);

      // Gross sales = 10,000
      expect(totals.grossSales).toBe(10000);
      // Sale cost is only commission = 2,000
      expect(totals.commissionCosts).toBe(2000);
      expect(totals.saleCosts).toBe(2000);
      // Net sales = 10,000 - 2,000 = 8,000
      expect(totals.netSales).toBe(8000);
      // Separate crop expenses = 1,000 + 500 + 500 = 2,000
      expect(totals.expenses).toBe(2000);
      // Total expenses = operating expenses (2,000) + commission (2,000) = 4,000
      expect(totals.totalExpenses).toBe(4000);
      // Net profit = Net sales (8,000) - Operating expenses (2,000) = 6,000
      expect(totals.netProfit).toBe(6000);
      // Buyer outstanding is 0
      expect(totals.saleOutstanding).toBe(0);
      expect(totals.saleReceived).toBe(8000);
    });
  });
});
