import { Sale, Expense, Customer, InventoryItem, PaymentMethod, InvoiceType } from '../types';
import { getGasWeightKg } from './utils';

export interface DayAggregation {
  dateStr: string; // YYYY-MM-DD
  formattedDate: string; // e.g. 13/08/2569
  deliveryLocations: string[];
  // Sales
  salesBillsCount: number;
  salesTanksCount: number;
  salesAccessoriesCount: number;
  totalItemsCount: number;
  salesTotalWeightKg: number;
  salesTotalAmount: number;
  grossProfit: number;
  // Refills
  refillBillsCount: number;
  refillTanksCount: number;
  refillSizesText: string;
  refillTotalAmount: number;
  // Other Expenses & Total Expenses
  otherExpensesAmount: number;
  totalExpensesAmount: number;
  // Profit / Net
  dailyNetProfit: number; // salesTotalAmount - totalExpensesAmount
  // Gas returns
  gasReturnKg: number;
  gasReturnValue: number;
}

export interface CustomerSalesSummary {
  customerId: string;
  customerName: string;
  branch: string;
  salesCount: number;
  tanksCount: number;
  accessoriesCount: number;
  totalWeightKg: number;
  totalAmount: number;
  grossProfit: number;
  gasReturnKg: number;
  cashAmount: number;
  transferAmount: number;
  creditAmount: number;
}

export interface ProductSalesSummary {
  key: string;
  name: string;
  brand?: string;
  size?: string;
  itemType: 'GAS' | 'ACCESSORY';
  quantity: number;
  weightKg: number;
  totalAmount: number;
  grossProfit: number;
  cashTransferQty: number;
  creditQty: number;
  taxInvoiceQty: number;
}

export interface ExpenseTypeSummary {
  type: string;
  count: number;
  totalAmount: number;
  cashAmount: number;
  creditAmount: number;
  totalGasQty: number;
}

export interface RefillPlantSummary {
  key: string;
  brand: string;
  size: string;
  quantity: number;
  weightKg: number;
  cashQty: number;
  creditQty: number;
  totalCost: number;
}

export interface TaxComparisonSummary {
  taxSales: {
    billsCount: number;
    tanksCount: number;
    weightKg: number;
    totalAmount: number;
  };
  creditRefill: {
    billsCount: number;
    tanksCount: number;
    weightKg: number;
    totalAmount: number;
  };
  difference: {
    billsCount: number;
    tanksCount: number;
    weightKg: number;
    totalAmount: number;
  };
  status: 'SAFE' | 'EQUAL' | 'WARNING';
  statusLabel: string;
}

export interface CalculatedReportData {
  startDate: string;
  endDate: string;
  // Grand Sums
  totalSalesAmount: number; // SUM(รายรับ)
  totalExpensesAmount: number; // SUM(รายจ่าย)
  netProfit: number; // SUM(กำไรสุทธิ) = totalSalesAmount - totalExpensesAmount
  grossProfit: number; // SUM(กำไรขั้นต้น)
  totalGasTanksSold: number; // SUM(จำนวนถังแก๊ส)
  totalAccessoriesSold: number; // SUM(จำนวนอุปกรณ์)
  totalItemsSold: number; // SUM(จำนวนสินค้าทั้งหมด)
  totalGasWeightKg: number; // SUM(กิโลกรัม)
  totalGasReturnKg: number; // SUM(กิโลกรัมคืน - ลูกค้า)
  totalGasReturnValue: number; // SUM(มูลค่าคืนแก๊ส - ลูกค้า)
  customerGasReturnKg: number;
  customerGasReturnValue: number;
  plantGasReturnKg: number;
  plantGasReturnValue: number;
  totalBorrowedTanks: number; // ถังยืมคงค้าง
  totalSalesBills: number; // SUM(บิลขาย)
  totalExpenseRecords: number; // SUM(รายการจ่าย)
  totalTransactions: number;
  // Payment methods
  cashIncome: number;
  transferIncome: number;
  creditIncome: number;
  // Refill Grand Sums
  totalRefillBills: number;
  totalRefillTanks: number;
  totalRefillWeightKg: number;
  totalRefillAmount: number;
  totalOtherExpenses: number;
  // Tax & Refill Comparison
  taxComparison: TaxComparisonSummary;
  // Breakdown lists
  dailyRows: DayAggregation[];
  customerSummaries: CustomerSalesSummary[];
  productSummaries: ProductSalesSummary[];
  expenseTypeSummaries: ExpenseTypeSummary[];
  refillSummaries: RefillPlantSummary[];
}

