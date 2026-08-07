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

// Module-specific types (Store, RateCard, PaymentConfiguration, ...) are
// added in the phase that implements each module, alongside the API calls
// that use them.
