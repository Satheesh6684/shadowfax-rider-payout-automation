export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  mustChangePassword?: boolean;
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

export interface WeeklyPayTypeConfig {
  variableRate?: number;
  bonusSlabs?: { minOrders: number; amount: number }[];
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
  // Calculation Engine fields — all optional, a rate card created before
  // these existed simply has null/empty values for them.
  minimumLoginHours: string | null;
  o1: number | null;
  o2: number | null;
  o3: number | null;
  o4: number | null;
  o5: number | null;
  o6: number | null;
  o7: number | null;
  mg1: string | null;
  mg2: string | null;
  mg3: string | null;
  mg4: string | null;
  mg5: string | null;
  mg6: string | null;
  mg7: string | null;
  var1: string | null;
  var2: string | null;
  var3: string | null;
  var4: string | null;
  var5: string | null;
  var6: string | null;
  var7: string | null;
  weeklyPayConfig: Record<string, WeeklyPayTypeConfig> | null;
}

export interface RecentHistoryEntry extends RateCardHistoryEntry {
  rateCard: {
    id: string;
    version: number;
    store: { storeCode: string; storeName: string };
  };
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

// ---------- Settings ----------
export interface AppSettings {
  id: string;
  organizationName: string;
  defaultCurrency: string;
  defaultRoundingPrecision: number;
  defaultRoundingMode: "HALF_UP" | "HALF_DOWN" | "CEILING" | "FLOOR";
  maxUploadSizeMb: number;
  allowedUploadFormats: string;
  blockCalculationOnValidationFailure: boolean;
  defaultReportFormat: "XLSX" | "CSV" | "PDF";
  notifyOnUploadSuccess: boolean;
  notifyOnUploadFailure: boolean;
  notifyOnValidationComplete: boolean;
  notifyOnCalculationComplete: boolean;
  notifyOnReportGenerated: boolean;
  updatedBy: string | null;
  updatedAt: string;
}

// ---------- Notifications ----------
export type AppNotificationType = "SUCCESS" | "ERROR" | "INFO";
export type AppNotificationCategory = "UPLOAD" | "VALIDATION" | "CALCULATION" | "REPORT";

export interface AppNotification {
  id: string;
  type: AppNotificationType;
  category: AppNotificationCategory;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  readAt: string | null;
}

// ---------- User Management / RBAC ----------
export type UserRole = "ADMIN" | "MANAGER" | "OPERATIONS" | "VIEWER";

export interface ManagedUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  mustChangePassword: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LoginHistoryEntry {
  id: string;
  userId: string | null;
  email: string;
  success: boolean;
  reason: string | null;
  occurredAt: string;
}

// ---------- Rider Search ----------
export interface RiderMasterInfo {
  id: string;
  riderId: string;
  riderName: string;
  createdAt: string;
  updatedAt: string;
}

export interface RiderProfile {
  rider: RiderMasterInfo;
  activeWeeks: string[];
}

export interface RiderWeekDetail {
  orders: {
    orderId: string;
    date: string;
    storeCode: string;
    status: string;
    awbNumber: string | null;
  }[];
  loginHours: {
    date: string;
    storeCode: string | null;
    loginHours: string;
  }[];
  calculationLogs: CalculationLog[];
}

// ---------- Report Generation ----------
export interface GeneratedReport {
  id: string;
  weekStartDate: string;
  reportType: string;
  format: string;
  fileName: string;
  fileSizeBytes: number;
  downloadCount: number;
  lastDownloadedAt: string | null;
  generatedBy: string;
  generatedAt: string;
}

// ---------- Exception Management ----------
export type ExceptionSource = "VALIDATION" | "CALCULATION";
export type ExceptionStatus = "OPEN" | "RESOLVED" | "IGNORED";

export interface ExceptionTicket {
  id: string;
  weekStartDate: string;
  source: ExceptionSource;
  category: string;
  checkName: string;
  severity: "ERROR" | "WARNING";
  riderId: string | null;
  message: string;
  context: Record<string, unknown> | null;
  status: ExceptionStatus;
  resolvedBy: string | null;
  resolvedAt: string | null;
  resolutionNotes: string | null;
  sourceRunId: string;
  occurrenceCount: number;
  firstSeenAt: string;
  lastSeenAt: string;
}

export interface ExceptionSummary {
  open: number;
  resolved: number;
  ignored: number;
  openBySource: Record<string, number>;
}

// ---------- Calculation Engine ----------
export type CalculationRunStatus = "COMPLETED" | "COMPLETED_WITH_EXCEPTIONS" | "FAILED";
export type RiderCalculationStatus = "PENDING" | "CALCULATED" | "EXCEPTION";
export type CalculationLogStatus = "CALCULATED" | "SKIPPED" | "EXCEPTION";

export interface CalculationRun {
  id: string;
  weekStartDate: string;
  status: CalculationRunStatus;
  totalRiders: number;
  totalCalculated: number;
  totalExceptions: number;
  runBy: string;
  runAt: string;
}

export interface RiderCalculationResult {
  id: string;
  weekStartDate: string;
  riderId: string;
  storeId: string | null;
  totalEligibleAmount: string | null;
  actualAmount: string | null;
  pendingAmount: string | null;
  status: RiderCalculationStatus;
  remarks: string | null;
  calculatedAt: string | null;
  createdAt: string;
}

export interface CalculationLog {
  id: string;
  calculationRunId: string;
  weekStartDate: string;
  riderId: string;
  strategyName: string;
  status: CalculationLogStatus;
  amount: string | null;
  message: string | null;
  createdAt: string;
}

// ---------- Validation Engine ----------
export type ValidationRunStatus = "PASSED" | "WARNING" | "FAILED";
export type ValidationSeverity = "ERROR" | "WARNING";
export type ValidationCategory = "ORDERS" | "LOGIN_HOURS" | "RATE_CARD" | "VALINOR";

export interface ValidationRun {
  id: string;
  weekStartDate: string;
  status: ValidationRunStatus;
  totalErrors: number;
  totalWarnings: number;
  runBy: string;
  runAt: string;
}

export interface ValidationIssue {
  id: string;
  validationRunId: string;
  weekStartDate: string;
  category: ValidationCategory;
  checkName: string;
  severity: ValidationSeverity;
  message: string;
  context: Record<string, unknown> | null;
  createdAt: string;
}

export interface ValidationSummary {
  run: ValidationRun | null;
  canRunCalculation: boolean;
}

// ---------- Upload Center ----------
export type UploadType = "ORDERS" | "LOGIN_HOURS" | "RATE_CARD" | "VALINOR";
export type UploadStatus = "PROCESSING" | "SUCCESS" | "FAILED" | "REPLACED" | "REMOVED";
export type UploadValidationStatus = "PENDING" | "PASSED" | "WARNING" | "FAILED";

export interface UploadBatch {
  id: string;
  uploadType: UploadType;
  fileName: string;
  weekStartDate: string;
  totalRecords: number;
  status: UploadStatus;
  validationStatus: UploadValidationStatus;
  errorMessage: string | null;
  uploadedBy: string;
  uploadedAt: string;
  replacesId: string | null;
}

export type UploadSummary = Record<UploadType, UploadBatch | null>;

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

export interface SlabRow {
  maxOrders: number | undefined;
  mgAmount: number | undefined;
  variableAmount: number | undefined;
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
  minimumLoginHours?: number;
  slabs?: SlabRow[]; // up to 7 rows; converted to o1-o7/mg1-mg7/var1-var7 on submit
  weeklyPayConfigJson?: string; // raw JSON text for the F+V-family config, parsed on submit
}
