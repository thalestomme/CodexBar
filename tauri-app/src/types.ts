export interface ProviderPayload {
  provider: string;
  account: string | null;
  version: string | null;
  source: string;
  status: ProviderStatusPayload | null;
  usage: UsageSnapshot | null;
  credits: CreditsSnapshot | null;
  error: ProviderErrorPayload | null;
}

export interface ProviderStatusPayload {
  indicator: string;
  description: string | null;
  updatedAt: string | null;
  url: string;
}

export interface UsageSnapshot {
  primary: RateWindow | null;
  secondary: RateWindow | null;
  tertiary: RateWindow | null;
  providerCost: ProviderCostSnapshot | null;
  updatedAt: string | null;
  accountEmail: string | null;
  accountOrganization: string | null;
  loginMethod: string | null;
}

export interface RateWindow {
  usedPercent: number;
  windowMinutes: number | null;
  resetsAt: string | null;
  resetDescription: string | null;
}

export interface ProviderCostSnapshot {
  used: number;
  limit: number;
  currencyCode: string;
  period: string | null;
  resetsAt: string | null;
  updatedAt: string | null;
}

export interface CreditsSnapshot {
  remaining: number;
  events: CreditEvent[];
  updatedAt: string | null;
}

export interface CreditEvent {
  id: string;
  date: string;
  service: string;
  creditsUsed: number;
}

export interface ProviderErrorPayload {
  code: number;
  message: string;
  kind: string | null;
}
