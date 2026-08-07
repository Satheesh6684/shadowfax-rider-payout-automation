export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface Week {
  weekStartDate: string; // ISO date, always a Monday
  weekEndDate: string; // ISO date, always the following Sunday
  label: string; // e.g. "04 Aug – 10 Aug 2026"
  isCurrent: boolean;
}

// ---------- Rate Card Management ----------
export type RateCardStatus = "ACTIVE" | "LOCKED" | "DELETED";

export interface City {
  id: string;
  name: string;
}

export interface Store {
  id: string;
  storeCode: string;
  storeName: string;
  cityId: string;
  city: City;
}

export interface RateCard {
  id: string;
  weekStartDate: string;
  weekEndDate: string;
  storeId: string;
  store: Store;
  rcType: string;
  mgType: string;
  minimumOrders: number;
  maximumOrders: number;
  mgAmount: string; // Prisma Decimal serializes as a numeric string over JSON
  variablePay: string;
  weeklyIncentive: string | null;
  orderIncentive: string | null;
  status: RateCardStatus;
  version: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface RateCardHistoryEntry {
  id: string;
  rateCardId: string;
  version: number;
  changeSummary: string;
  changedBy: string;
  changedAt: string;
  snapshot: {
    rcType: string;
    mgType: string;
    minimumOrders: number;
    maximumOrders: number;
    mgAmount: string;
    variablePay: string;
    weeklyIncentive: string | null;
    orderIncentive: string | null;
    status: RateCardStatus;
    version: number;
  };
}

export interface AuditLogEntry {
  id: string;
  userId: string | null;
  module: string;
  action: string;
  oldValue: unknown;
  newValue: unknown;
  occurredAt: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface RateCardFormValues {
  cityName: string;
  storeName: string;
  storeCode: string;
  rcType: string;
  mgType: string;
  minimumOrders: number;
  maximumOrders: number;
  mgAmount: number;
  variablePay: number;
  weeklyIncentive?: number;
  orderIncentive?: number;
}
