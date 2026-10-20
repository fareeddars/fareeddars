import { describe, it, expect } from "vitest";
import {
  computeTotals,
  deriveSale,
  groupByBuyer,
  summarizeFarmer,
  isBuyerPayment,
  getLinkedSaleId,
  type LedgerRow,
} from "../lib/ledger/aggregate";

describe("Agri Ledger: Buyer Payment Received Feature", () => {
  const seasonId = "season-2026";
  const farmerId = "farmer-1";

  // Sale: Gross 10,000, Commission 2,000 => Net Buyer Payable 8,000.
  // Initial payment at sale time: Rs 3,000 => Initial Outstanding = Rs 5,000.
  const sampleSale: LedgerRow = {
    id: "sale-wheat-001",
    farmer_id: farmerId,
    season_id: seasonId,
    entry_type: "sale",
    crop_type: "Wheat",
    buyer: "Tariq Traders",
    amount: 10000,
    commission_cost: 2000,
    transport_cost: 0,
    labour_cost: 0,
    other_costs: 0,
    paid_amount: 3000,
    entry_date: "2026-06-01",
  };

  it("identifies buyer payment entries accurately via helper", () => {
    const farmerPayment: LedgerRow = {
      id: "pay-1",
      farmer_id: farmerId,
      season_id: seasonId,
      entry_type: "payment",
      amount: 4000,
      payment_method: "cash",
      description: "Farmer payment",
    };

    const buyerReceipt: LedgerRow = {
      id: "rec-1",
      farmer_id: farmerId,
      season_id: seasonId,
      entry_type: "payment",
      category: "buyer_payment",
      buyer: "Tariq Traders",
      amount: 2000,
      notes: "[buyer_receipt] [sale:sale-wheat-001] Partial receipt",
      description: "Buyer Payment Received - Tariq Traders",
    };

    expect(isBuyerPayment(farmerPayment)).toBe(false);
    expect(isBuyerPayment(buyerReceipt)).toBe(true);
    expect(getLinkedSaleId(buyerReceipt)).toBe("sale-wheat-001");
  });

  it("reduces the selected sale's outstanding balance when partial buyer payment is received", () => {
    // Initial state:
    const initialTotals = computeTotals([sampleSale]);
    expect(initialTotals.grossSales).toBe(10000);
    expect(initialTotals.saleCosts).toBe(2000);
    expect(initialTotals.netSales).toBe(8000);
    expect(initialTotals.saleReceived).toBe(3000);
    expect(initialTotals.saleOutstanding).toBe(5000); // 8,000 - 3,000

    // Record partial receipt of Rs 2,000 against sale-wheat-001:
    const receipt1: LedgerRow = {
      id: "rec-wheat-1",
      farmer_id: farmerId,
      season_id: seasonId,
      entry_type: "payment",
      category: "buyer_payment",
      buyer: "Tariq Traders",
      amount: 2000,
      notes: "[buyer_receipt] [sale:sale-wheat-001]",
      entry_date: "2026-06-05",
    };

    const updatedTotals = computeTotals([sampleSale, receipt1]);

    // Gross and net sales MUST NOT change:
    expect(updatedTotals.grossSales).toBe(10000);
    expect(updatedTotals.netSales).toBe(8000);
    expect(updatedTotals.saleCosts).toBe(2000);
    // Sale received increases by 2,000:
    expect(updatedTotals.saleReceived).toBe(5000); // 3,000 + 2,000
    // Outstanding reduces to 3,000:
    expect(updatedTotals.saleOutstanding).toBe(3000); // 8,000 - 5,000
  });

  it("settles outstanding to 0 when remaining balance is fully received", () => {
    // Receipt 1 of Rs 2,000
    const receipt1: LedgerRow = {
      id: "rec-wheat-1",
      farmer_id: farmerId,
      season_id: seasonId,
      entry_type: "payment",
      category: "buyer_payment",
      buyer: "Tariq Traders",
      amount: 2000,
      notes: "[buyer_receipt] [sale:sale-wheat-001]",
      entry_date: "2026-06-05",
    };

    // Receipt 2 of Rs 3,000 (settles the final 3,000)
    const receipt2: LedgerRow = {
      id: "rec-wheat-2",
      farmer_id: farmerId,
      season_id: seasonId,
      entry_type: "payment",
      category: "buyer_payment",
      buyer: "Tariq Traders",
      amount: 3000,
      notes: "[buyer_receipt] [sale:sale-wheat-001]",
      entry_date: "2026-06-10",
    };

    const totals = computeTotals([sampleSale, receipt1, receipt2]);

    expect(totals.saleReceived).toBe(8000); // Full 8,000 received
    expect(totals.saleOutstanding).toBe(0); // Zero outstanding
  });

  it("increases cash balance exactly once and preserves farmer settlement/isolation", () => {
    // Farmer expense of Rs 4,000 (shared 50/50 => farmer share 2,000)
    const expense: LedgerRow = {
      id: "exp-1",
      farmer_id: farmerId,
      season_id: seasonId,
      entry_type: "expense",
      amount: 4000,
      is_shared: true,
      shared_amount: 2000,
      entry_date: "2026-06-02",
    };

    // Farmer payment of Rs 1,500
    const farmerPayment: LedgerRow = {
      id: "fpay-1",
      farmer_id: farmerId,
      season_id: seasonId,
      entry_type: "payment",
      amount: 1500,
      payment_method: "cash",
      entry_date: "2026-06-03",
    };

    // Baseline before buyer receipt:
    const baseline = [sampleSale, expense, farmerPayment];
    const baseTotals = computeTotals(baseline);
    const baseFarmer = summarizeFarmer(baseline, farmerId, 0);

    // Now buyer pays Rs 2,500:
    const buyerReceipt: LedgerRow = {
      id: "brec-1",
      farmer_id: farmerId,
      season_id: seasonId,
      entry_type: "payment",
      category: "buyer_payment",
      buyer: "Tariq Traders",
      amount: 2500,
      notes: "[buyer_receipt] [sale:sale-wheat-001]",
      entry_date: "2026-06-06",
    };

    const withReceipt = [...baseline, buyerReceipt];
    const newTotals = computeTotals(withReceipt);
    const newFarmer = summarizeFarmer(withReceipt, farmerId, 0);

    // 1. Cash balance increases by exactly 2,500:
    expect(newTotals.cashBalance).toBe(baseTotals.cashBalance + 2500);
    expect(newTotals.cashReceived).toBe(baseTotals.cashReceived + 2500);

    // 2. Farmer's payments MUST NOT include the buyer receipt:
    expect(newTotals.payments).toBe(baseTotals.payments); // Still 1,500
    expect(newTotals.farmerPaymentsCash).toBe(baseTotals.farmerPaymentsCash); // Still 1,500

    // 3. Farmer profit share and balance due are strictly unaffected:
    expect(newFarmer.farmerProfitShare).toBe(baseFarmer.farmerProfitShare);
    expect(newFarmer.farmerExpenses).toBe(baseFarmer.farmerExpenses);
    expect(newFarmer.balanceDue).toBe(baseFarmer.balanceDue);
  });

  it("updates buyer balances in groupByBuyer accurately", () => {
    const saleA: LedgerRow = {
      id: "sale-a",
      farmer_id: farmerId,
      season_id: seasonId,
      entry_type: "sale",
      buyer: "Mill Alpha",
      amount: 50000,
      commission_cost: 1000, // Payable = 49,000
      paid_amount: 10000, // Due = 39,000
    };

    const receiptA: LedgerRow = {
      id: "rec-a",
      farmer_id: farmerId,
      season_id: seasonId,
      entry_type: "payment",
      category: "buyer_payment",
      buyer: "Mill Alpha",
      amount: 15000,
      notes: "[buyer_receipt] [sale:sale-a]",
    };

    const buyers = groupByBuyer([saleA, receiptA]);
    const mill = buyers.find((b) => b.buyer === "Mill Alpha");

    expect(mill).toBeDefined();
    expect(mill?.grossSales).toBe(50000);
    expect(mill?.netSales).toBe(49000);
    expect(mill?.paid).toBe(25000); // 10,000 + 15,000
    expect(mill?.outstanding).toBe(24000); // 49,000 - 25,000
  });
});