export const normalizeDate = (dStr: string | undefined): string => {
  if (!dStr) return '';
  return dStr.split('T')[0];
};

export const formatThaiDate = (dateStr: string): string => {
  if (!dateStr) return '';
  const parts = dateStr.split('T')[0].split('-');
  if (parts.length !== 3) return dateStr;
  const year = parseInt(parts[0], 10) + 543;
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);
  return `${day}/${month < 10 ? '0' + month : month}/${year}`;
};

/**
 * Single Source of Truth for calculating report metrics across
 * Dashboard, Reports page, and Monthly Report A4.
 */
export function calculateReportMetrics(
  sales: Sale[],
  expenses: Expense[],
  customers: Customer[],
  inventory: InventoryItem[],
  startDate: string,
  endDate: string
): CalculatedReportData {
  const normStart = normalizeDate(startDate);
  const normEnd = normalizeDate(endDate);

  // 1. Filter records by applied date range
  const filteredSales = (sales || []).filter(s => {
    const d = normalizeDate(s.date);
    return d >= normStart && d <= normEnd;
  });

  const filteredExpenses = (expenses || []).filter(e => {
    const d = normalizeDate(e.date);
    return d >= normStart && d <= normEnd;
  });

  // 2. Financial totals
  let totalSalesAmount = 0;
  let grossProfit = 0;
  let totalGasTanksSold = 0;
  let totalAccessoriesSold = 0;
  let totalGasWeightKg = 0;
  let totalGasReturnKgSales = 0;
  let totalGasReturnValueSales = 0;
  let cashIncome = 0;
  let transferIncome = 0;
  let creditIncome = 0;

  // Tax Invoice sales accumulation
  let taxInvoiceSalesAmount = 0;
  let taxInvoiceBillsCount = 0;
  let taxInvoiceTanks = 0;
  let taxInvoiceWeightKg = 0;

  // Track customer maps
  const custMap = new Map<string, CustomerSalesSummary>();
  // Track product maps
  const prodMap = new Map<string, ProductSalesSummary>();

  filteredSales.forEach(s => {
    const sAmount = s.total_amount || 0;
    totalSalesAmount += sAmount;

    // Payment methods
    if (s.payment_method === PaymentMethod.CASH) cashIncome += sAmount;
    else if (s.payment_method === PaymentMethod.TRANSFER) transferIncome += sAmount;
    else if (s.payment_method === PaymentMethod.CREDIT) creditIncome += sAmount;

    const isCredit = s.payment_method === PaymentMethod.CREDIT;
    const isTax = s.invoice_type === InvoiceType.TAX_INVOICE;

    if (isTax) {
      taxInvoiceBillsCount += 1;
      taxInvoiceSalesAmount += sAmount;
    }

    // Gas return
    const sReturnKg = s.gas_return_kg || 0;
    const sReturnPrice = s.gas_return_price || 0;
    const sReturnValue = sReturnKg * sReturnPrice;
    totalGasReturnKgSales += sReturnKg;
    totalGasReturnValueSales += sReturnValue;

    // Gross profit calculation per sale
    let saleProfit = 0;
    let saleTanks = 0;
    let saleAccessories = 0;
    let saleWeightKg = 0;

    if (s.items && Array.isArray(s.items) && s.items.length > 0) {
      s.items.forEach(item => {
        const qty = item.quantity || 0;
        const price = item.total_price || (qty * (item.unit_price || 0));
        const cost = item.cost_price || 0;
        const itemProfit = price - (cost * qty);
        saleProfit += itemProfit;

        if (item.item_type === 'ACCESSORY') {
          saleAccessories += qty;
          totalAccessoriesSold += qty;
          // Product summary
          const key = `ACC_${item.item_name || 'อุปกรณ์'}`;
          if (!prodMap.has(key)) {
            prodMap.set(key, {
              key,
              name: item.item_name || 'อุปกรณ์เสริม',
              itemType: 'ACCESSORY',
              quantity: 0,
              weightKg: 0,
              totalAmount: 0,
              grossProfit: 0,
              cashTransferQty: 0,
              creditQty: 0,
              taxInvoiceQty: 0,
            });
          }
          const p = prodMap.get(key)!;
          p.quantity += qty;
          p.totalAmount += price;
          p.grossProfit += itemProfit;
          if (isCredit) p.creditQty += qty;
          else p.cashTransferQty += qty;
          if (isTax) p.taxInvoiceQty += qty;
        } else {
          saleTanks += qty;
          totalGasTanksSold += qty;
          const w = qty * getGasWeightKg(item.size);
          saleWeightKg += w;
          totalGasWeightKg += w;

          if (isTax) {
            taxInvoiceTanks += qty;
            taxInvoiceWeightKg += w;
          }

          // Product summary
          const key = `GAS_${item.brand}_${item.size}`;
          if (!prodMap.has(key)) {
            prodMap.set(key, {
              key,
              name: `${item.brand} ${item.size}`,
              brand: item.brand,
              size: item.size,
              itemType: 'GAS',
              quantity: 0,
              weightKg: 0,
              totalAmount: 0,
              grossProfit: 0,
              cashTransferQty: 0,
              creditQty: 0,
              taxInvoiceQty: 0,
            });
          }
          const p = prodMap.get(key)!;
          p.quantity += qty;
          p.weightKg += w;
          p.totalAmount += price;
          p.grossProfit += itemProfit;
          if (isCredit) p.creditQty += qty;
          else p.cashTransferQty += qty;
          if (isTax) p.taxInvoiceQty += qty;
        }
      });
    } else {
      const qty = s.quantity || 0;
      const cost = s.cost_price || 0;
      saleProfit = sAmount - (cost * qty);
      saleTanks += qty;
      totalGasTanksSold += qty;
      const w = qty * getGasWeightKg(s.tank_size);
      saleWeightKg += w;
      totalGasWeightKg += w;

      if (isTax) {
        taxInvoiceTanks += qty;
        taxInvoiceWeightKg += w;
      }

      const key = `GAS_${s.tank_brand}_${s.tank_size}`;
      if (!prodMap.has(key)) {
        prodMap.set(key, {
          key,
          name: `${s.tank_brand} ${s.tank_size}`,
          brand: s.tank_brand,
          size: s.tank_size,
          itemType: 'GAS',
          quantity: 0,
          weightKg: 0,
          totalAmount: 0,
          grossProfit: 0,
          cashTransferQty: 0,
          creditQty: 0,
          taxInvoiceQty: 0,
        });
      }
      const p = prodMap.get(key)!;
      p.quantity += qty;
      p.weightKg += w;
      p.totalAmount += sAmount;
      p.grossProfit += saleProfit;
      if (isCredit) p.creditQty += qty;
      else p.cashTransferQty += qty;
      if (isTax) p.taxInvoiceQty += qty;
    }

    // Deduct return gas credit from sale profit
    if (sReturnValue > 0) {
      saleProfit -= sReturnValue;
    }
    grossProfit += saleProfit;

    // Customer aggregation
    const custId = s.customer_id || 'unknown';
    if (!custMap.has(custId)) {
      const foundCust = (customers || []).find(c => c.id === custId);
      custMap.set(custId, {
        customerId: custId,
        customerName: foundCust?.name || 'ลูกค้าทั่วไป / หน้าร้าน',
        branch: foundCust?.branch || '-',
        salesCount: 0,
        tanksCount: 0,
        accessoriesCount: 0,
        totalWeightKg: 0,
        totalAmount: 0,
        grossProfit: 0,
        gasReturnKg: 0,
        cashAmount: 0,
        transferAmount: 0,
        creditAmount: 0,
      });
    }
    const cStat = custMap.get(custId)!;
    cStat.salesCount += 1;
    cStat.tanksCount += saleTanks;
    cStat.accessoriesCount += saleAccessories;
    cStat.totalWeightKg += saleWeightKg;
    cStat.totalAmount += sAmount;
    cStat.grossProfit += saleProfit;
    cStat.gasReturnKg += sReturnKg;
    if (s.payment_method === PaymentMethod.CASH) cStat.cashAmount += sAmount;
    else if (s.payment_method === PaymentMethod.TRANSFER) cStat.transferAmount += sAmount;
    else if (s.payment_method === PaymentMethod.CREDIT) cStat.creditAmount += sAmount;
  });

  // 3. Expenses calculations
  let totalExpensesAmount = 0;
  let totalRefillBills = 0;
  let totalRefillTanks = 0;
  let totalRefillWeightKg = 0;
  let totalRefillAmount = 0;
  let totalOtherExpenses = 0;
  let totalGasReturnKgExpenses = 0;
  let totalGasReturnValueExpenses = 0;

  // Credit Refill Accumulation (for Tax comparison)
  let creditRefillAmount = 0;
  let creditRefillBillsCount = 0;
  let creditRefillTanks = 0;
  let creditRefillWeightKg = 0;

  const expTypeMap = new Map<string, ExpenseTypeSummary>();
  const refillMap = new Map<string, RefillPlantSummary>();

  filteredExpenses.forEach(e => {
    const eAmount = e.amount || 0;
    totalExpensesAmount += eAmount;

    const type = e.type || 'อื่นๆ';
    const isCredit = e.payment_method === PaymentMethod.CREDIT;

    if (!expTypeMap.has(type)) {
      expTypeMap.set(type, {
        type,
        count: 0,
        totalAmount: 0,
        cashAmount: 0,
        creditAmount: 0,
        totalGasQty: 0,
      });
    }
    const et = expTypeMap.get(type)!;
    et.count += 1;
    et.totalAmount += eAmount;
    if (isCredit) et.creditAmount += eAmount;
    else et.cashAmount += eAmount;

    // Check if refill expense
    const isRefill = e.type === 'ค่าบรรจุก๊าซ' || (e.refill_details && e.refill_details.length > 0);
    if (isRefill) {
      totalRefillBills += 1;
      totalRefillAmount += eAmount;

      if (isCredit) {
        creditRefillBillsCount += 1;
        creditRefillAmount += eAmount;
      }

      if (e.refill_details && Array.isArray(e.refill_details) && e.refill_details.length > 0) {
        e.refill_details.forEach(item => {
          const qty = item.quantity || 0;
          const w = qty * getGasWeightKg(item.size);
          totalRefillTanks += qty;
          totalRefillWeightKg += w;
          et.totalGasQty += qty;

          if (isCredit) {
            creditRefillTanks += qty;
            creditRefillWeightKg += w;
          }

          const key = `${item.brand} ${item.size}`;
          if (!refillMap.has(key)) {
            refillMap.set(key, {
              key,
              brand: item.brand,
              size: item.size,
              quantity: 0,
              weightKg: 0,
              cashQty: 0,
              creditQty: 0,
              totalCost: 0,
            });
          }
          const r = refillMap.get(key)!;
          r.quantity += qty;
          r.weightKg += w;
          if (isCredit) r.creditQty += qty;
          else r.cashQty += qty;
          r.totalCost += (item.unit_cost ? item.unit_cost * qty : 0);
        });
      } else {
        const qty = e.refill_quantity || 0;
        const brand = e.refill_tank_brand || 'PTT';
        const size = e.refill_tank_size || '15 กก.';
        const w = qty * getGasWeightKg(size);
        totalRefillTanks += qty;
        totalRefillWeightKg += w;
        et.totalGasQty += qty;

        if (isCredit) {
          creditRefillTanks += qty;
          creditRefillWeightKg += w;
        }

        const key = `${brand} ${size}`;
        if (!refillMap.has(key)) {
          refillMap.set(key, {
            key,
            brand: brand as any,
            size: size as any,
            quantity: 0,
            weightKg: 0,
            cashQty: 0,
            creditQty: 0,
            totalCost: 0,
          });
        }
        const r = refillMap.get(key)!;
        r.quantity += qty;
        r.weightKg += w;
        if (isCredit) r.creditQty += qty;
        else r.cashQty += qty;
      }
    } else {
      totalOtherExpenses += eAmount;
    }

    // Expense return gas
    if (e.gas_return_kg) totalGasReturnKgExpenses += e.gas_return_kg;
    if (e.gas_return_amount) totalGasReturnValueExpenses += e.gas_return_amount;
  });

  // Customer vs Plant gas returns
  const customerGasReturnKg = totalGasReturnKgSales;
  const customerGasReturnValue = totalGasReturnValueSales;
  const plantGasReturnKg = totalGasReturnKgExpenses;
  const plantGasReturnValue = totalGasReturnValueExpenses;
  const totalGasReturnKg = plantGasReturnKg;
  const totalGasReturnValue = plantGasReturnValue;

  // Build Tax Comparison Summary
  const diffBills = taxInvoiceBillsCount - creditRefillBillsCount;
  const diffTanks = taxInvoiceTanks - creditRefillTanks;
  const diffWeightKg = taxInvoiceWeightKg - creditRefillWeightKg;
  const diffAmount = taxInvoiceSalesAmount - creditRefillAmount;

  let taxStatus: 'SAFE' | 'EQUAL' | 'WARNING' = 'SAFE';
  let taxStatusLabel = 'ยอดขายใบกำกับภาษี ครอบคลุมยอดซื้อเติมแก๊สเครดิต (ปกติ)';

  if (taxInvoiceSalesAmount === 0 && creditRefillAmount === 0) {
    taxStatus = 'EQUAL';
    taxStatusLabel = 'ไม่มีรายการใบกำกับภาษีและเติมแก๊สเครดิตในช่วงนี้';
  } else if (Math.abs(diffAmount) < 0.01 && Math.abs(diffWeightKg) < 0.01) {
    taxStatus = 'EQUAL';
    taxStatusLabel = 'ยอดขายใบกำกับภาษี เท่ากับยอดซื้อเติมแก๊สเครดิตพอดี';
  } else if (taxInvoiceSalesAmount < creditRefillAmount || taxInvoiceWeightKg < creditRefillWeightKg) {
    taxStatus = 'WARNING';
    taxStatusLabel = 'ยอดซื้อเติมแก๊สเครดิต สูงกว่ายอดขายใบกำกับภาษี (ควรตรวจสอบ)';
  } else {
    taxStatus = 'SAFE';
    taxStatusLabel = 'ยอดขายใบกำกับภาษี ครอบคลุมยอดซื้อเติมแก๊สเครดิต (ปกติ)';
  }

  const taxComparison: TaxComparisonSummary = {
    taxSales: {
      billsCount: taxInvoiceBillsCount,
      tanksCount: taxInvoiceTanks,
      weightKg: taxInvoiceWeightKg,
      totalAmount: taxInvoiceSalesAmount,
    },
    creditRefill: {
      billsCount: creditRefillBillsCount,
      tanksCount: creditRefillTanks,
      weightKg: creditRefillWeightKg,
      totalAmount: creditRefillAmount,
    },
    difference: {
      billsCount: diffBills,
      tanksCount: diffTanks,
      weightKg: diffWeightKg,
      totalAmount: diffAmount,
    },
    status: taxStatus,
    statusLabel: taxStatusLabel,
  };

  // 4. Borrowed tanks on loan
  const totalBorrowedTanks = (inventory || []).reduce((sum, item) => sum + (item.on_loan || 0), 0) ||
    (customers || []).reduce((sum, c) => sum + (c.borrowed_tanks ? c.borrowed_tanks.reduce((bSum, b) => bSum + (b.quantity || 0), 0) : 0), 0);

  // 5. Daily Aggregation
  const dateSet = new Set<string>();
  filteredSales.forEach(s => dateSet.add(normalizeDate(s.date)));
  filteredExpenses.forEach(e => dateSet.add(normalizeDate(e.date)));

  const sortedDates = Array.from(dateSet).sort((a, b) => b.localeCompare(a));

  const dailyRows: DayAggregation[] = sortedDates.map(dateStr => {
    const daySales = filteredSales.filter(s => normalizeDate(s.date) === dateStr);
    const dayExpenses = filteredExpenses.filter(e => normalizeDate(e.date) === dateStr);

    const locationsSet = new Set<string>();
    let daySalesTanks = 0;
    let daySalesAccessories = 0;
    let daySalesWeightKg = 0;
    let daySalesTotal = 0;
    let dayGrossProfit = 0;
    let dayGasReturnKg = 0;
    let dayGasReturnValue = 0;

    daySales.forEach(s => {
      const cust = (customers || []).find(c => c.id === s.customer_id);
      const nameText = cust ? `${cust.name}${cust.branch ? ` (${cust.branch})` : ''}` : 'ลูกค้าทั่วไป';
      locationsSet.add(nameText);

      const sAmt = s.total_amount || 0;
      daySalesTotal += sAmt;

      const rVal = (s.gas_return_kg || 0) * (s.gas_return_price || 0);

      let saleProfit = 0;
      if (s.items && Array.isArray(s.items) && s.items.length > 0) {
        s.items.forEach(item => {
          const qty = item.quantity || 0;
          const price = item.total_price || (qty * (item.unit_price || 0));
          const cost = item.cost_price || 0;
          saleProfit += (price - (cost * qty));

          if (item.item_type === 'ACCESSORY') {
            daySalesAccessories += qty;
          } else {
            daySalesTanks += qty;
            daySalesWeightKg += (qty * getGasWeightKg(item.size));
          }
        });
      } else {
        const qty = s.quantity || 0;
        const cost = s.cost_price || 0;
        saleProfit = sAmt - (cost * qty);
        daySalesTanks += qty;
        daySalesWeightKg += (qty * getGasWeightKg(s.tank_size));
      }

      if (rVal > 0) {
        saleProfit -= rVal;
      }
      dayGrossProfit += saleProfit;
    });

    // Refill expenses for the day
    const dayRefillExpenses = dayExpenses.filter(e =>
      e.type === 'ค่าบรรจุก๊าซ' || (e.refill_details && e.refill_details.length > 0)
    );

    let dayRefillTanks = 0;
    let dayRefillTotal = 0;
    const sizeCountMap: { [key: string]: number } = {};

    dayRefillExpenses.forEach(e => {
      dayRefillTotal += (e.amount || 0);

      if (e.refill_details && Array.isArray(e.refill_details) && e.refill_details.length > 0) {
        e.refill_details.forEach(item => {
          const qty = item.quantity || 0;
          dayRefillTanks += qty;
          const sizeLabel = item.size || 'ไม่ระบุ';
          sizeCountMap[sizeLabel] = (sizeCountMap[sizeLabel] || 0) + qty;
        });
      } else if (e.refill_quantity) {
        const qty = e.refill_quantity;
        dayRefillTanks += qty;
        const sizeLabel = e.refill_tank_size || 'ไม่ระบุ';
        sizeCountMap[sizeLabel] = (sizeCountMap[sizeLabel] || 0) + qty;
      }
    });

    const refillSizesText = Object.entries(sizeCountMap)
      .map(([size, count]) => `${size}: ${count} ถัง`)
      .join(', ') || '-';

    const dayOtherExpensesList = dayExpenses.filter(e =>
      e.type !== 'ค่าบรรจุก๊าซ' && (!e.refill_details || e.refill_details.length === 0)
    );
    const dayOtherTotal = dayOtherExpensesList.reduce((sum, e) => sum + (e.amount || 0), 0);
    const dayAllExpensesTotal = dayRefillTotal + dayOtherTotal;

    // Sum gas return from plant refill expenses on this day
    dayExpenses.forEach(e => {
      if (e.gas_return_kg) {
        dayGasReturnKg += Number(e.gas_return_kg) || 0;
      }
      if (e.gas_return_amount) {
        dayGasReturnValue += Number(e.gas_return_amount) || 0;
      }
    });

    return {
      dateStr,
      formattedDate: formatThaiDate(dateStr),
      deliveryLocations: Array.from(locationsSet),
      salesBillsCount: daySales.length,
      salesTanksCount: daySalesTanks,
      salesAccessoriesCount: daySalesAccessories,
      totalItemsCount: daySalesTanks + daySalesAccessories,
      salesTotalWeightKg: daySalesWeightKg,
      salesTotalAmount: daySalesTotal,
      grossProfit: dayGrossProfit,
      refillBillsCount: dayRefillExpenses.length,
      refillTanksCount: dayRefillTanks,
      refillSizesText,
      refillTotalAmount: dayRefillTotal,
      otherExpensesAmount: dayOtherTotal,
      totalExpensesAmount: dayAllExpensesTotal,
      dailyNetProfit: daySalesTotal - dayAllExpensesTotal,
      gasReturnKg: dayGasReturnKg,
      gasReturnValue: dayGasReturnValue,
    };
  });

  const netProfit = totalSalesAmount - totalExpensesAmount;

  return {
    startDate: normStart,
    endDate: normEnd,
    totalSalesAmount,
    totalExpensesAmount,
    netProfit,
    grossProfit,
    totalGasTanksSold,
    totalAccessoriesSold,
    totalItemsSold: totalGasTanksSold + totalAccessoriesSold,
    totalGasWeightKg,
    totalGasReturnKg,
    totalGasReturnValue,
    totalBorrowedTanks,
    totalSalesBills: filteredSales.length,
    totalExpenseRecords: filteredExpenses.length,
    totalTransactions: filteredSales.length + filteredExpenses.length,
    cashIncome,
    transferIncome,
    creditIncome,
    totalRefillBills,
    totalRefillTanks,
    totalRefillWeightKg,
    totalRefillAmount,
    customerGasReturnKg,
    customerGasReturnValue,
    plantGasReturnKg,
    plantGasReturnValue,
    totalOtherExpenses,
    taxComparison,
    dailyRows,
    customerSummaries: Array.from(custMap.values()).sort((a, b) => b.totalAmount - a.totalAmount),
    productSummaries: Array.from(prodMap.values()).sort((a, b) => b.quantity - a.quantity),
    expenseTypeSummaries: Array.from(expTypeMap.values()).sort((a, b) => b.totalAmount - a.totalAmount),
    refillSummaries: Array.from(refillMap.values()).sort((a, b) => b.quantity - a.quantity),
  };
}
