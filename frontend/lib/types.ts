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

// ---------- Payment Configuration ----------
export type PaymentCategory =
  | "ORDER_INCENTIVE"
  | "WEEKLY_INCENTIVE"
  | "MANUAL_INCENTIVE"
  | "SPECIAL_INCENTIVE"
  | "RECOVERY"
  | "PENALTY";

export type CalculationMethod = "FIXED_AMOUNT" | "PERCENTAGE" | "FORMULA_BASED";
export type PaymentTypeStatus = "ACTIVE" | "INACTIVE" | "DELETED";

export interface PaymentType {
  id: string;
  name: string;
  category: PaymentCategory;
  calculationMethod: CalculationMethod;
  priority: number;
  status: PaymentTypeStatus;
  description: string | null;
  version: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentTypeHistoryEntry {
  id: string;
  paymentTypeId: string;
  version: number;
  changeSummary: string;
  changedBy: string;
  changedAt: string;
  snapshot: {
    name: string;
    category: PaymentCategory;
    calculationMethod: CalculationMethod;
    priority: number;
    status: PaymentTypeStatus;
    description: string | null;
    version: number;
  };
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
