import { describe, it, expect } from "vitest";
import { computeSale, type SaleInput } from "../lib/ledger/calc";
import {
  computeTotals,
  deriveSale,
  groupByBuyer,
  summarizeFarmer,
  type LedgerRow,
} from "../lib/ledger/aggregate";

describe("Agricultural Account Statement PDF & Ledger Reconciliation", () => {
  const seasonId = "season-cotton-2026";
  const shahidId = "farmer-shahid";

  // Regression scenario from prompt:
  // Crop season: Cotton, Farmer: Shahid, Buyer: Afazal
  // Quantity: 100 Maund, Rate: Rs. 10,000/Maund, Commission: Rs. 500
  // Buyer receipts: Rs. 900,000
  // Expenses: 111,000 (Fertilizer 100k, Labour 1k, Fertilizer 8k, Tractor 2k)

  const cottonSaleRow: LedgerRow = {
    id: "sale-cotton-001",
    farmer_id: shahidId,
    season_id: seasonId,
    entry_type: "sale",
    crop_type: "Cotton",
    buyer: "Afazal",
    gross_weight: 100,
    deductions: 0,
    net_weight: 100,
    weight_unit: "maund",
    rate: 10000,
    rate_unit: "maund",
    commission_cost: 500,
    transport_cost: 0,
    labour_cost: 0,
    other_costs: 0,
    // Even if amount was stored as commission-adjusted in legacy DB records (999,500):
    amount: 999500,
    paid_amount: 900000, // Rs. 900,000 received
    entry_date: "2026-10-19",
  };

  const expenseRows: LedgerRow[] = [
    {
      id: "exp-1",
      farmer_id: shahidId,
      season_id: seasonId,
      entry_type: "expense",
      category: "fertilizer",
      amount: 100000,
      is_shared: true,
      shared_amount: 50000,
      description: "Fertilizer DAP",
      entry_date: "2026-10-01",
    },
    {
      id: "exp-2",
      farmer_id: shahidId,
      season_id: seasonId,
      entry_type: "expense",
      category: "labour",
      amount: 1000,
      is_shared: true,
      shared_amount: 500,
      description: "Labour picking",
      entry_date: "2026-10-05",
    },
    {
      id: "exp-3",
      farmer_id: shahidId,
      season_id: seasonId,
      entry_type: "expense",
      category: "fertilizer",
      amount: 8000,
      is_shared: true,
      shared_amount: 4000,
      description: "Fertilizer Urea",
      entry_date: "2026-10-10",
    },
    {
      id: "exp-4",
      farmer_id: shahidId,
      season_id: seasonId,
      entry_type: "expense",
      category: "tractor",
      amount: 2000,
      is_shared: true,
      shared_amount: 1000,
      description: "Tractor / Transport",
      entry_date: "2026-10-15",
    },
  ];

  it("1. Verifies authoritative sale calculation from quantity, rate, commission, and paid receipts", () => {
    const saleInput: SaleInput = {
      grossWeight: 100,
      deductions: 0,
      weightUnit: "maund",
      rate: 10000,
      rateUnit: "maund",
      transportCost: 0,
      labourCost: 0,
      commissionCost: 500,
      otherCosts: 0,
      totalArea: 0,
      areaUnit: "acre",
      totalYield: 0,
      yieldUnit: "maund",
      paidAmount: 900000,
    };

    const res = computeSale(saleInput);

    // Quantity * Rate = 100 * 10,000 = Rs. 1,000,000 Gross Sale
    expect(res.grossSale).toBe(1000000);
    // Commission is Rs. 500
    expect(res.totalCosts).toBe(500);
    // Net Buyer Payable = 1,000,000 - 500 = Rs. 999,500
    expect(res.buyerPayable).toBe(999500);
    // Net Sale for farm = Rs. 999,500
    expect(res.netSale).toBe(999500);
    // Buyer Outstanding = 999,500 - 900,000 = Rs. 99,500
    expect(res.buyerRemaining).toBe(99500);
    expect(res.buyerPaymentStatus).toBe("partial");
  });

  it("2. Verifies deriveSale derives Rs. 1,000,000 Gross Sale and does not deduct commission twice", () => {
    const s = deriveSale(cottonSaleRow);

    expect(s.grossSale).toBe(1000000);
    expect(s.commission).toBe(500);
    expect(s.costs).toBe(500);
    expect(s.netSale).toBe(999500);
    expect(s.buyerPayable).toBe(999500);
    expect(s.paid).toBe(900000);
    expect(s.buyerRemaining).toBe(99500);
    expect(s.remaining).toBe(99500);
    expect(s.paymentStatus).toBe("partial");
  });

  it("3. Verifies computeTotals and groupByBuyer report identical paid and outstanding balances", () => {
    const entries = [cottonSaleRow, ...expenseRows];
    const totals = computeTotals(entries);

    // Sales totals:
    expect(totals.grossSales).toBe(1000000);
    expect(totals.saleCosts).toBe(500);
    expect(totals.netSales).toBe(999500);
    expect(totals.saleReceived).toBe(900000);
    expect(totals.saleOutstanding).toBe(99500);

    // Buyer aggregation:
    const buyers = groupByBuyer(entries);
    const afazal = buyers.find((b) => b.buyer.toLowerCase() === "afazal");
    expect(afazal).toBeDefined();
    expect(afazal?.grossSales).toBe(1000000);
    expect(afazal?.costs).toBe(500);
    expect(afazal?.netSales).toBe(999500);
    expect(afazal?.paid).toBe(900000);
    expect(afazal?.outstanding).toBe(99500);
  });

  it("4. Verifies multiple buyer receipts allocate seamlessly without double counting", () => {
    // Sale with 0 initial paid
    const saleUnpaid: LedgerRow = {
      ...cottonSaleRow,
      paid_amount: 0,
    };

    // First receipt: Rs 500,000
    const receipt1: LedgerRow = {
      id: "rec-1",
      farmer_id: shahidId,
      season_id: seasonId,
      entry_type: "payment",
      category: "buyer_payment",
      buyer: "Afazal",
      amount: 500000,
      notes: "[buyer_receipt] [sale:sale-cotton-001] First partial payment",
      entry_date: "2026-10-20",
    };

    // Second receipt: Rs 400,000
    const receipt2: LedgerRow = {
      id: "rec-2",
      farmer_id: shahidId,
      season_id: seasonId,
      entry_type: "payment",
      category: "buyer_payment",
      buyer: "Afazal",
      amount: 400000,
      notes: "[buyer_receipt] [sale:sale-cotton-001] Second partial payment",
      entry_date: "2026-10-21",
    };

    const entries = [saleUnpaid, receipt1, receipt2, ...expenseRows];
    const totals = computeTotals(entries);

    expect(totals.grossSales).toBe(1000000);
    expect(totals.saleCosts).toBe(500);
    expect(totals.netSales).toBe(999500);
    expect(totals.saleReceived).toBe(900000);
    expect(totals.saleOutstanding).toBe(99500);

    // Settle the remaining 99,500
    const finalReceipt: LedgerRow = {
      id: "rec-3",
      farmer_id: shahidId,
      season_id: seasonId,
      entry_type: "payment",
      category: "buyer_payment",
      buyer: "Afazal",
      amount: 99500,
      notes: "[buyer_receipt] [sale:sale-cotton-001] Final settlement",
      entry_date: "2026-10-22",
    };

    const settledTotals = computeTotals([...entries, finalReceipt]);
    expect(settledTotals.saleReceived).toBe(999500);
    expect(settledTotals.saleOutstanding).toBe(0);
  });

  it("5. Reconciles Expenses (111,000), Net Profit (888,500), 50/50 Shares (444,250), and Final Settlement", () => {
    const entries = [cottonSaleRow, ...expenseRows];
    const totals = computeTotals(entries);

    // Expense check:
    expect(totals.expenses).toBe(111000); // 100,000 + 1,000 + 8,000 + 2,000
    // Net profit = Net Sales (999,500) - Operating expenses (111,000) = 888,500
    expect(totals.netProfit).toBe(888500);

    // Farmer summary (Shahid):
    const summary = summarizeFarmer(entries, shahidId, 0);

    // 50% farmer share of expenses = 55,500
    expect(summary.farmerExpenses).toBe(55500);
    // 50% farmer share of net profit = 888,500 / 2 = 444,250
    expect(summary.farmerProfitShare).toBe(444250);
    // Landlord profit share = 444,250
    const landlordProfitShare = summary.netProfit - summary.farmerProfitShare;
    expect(landlordProfitShare).toBe(444250);

    // Final balance calculation:
    // Opening (0) + FarmerExpenses (55,500) + Loans (0) - ProfitShare (444,250) - Payments (0)
    // = -388,750
    expect(summary.balanceDue).toBe(-388750);
    // Negative balanceDue means the farm/landlord owes Shahid Rs. 388,750
    // Labeled as "Receivable from Landlord" (زمیندار سے وصول کرنا ہے) in the statement
    expect(summary.balanceDue < 0).toBe(true);
  });
});
