/**
 * AI assistant / LLM referral classification.
 * GA4 only recently started grouping some of this traffic as "AI Assistant"; the rest shows up as plain
 * referrals. We classify on source host so the report catches both.
 */
export const AI_ENGINES = [
  { name: 'ChatGPT', hosts: ['chatgpt.com', 'chat.openai.com', 'openai.com'] },
  { name: 'Perplexity', hosts: ['perplexity.ai', 'perplexity'] },
  { name: 'Claude', hosts: ['claude.ai', 'anthropic.com'] },
  { name: 'Gemini', hosts: ['gemini.google.com', 'bard.google.com', 'aistudio.google.com'] },
  { name: 'Copilot', hosts: ['copilot.microsoft.com', 'bing.com/chat', 'copilot'] },
  { name: 'Grok', hosts: ['grok.com', 'x.ai'] },
  { name: 'Meta AI', hosts: ['meta.ai'] },
  { name: 'DeepSeek', hosts: ['deepseek.com', 'chat.deepseek.com'] },
  { name: 'Mistral', hosts: ['chat.mistral.ai', 'mistral.ai'] },
  { name: 'You.com', hosts: ['you.com'] },
  { name: 'Phind', hosts: ['phind.com'] },
  { name: 'Poe', hosts: ['poe.com'] },
  { name: 'Brave Leo', hosts: ['search.brave.com/leo'] },
  { name: 'Komo', hosts: ['komo.ai'] },
  { name: 'Andi', hosts: ['andisearch.com'] },
];

export const AI_CHANNEL = 'AI Assistant';

/** Returns the engine name when a GA4 source/medium pair is AI-assistant traffic, else null. */
export function classifyAi(source = '', medium = '', channelGroup = '') {
  const src = String(source).toLowerCase();
  const med = String(medium).toLowerCase();
  for (const engine of AI_ENGINES) {
    if (engine.hosts.some((h) => src === h || src.endsWith(`.${h}`) || src.includes(h))) return engine.name;
  }
  if (channelGroup === AI_CHANNEL || med === 'ai-assistant' || med === 'ai' || med === 'llm') {
    // Known channel but unfamiliar host - keep it, named after the host.
    return src && src !== '(direct)' && src !== '(not set)' ? titleCase(src.split('.')[0]) : 'Other AI';
  }
  return null;
}

const titleCase = (s) => s.replace(/(^|[-_ ])(\w)/g, (_, sep, c) => `${sep ? ' ' : ''}${c.toUpperCase()}`).trim();
