/**
 * Deterministic demo data shaped like the live GA4 / GSC payloads.
 * Every number is derived from a seeded PRNG keyed on the date / dimension so the same window always
 * renders the same report and different windows stay consistent with each other.
 */
import { eachDay, fromISO } from '../periods.js';
import { rollup } from '../connectors/ga4.js';
import { config } from '../config.js';

const hash = (str) => {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};
const rand = (seed) => {
  let a = hash(seed);
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
const noise = (seed, spread = 0.2) => 1 + (rand(seed)() * 2 - 1) * spread;

const EPOCH = fromISO('2025-01-01');
const yearsSince = (date) => (fromISO(date) - EPOCH) / (365.25 * 86_400_000);

/* ------------------------------------------------------------------ channels & sources */
const CHANNELS = [
  { name: 'Direct', base: 68, growth: 0.18, weekend: 0.45, sources: [['(direct)', '(none)', 1]] },
  { name: 'Organic Search', base: 74, growth: 0.34, weekend: 0.4, sources: [['google', 'organic', 0.87], ['bing', 'organic', 0.09], ['duckduckgo', 'organic', 0.025], ['yahoo', 'organic', 0.015]] },
  { name: 'Referral', base: 22, growth: 0.1, weekend: 0.5, sources: [['g2.com', 'referral', 0.22], ['capterra.com', 'referral', 0.14], ['complianceweek.com', 'referral', 0.12], ['consumerfinancemonitor.com', 'referral', 0.1], ['insidearm.com', 'referral', 0.09], ['americanbanker.com', 'referral', 0.08], ['aba.com', 'referral', 0.07], ['fintechnexus.com', 'referral', 0.06], ['substack.com', 'referral', 0.05], ['lendit.com', 'referral', 0.04], ['hubspot.com', 'referral', 0.03]] },
  { name: 'Organic Social', base: 9, growth: 0.15, weekend: 0.35, sources: [['linkedin.com', 'social', 0.7], ['t.co', 'social', 0.12], ['youtube.com', 'social', 0.1], ['l.facebook.com', 'social', 0.05], ['instagram.com', 'social', 0.03]] },
  { name: 'Paid Search', base: 11, growth: 0.05, weekend: 0.3, sources: [['google', 'cpc', 0.9], ['bing', 'cpc', 0.1]] },
  { name: 'Email', base: 7, growth: 0.12, weekend: 0.15, sources: [['hubspot', 'email', 0.75], ['newsletter', 'email', 0.25]] },
  { name: 'Paid Social', base: 5, growth: -0.05, weekend: 0.3, sources: [['linkedin', 'paid-social', 0.85], ['facebook', 'paid-social', 0.15]] },
  { name: 'Cross-network', base: 2.5, growth: 0.3, weekend: 0.5, sources: [['google', 'cpc', 1]] },
  { name: 'Paid Other', base: 1.2, growth: 0, weekend: 0.5, sources: [['6sense', 'display', 1]] },
  { name: 'Unassigned', base: 14, growth: 0.08, weekend: 0.6, sources: [['(not set)', '(not set)', 1]] },
  { name: 'AI Assistant', base: 2.2, growth: 2.4, weekend: 0.55, sources: [['chatgpt.com', 'referral', 0.56], ['perplexity.ai', 'referral', 0.19], ['gemini.google.com', 'referral', 0.08], ['claude.ai', 'referral', 0.08], ['copilot.microsoft.com', 'referral', 0.06], ['chat.deepseek.com', 'referral', 0.03]] },
];
const AI_ENGINE_BY_SOURCE = { 'chatgpt.com': 'ChatGPT', 'perplexity.ai': 'Perplexity', 'gemini.google.com': 'Gemini', 'claude.ai': 'Claude', 'copilot.microsoft.com': 'Copilot', 'chat.deepseek.com': 'DeepSeek' };

/* ------------------------------------------------------------------ pages */
const PAGES = [
  ['/', 0.2, { Direct: 1.6, 'Paid Search': 1.4 }],
  ['/platform', 0.07, { 'Organic Search': 1.2 }],
  ['/platform/web-monitoring', 0.045, {}],
  ['/platform/call-monitoring', 0.04, {}],
  ['/platform/message-monitoring', 0.03, {}],
  ['/platform/email-monitoring', 0.025, {}],
  ['/platform/document-review', 0.02, {}],
  ['/industries/financial-services', 0.035, {}],
  ['/industries/fintech', 0.03, {}],
  ['/industries/insurance', 0.02, {}],
  ['/industries/partner-marketing', 0.02, {}],
  ['/demo', 0.04, { 'Paid Search': 2.5, Email: 1.5 }],
  ['/pricing', 0.03, { 'Paid Search': 1.8 }],
  ['/resources', 0.06, { Email: 1.6 }],
  ['/resources/webinars', 0.025, { Email: 2 }],
  ['/resources/case-studies', 0.025, {}],
  ['/resources/guides/udaap-compliance-checklist', 0.03, { 'Organic Search': 1.5, 'AI Assistant': 2.2 }],
  ['/community', 0.03, { Direct: 1.4 }],
  ['/company/about', 0.02, {}],
  ['/company/career-opportunities', 0.015, { 'Organic Social': 2 }],
  ['/company/privacy-policy', 0.012, {}],
  ['/contact', 0.012, {}],
  ['/login-page-promotion-7489jwiys28f', 0.04, { Direct: 3 }],
  ['(not set)', 0.05, { Unassigned: 6, Direct: 0.2 }],
];

const BLOG_POSTS = [
  ['regulatory-roundup', 'Regulatory Roundup: This Month in Marketing Compliance', 0.09, '2024-03-01'],
  ['around-the-company/podcast', 'COMPLY Podcast: Conversations on Compliance', 0.06, '2024-05-01'],
  ['udaap-compliance-guide', 'The Complete Guide to UDAAP Compliance for Marketers', 0.08, '2024-02-10'],
  ['cfpb-marketing-rules-2026', 'What the CFPB Expects From Your Marketing in 2026', 0.07, '2026-01-14'],
  ['ai-compliance-monitoring', 'How AI Is Changing Marketing Compliance Monitoring', 0.075, '2025-09-02'],
  ['tcpa-compliance-checklist', 'TCPA Compliance Checklist for Sales and Marketing Teams', 0.055, '2024-11-04'],
  ['fair-lending-marketing', 'Fair Lending and Marketing: What Compliance Teams Should Watch', 0.045, '2025-03-18'],
  ['fintech-marketing-compliance', 'Fintech Marketing Compliance: 7 Common Pitfalls', 0.05, '2025-06-09'],
  ['partner-marketing-risk', 'Managing Partner and Affiliate Marketing Risk at Scale', 0.04, '2025-01-21'],
  ['call-monitoring-best-practices', 'Call Monitoring Best Practices for Compliance Teams', 0.045, '2024-08-13'],
  ['debt-collection-compliance', 'Debt Collection Communication Compliance: A Practical Guide', 0.04, '2024-10-01'],
  ['sms-marketing-compliance', 'SMS Marketing Compliance: Consent, Content and Monitoring', 0.038, '2025-04-22'],
  ['email-marketing-compliance', 'Email Marketing Compliance Across Regulated Industries', 0.03, '2025-02-11'],
  ['social-media-compliance-financial-services', 'Social Media Compliance for Financial Services Brands', 0.042, '2025-07-15'],
  ['influencer-marketing-compliance', 'Influencer Marketing Compliance: Disclosures That Hold Up', 0.035, '2025-08-05'],
  ['comply-summit-recap', 'COMPLY Summit Recap: Top Takeaways for Compliance Leaders', 0.03, '2025-10-07'],
  ['state-privacy-law-tracker', 'State Privacy Law Tracker for Marketers', 0.045, '2025-05-13'],
  ['insurance-marketing-compliance', 'Insurance Marketing Compliance: Rules Across 50 States', 0.03, '2025-06-24'],
  ['mortgage-advertising-rules', 'Mortgage Advertising Rules Every Lender Should Know', 0.028, '2024-12-03'],
  ['credit-card-marketing-compliance', 'Credit Card Marketing Compliance: Reg Z Essentials', 0.027, '2025-03-04'],
  ['bnpl-marketing-regulation', 'BNPL Marketing Regulation: What Changed This Year', 0.033, '2025-09-23'],
  ['compliance-automation-roi', 'Measuring the ROI of Compliance Automation', 0.03, '2025-10-21'],
  ['chatbot-compliance', 'Are Your Chatbots Compliant? A Monitoring Framework', 0.036, '2026-02-03'],
  ['generative-ai-marketing-risk', 'Generative AI in Marketing: Compliance Risks and Controls', 0.05, '2026-03-10'],
  ['ftc-click-to-cancel', 'FTC Click-to-Cancel: What Subscription Marketers Must Do', 0.04, '2025-11-18'],
  ['ucc-compliance-explained', 'UCC Compliance Explained for Marketing Teams', 0.025, '2024-09-17'],
  ['ai-search-visibility-compliance', 'Your Brand in AI Search: Visibility, Accuracy and Compliance', 0.045, '2026-06-02'],
  ['q3-regulatory-outlook', 'Q3 Regulatory Outlook for Marketing and Sales', 0.032, '2026-07-07'],
  ['contact-center-compliance-trends', 'Contact Center Compliance Trends to Watch', 0.03, '2026-08-19'],
  ['marketing-compliance-maturity-model', 'The Marketing Compliance Maturity Model', 0.042, '2026-09-09'],
  ['holiday-promotions-compliance', 'Holiday Promotions: A Compliance Pre-Flight Checklist', 0.038, '2026-10-13'],
  ['cfpb-enforcement-trends-2026', 'CFPB Enforcement Trends: What 2026 Told Us', 0.036, '2026-10-28'],
];
const BLOG_CHANNEL_MIX = { 'Organic Search': 0.52, Direct: 0.12, 'AI Assistant': 0.09, 'Organic Social': 0.1, Email: 0.08, Referral: 0.06, Unassigned: 0.02, 'Paid Social': 0.01 };

const KEY_EVENT_RATES = { click: 0.085, form_start: 0.031, file_download: 0.021, form_submit: 0.012, 'demo-submission': 0.0045, purchase: 0 };
const KEY_EVENT_CHANNEL_BOOST = { 'Paid Search': 1.8, Direct: 1.3, Email: 1.6, 'AI Assistant': 1.9, 'Organic Search': 1.1, Unassigned: 0.3, 'Organic Social': 0.6 };

const MONTH_BUMP = (date) => {
  const m = fromISO(date).getUTCMonth();
  return [0.95, 1.0, 1.08, 1.02, 1.0, 0.96, 0.9, 0.97, 1.1, 1.12, 1.04, 0.85][m];
};

/* ------------------------------------------------------------------ builders */
function dailySessions(date, channel) {
  const d = fromISO(date);
  const dow = d.getUTCDay();
  const weekend = dow === 0 || dow === 6 ? channel.weekend : 1;
  const trend = Math.pow(1 + channel.growth, yearsSince(date));
  const monthly = noise(`${channel.name}|${date.slice(0, 7)}`, 0.16); // campaign / seasonality swings per channel per month
  return channel.base * 2.1 * weekend * trend * monthly * MONTH_BUMP(date) * noise(`${channel.name}|${date}`, 0.22);
}

function derive(sessions, seed, channelName) {
  const r = rand(seed);
  const engaged = channelName === 'Unassigned' ? 0.25 : channelName === 'Paid Social' ? 0.4 : 0.58;
  const kr = Object.entries(KEY_EVENT_RATES).reduce((acc, [, v]) => acc + v, 0) * (KEY_EVENT_CHANNEL_BOOST[channelName] || 1);
  return {
    sessions: Math.round(sessions),
    users: Math.round(sessions * (0.74 + r() * 0.1)),
    newUsers: Math.round(sessions * (0.55 + r() * 0.15)),
    engagedSessions: Math.round(sessions * (engaged + r() * 0.1)),
    eventCount: Math.round(sessions * (3.6 + r() * 1.4)),
    keyEvents: Math.round(sessions * kr * (0.8 + r() * 0.4)),
    pageViews: Math.round(sessions * (1.7 + r() * 0.6)),
    engagementSeconds: Math.round(sessions * (48 + r() * 30)),
  };
}

const periodOf = (date, periods) => (date >= periods.current.start && date <= periods.current.end ? 'current' : 'compare');

export function demoGa4(periods) {
  const daily = [];
  const sources = [];
  const windows = [periods.current, periods.compareRange];
  for (const w of windows) {
    for (const date of eachDay(w.start, w.end)) {
      const period = periodOf(date, periods);
      for (const ch of CHANNELS) {
        const total = dailySessions(date, ch);
        for (const [source, medium, share] of ch.sources) {
          const s = total * share * noise(`${ch.name}|${source}|${date}`, 0.15);
          if (s < 0.5) continue;
          const row = derive(s, `${ch.name}|${source}|${date}|m`, ch.name);
          daily.push({ period, date, channel: ch.name, aiEngine: AI_ENGINE_BY_SOURCE[source] || null, ...row });
          sources.push({ period, channel: ch.name, source, medium, aiEngine: AI_ENGINE_BY_SOURCE[source] || null, ...row });
        }
      }
    }
  }
  const dailyRolled = rollup(daily, ['period', 'date', 'channel', 'aiEngine']);
  const sourcesRolled = rollup(sources, ['period', 'channel', 'source', 'medium', 'aiEngine']);
  const channelTotals = rollup(daily, ['period', 'channel']);
  const totals = rollup(daily, ['period']).map((t) => ({ ...t, users: Math.round(t.users * 0.8), newUsers: Math.round(t.newUsers * 0.86) }));

  // Landing pages: distribute each channel's sessions across pages (+ blog posts).
  const landingPages = [];
  const blog = [];
  for (const ct of channelTotals) {
    const seedBase = `${ct.period}|${ct.channel}|${periods[ct.period === 'current' ? 'current' : 'compareRange'].start}`;
    const window = periods[ct.period === 'current' ? 'current' : 'compareRange'];
    const blogShare = (BLOG_CHANNEL_MIX[ct.channel] || 0.03) * 0.9;
    const pageWeights = PAGES.map(([path, w, aff]) => [path, w * (aff[ct.channel] ?? 1) * noise(`${seedBase}|${path}`, 0.35)]);
    const pageSum = pageWeights.reduce((a, [, w]) => a + w, 0);
    for (const [path, w] of pageWeights) {
      const s = ct.sessions * (1 - blogShare) * (w / pageSum);
      if (s < 1) continue;
      landingPages.push({ period: ct.period, landingPage: path, channel: ct.channel, aiEngine: null, ...derive(s, `${seedBase}|${path}|m`, ct.channel) });
    }
    const livePosts = BLOG_POSTS.filter(([, , , published]) => published <= window.end);
    const postWeights = livePosts.map(([slug, title, w, published]) => {
      const ageDays = (fromISO(window.end) - fromISO(published)) / 86_400_000;
      const freshness = ageDays < 45 ? 2.6 : ageDays < 120 ? 1.5 : 1;
      const partial = published > window.start ? Math.min(1, (fromISO(window.end) - fromISO(published)) / (fromISO(window.end) - fromISO(window.start))) : 1;
      return [slug, title, w * freshness * partial * noise(`${seedBase}|${slug}`, 0.3)];
    });
    const postSum = postWeights.reduce((a, [, , w]) => a + w, 0) || 1;
    for (const [slug, title, w] of postWeights) {
      const s = ct.sessions * blogShare * (w / postSum);
      if (s < 1) continue;
      const row = derive(s, `${seedBase}|${slug}|m`, ct.channel);
      const path = `${config.blogPrefix}/${slug}`;
      landingPages.push({ period: ct.period, landingPage: path, channel: ct.channel, aiEngine: null, ...row });
      blog.push({ period: ct.period, pagePath: path, pageTitle: `${title} | PerformLine`, channel: ct.channel, ...row, pageViews: Math.round(row.pageViews * 1.25), sessions: Math.round(row.sessions * 1.15) });
    }
  }

  // Key events per event name per channel.
  const keyEvents = [];
  for (const ct of channelTotals) {
    const boost = KEY_EVENT_CHANNEL_BOOST[ct.channel] || 1;
    for (const [eventName, rate] of Object.entries(KEY_EVENT_RATES)) {
      const seedBase = `${ct.period}|${ct.channel}|${eventName}|${periods[ct.period === 'current' ? 'current' : 'compareRange'].start}`;
      const count = Math.round(ct.sessions * rate * boost * noise(seedBase, 0.3));
      if (count > 0 || eventName === 'purchase') keyEvents.push({ period: ct.period, eventName, channel: ct.channel, count });
    }
  }

  const devices = totals.flatMap((t) =>
    [['desktop', 0.71], ['mobile', 0.26], ['tablet', 0.03]].map(([device, share]) => ({ period: t.period, device, ...derive(t.sessions * share * noise(`${t.period}|${device}`, 0.05), `${t.period}|${device}|m`, 'Direct') })),
  );

  return { totals, daily: dailyRolled, sources: sourcesRolled, landingPages, keyEvents, blog, devices };
}

/* ------------------------------------------------------------------ Search Console */
const QUERIES = [
  ['performline', 0.14, 1.2], ['perform line', 0.02, 1.4], ['performline reviews', 0.012, 2.1], ['performline pricing', 0.01, 1.8], ['performline login', 0.03, 1.1], ['performline comply', 0.006, 2.4],
  ['marketing compliance software', 0.05, 4.8], ['marketing compliance', 0.045, 7.2], ['udaap compliance', 0.04, 6.5], ['udaap compliance checklist', 0.03, 3.9], ['compliance monitoring software', 0.03, 8.1],
  ['call monitoring compliance', 0.028, 5.6], ['tcpa compliance checklist', 0.026, 6.8], ['regulatory compliance marketing', 0.02, 9.4], ['fintech marketing compliance', 0.022, 4.2], ['partner marketing compliance', 0.012, 3.3],
  ['debt collection compliance', 0.025, 12.1], ['fair lending marketing', 0.012, 7.7], ['ai compliance monitoring', 0.02, 5.1], ['sms marketing compliance', 0.018, 9.8], ['email marketing compliance', 0.015, 11.2],
  ['social media compliance financial services', 0.014, 6.1], ['influencer marketing disclosures', 0.012, 14.5], ['cfpb marketing rules', 0.02, 8.8], ['ucc compliance', 0.016, 10.4], ['state privacy law tracker', 0.013, 9.1],
  ['mortgage advertising rules', 0.011, 12.6], ['reg z advertising', 0.01, 13.3], ['bnpl regulation', 0.012, 15.2], ['click to cancel rule', 0.016, 11.8], ['chatbot compliance', 0.009, 7.9], ['generative ai compliance', 0.014, 9.6],
  ['compliance automation', 0.012, 16.4], ['comply summit', 0.008, 2.2], ['marketing compliance maturity model', 0.004, 4.1], ['contact center compliance', 0.011, 13.9], ['insurance marketing compliance', 0.009, 8.3], ['website compliance monitoring', 0.012, 6.9],
  ['ad compliance software', 0.01, 5.4], ['affiliate compliance monitoring', 0.008, 4.7], ['compliance monitoring tools', 0.013, 10.2], ['brand compliance monitoring', 0.009, 9.3], ['sales call monitoring', 0.011, 17.8], ['marketing risk management', 0.008, 18.5],
];

export function demoGsc(periods) {
  const windows = [['current', periods.current], ['compare', periods.compareRange]];
  const daily = [];
  for (const [period, w] of windows) {
    for (const date of eachDay(w.start, w.end)) {
      const d = fromISO(date);
      const dow = d.getUTCDay();
      const weekend = dow === 0 || dow === 6 ? 0.45 : 1;
      const trend = Math.pow(1.22, yearsSince(date));
      const impressions = Math.round(6400 * weekend * trend * MONTH_BUMP(date) * noise(`gsc|imp|${date.slice(0, 7)}`, 0.1) * noise(`gsc|imp|${date}`, 0.18));
      const ctr = 0.021 * noise(`gsc|ctr|${date}`, 0.2) * Math.pow(0.95, yearsSince(date)); // slow CTR erosion from AI Overviews
      const clicks = Math.round(impressions * ctr);
      const position = 17.5 * Math.pow(0.9, yearsSince(date)) * noise(`gsc|pos|${date}`, 0.08);
      daily.push({ period, date, clicks, impressions, ctr: clicks / impressions, position });
    }
  }
  const sum = (rows, k) => rows.reduce((a, r) => a + r[k], 0);
  const totals = windows.map(([period]) => {
    const rows = daily.filter((r) => r.period === period);
    const clicks = sum(rows, 'clicks');
    const impressions = sum(rows, 'impressions');
    return { period, clicks, impressions, ctr: clicks / impressions, position: rows.reduce((a, r) => a + r.position * r.impressions, 0) / impressions };
  });

  const queries = [];
  const pages = [];
  for (const [period, w] of windows) {
    const t = totals.find((x) => x.period === period);
    // Queries: weights give the mix, then everything is scaled so query rows reconcile with the totals
    // (real GSC query rows sum to a little less than the totals because of anonymised queries).
    const raw = QUERIES.map(([q, share, pos]) => {
      const seed = `gsc|${period}|${w.start}|${q}`;
      const impressions = t.impressions * share * noise(`gsc|q|${q}`, 0.3) * noise(seed, 0.12);
      const position = Math.max(1, pos * noise(`gsc|q|${q}|pos`, 0.15) * noise(`${seed}|pos`, 0.06) * Math.pow(0.92, yearsSince(w.end)));
      const ctr = Math.min(0.6, 0.35 * Math.exp(-0.28 * (position - 1)) * noise(`gsc|q|${q}|ctr`, 0.25) * noise(`${seed}|ctr`, 0.08));
      return { q, impressions, clicks: impressions * ctr, position };
    });
    const impScale = (t.impressions * 0.62) / raw.reduce((a, r) => a + r.impressions, 0);
    const clickScale = (t.clicks * 0.9) / raw.reduce((a, r) => a + r.clicks, 0);
    for (const r of raw) {
      const impressions = Math.round(r.impressions * impScale);
      const clicks = Math.min(impressions, Math.round(r.clicks * clickScale));
      if (impressions < 1) continue;
      queries.push({ period, query: r.q, clicks, impressions, ctr: impressions ? clicks / impressions : 0, position: r.position });
    }
    // Pages: site pages + live blog posts, scaled so page rows reconcile with the totals.
    const candidates = [
      ...PAGES.filter(([p]) => p !== '(not set)' && !p.startsWith('/login')).map(([p, wgt]) => [p, p === '/' ? wgt * 3.2 : wgt]),
      ...BLOG_POSTS.filter(([, , , pub]) => pub <= w.end).map(([slug, , wgt]) => [`${config.blogPrefix}/${slug}`, wgt * 1.6]),
    ];
    const rawPages = candidates.map(([path, wgt]) => {
      const seed = `gsc|${period}|${w.start}|page|${path}`;
      const impressions = t.impressions * wgt * noise(`gsc|p|${path}`, 0.35) * noise(seed, 0.12);
      const position = Math.max(1.5, (path === '/' ? 4 : 14) * noise(`gsc|p|${path}|pos`, 0.4) * noise(`${seed}|pos`, 0.08));
      const ctr = Math.min(0.5, 0.3 * Math.exp(-0.25 * (position - 1)) * noise(`gsc|p|${path}|ctr`, 0.3) * noise(`${seed}|ctr`, 0.1));
      return { path, impressions, clicks: impressions * ctr, position };
    });
    const pImpScale = (t.impressions * 0.97) / rawPages.reduce((a, r) => a + r.impressions, 0);
    const pClickScale = (t.clicks * 0.97) / rawPages.reduce((a, r) => a + r.clicks, 0);
    for (const r of rawPages) {
      const impressions = Math.round(r.impressions * pImpScale);
      const clicks = Math.min(impressions, Math.round(r.clicks * pClickScale));
      if (impressions < 1) continue;
      pages.push({ period, page: `${config.brand.site}${r.path === '/' ? '/' : r.path}`, clicks, impressions, ctr: impressions ? clicks / impressions : 0, position: r.position });
    }
  }
  const devices = totals.flatMap((t) => [['DESKTOP', 0.7], ['MOBILE', 0.27], ['TABLET', 0.03]].map(([device, share]) => ({ period: t.period, device, clicks: Math.round(t.clicks * share), impressions: Math.round(t.impressions * share), ctr: t.ctr, position: t.position * (device === 'MOBILE' ? 1.15 : 0.95) })));
  const countries = totals.flatMap((t) => [['usa', 0.78], ['can', 0.07], ['gbr', 0.05], ['ind', 0.04], ['aus', 0.02], ['deu', 0.01]].map(([country, share]) => ({ period: t.period, country, clicks: Math.round(t.clicks * share), impressions: Math.round(t.impressions * share), ctr: t.ctr, position: t.position })));
  return { totals, daily, queries, pages, devices, countries };
}
