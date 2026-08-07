import * as XLSX from "xlsx";
import { RateCard } from "@/lib/types";
import { formatWeekRange } from "@/lib/format";

function toExportRows(rateCards: RateCard[]) {
  return rateCards.map((rc) => ({
    Week: formatWeekRange(rc.weekStartDate, rc.weekEndDate),
    City: rc.store.city.name,
    Store: rc.store.storeName,
    "Store Code": rc.store.storeCode,
    "RC Type": rc.rcType,
    "MG Type": rc.mgType,
    "Min Orders": rc.minimumOrders,
    "Max Orders": rc.maximumOrders,
    "MG Amount": Number(rc.mgAmount),
    "Variable Amount": Number(rc.variablePay),
    "Weekly Incentive": rc.weeklyIncentive ? Number(rc.weeklyIncentive) : "",
    "Order Incentive": rc.orderIncentive ? Number(rc.orderIncentive) : "",
    Status: rc.status,
    Version: rc.version,
    "Created By": rc.createdBy,
  }));
}

function downloadWorkbook(rateCards: RateCard[], fileName: string, bookType: "csv" | "xlsx") {
  const worksheet = XLSX.utils.json_to_sheet(toExportRows(rateCards));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Rate Cards");
  XLSX.writeFile(workbook, fileName, { bookType });
}

export function exportRateCardsToCsv(rateCards: RateCard[], fileName = "rate-cards.csv") {
  downloadWorkbook(rateCards, fileName, "csv");
}

export function exportRateCardsToExcel(rateCards: RateCard[], fileName = "rate-cards.xlsx") {
  downloadWorkbook(rateCards, fileName, "xlsx");
}
