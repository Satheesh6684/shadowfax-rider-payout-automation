export type ValidationCategory = "ORDERS" | "LOGIN_HOURS" | "RATE_CARD" | "VALINOR";
export type ValidationSeverity = "ERROR" | "WARNING";

export interface RawIssue {
  category: ValidationCategory;
  checkName: string;
  severity: ValidationSeverity;
  message: string;
  context?: Record<string, unknown>;
}

export function issue(
  category: ValidationCategory,
  checkName: string,
  severity: ValidationSeverity,
  message: string,
  context?: Record<string, unknown>
): RawIssue {
  return { category, checkName, severity, message, context };
}

// Mirrors of the Prisma row shapes, declared explicitly so check functions
// type-check independently of whether `prisma generate` has run in this
// environment. Structurally compatible with the real generated types.
export interface OrderRow {
  orderId: string;
  awbNumber: string | null;
  riderId: string;
  storeId: string | null;
  storeCode: string;
  date: Date;
  status: string;
}

export interface LoginHoursRow {
  riderId: string;
  riderName: string | null;
  storeId: string | null;
  storeCode: string | null;
  date: Date;
  loginHours: unknown; // Prisma Decimal
}

export interface PaymentRow {
  riderId: string;
  paymentType: string;
  amount: unknown; // Prisma Decimal
  considered: string | null;
  date: Date;
}

export interface StagedRateCardRow {
  storeCode: string;
  storeName: string;
  city: string;
  rcType: string;
  mgType: string;
  minimumOrders: number;
  maximumOrders: number;
  mgAmount: unknown; // Prisma Decimal
  variablePay: unknown;
  weeklyIncentive: unknown;
  orderIncentive: unknown;
}
