export type Period = 'current' | 'compare';

export interface Metrics {
  sessions: number;
  users: number;
  newUsers: number;
  engagedSessions: number;
  eventCount: number;
  keyEvents: number;
  pageViews: number;
  engagementSeconds: number;
}

export interface DailyRow extends Metrics { period: Period; date: string; channel: string; aiEngine: string | null }
export interface SourceRow extends Metrics { period: Period; channel: string; source: string; medium: string; aiEngine: string | null }
export interface LandingRow extends Metrics { period: Period; landingPage: string; channel: string; aiEngine: string | null }
export interface KeyEventRow { period: Period; eventName: string; channel: string; count: number }
export interface BlogRow extends Metrics { period: Period; pagePath: string; pageTitle: string; channel: string }
export interface DeviceRow extends Metrics { period: Period; device: string }
export interface TotalsRow extends Metrics { period: Period }

export interface GscMetrics { clicks: number; impressions: number; ctr: number; position: number }
export interface GscDaily extends GscMetrics { period: Period; date: string }
export interface GscQuery extends GscMetrics { period: Period; query: string }
export interface GscPage extends GscMetrics { period: Period; page: string }
export interface GscDevice extends GscMetrics { period: Period; device: string }
export interface GscCountry extends GscMetrics { period: Period; country: string }

export interface RangeInfo { start: string; end: string; label: string; days: number }

export interface ReportMeta {
  generatedAt: string;
  mode: 'demo' | 'live';
  modeReason: string;
  brand: { name: string; site: string };
  blogPrefix: string;
  aiChannel: string;
  periods: { preset: string; compare: string; current: RangeInfo; compareRange: RangeInfo };
  channels: string[];
  keyEventNames: string[];
}

export interface Report {
  meta: ReportMeta;
  ga4: {
    totals: TotalsRow[];
    daily: DailyRow[];
    sources: SourceRow[];
    landingPages: LandingRow[];
    keyEvents: KeyEventRow[];
    blog: BlogRow[];
    devices: DeviceRow[];
  };
  gsc: {
    totals: (GscMetrics & { period: Period })[];
    daily: GscDaily[];
    queries: GscQuery[];
    pages: GscPage[];
    devices: GscDevice[];
    countries: GscCountry[];
  };
}

export interface AppConfig {
  mode: 'demo' | 'live';
  modeReason: string;
  brand: { name: string; site: string };
  ga4PropertyId: string;
  gscSiteUrl: string;
  blogPrefix: string;
  keyEvents: string[];
  presets: Record<string, string>;
  compareModes: Record<string, string>;
  quickViews: Record<string, { label: string; preset: string; compare: string }>;
  aiEngines: string[];
  aiChannel: string;
}

export interface Pair { current: number; compare: number }
