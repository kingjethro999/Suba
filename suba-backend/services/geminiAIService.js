// suba-backend/services/geminiAIService.js
import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = process.env.GEMINI_API_KEY;
const MODEL_NAME = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

const VALID_TYPES = new Set(['cost_saving_tip', 'overlap_detected', 'alert', 'suggestion']);

let model = null;
if (API_KEY) {
  try {
    const genAI = new GoogleGenerativeAI(API_KEY);
    model = genAI.getGenerativeModel({ model: MODEL_NAME });
  } catch (e) {
    console.error('Gemini init error:', e?.message || e);
  }
}

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const formatCurrency = (n, currency = 'NGN') => {
  const val = Number(n || 0).toFixed(2);
  return currency === 'NGN' ? `₦${val}` : `$${val}`;
};

function buildPrompt(features) {
  return `
You are a subscription optimization assistant. Generate concise, actionable insights based on the data below.

Return ONLY a JSON array (no prose). Each item must match:
{ "type": "cost_saving_tip|overlap_detected|alert|suggestion", "message": string, "affected_services": string[], "confidence_score": 0.0-1.0 }

Guidelines:
- Be concrete: mention service names, categories, due windows, savings or alternatives.
- Prefer Nigeria-friendly ideas if currency is NGN (DSTV/GOtv/MTN/Quickteller/USSD references OK).
- 3–7 total insights. Avoid duplicates.

Data:
${JSON.stringify(features, null, 2)}
`.trim();
}

function extractJsonArray(text) {
  if (!text) return [];
  let cleaned = text.replace(/```json|```/gi, '').trim();

  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) return parsed;
    if (parsed && Array.isArray(parsed.insights)) return parsed.insights;
  } catch {}

  const arrMatch = cleaned.match(/\[[\s\S]*\]/);
  if (arrMatch) {
    try {
      const parsed = JSON.parse(arrMatch[0]);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
  }

  const objMatch = cleaned.match(/\{[\s\S]*\}/);
  if (objMatch) {
    try {
      const parsed = JSON.parse(objMatch[0]);
      if (parsed && Array.isArray(parsed.insights)) return parsed.insights;
    } catch {}
  }

  return [];
}

function sanitizeInsights(items) {
  const out = [];
  for (const it of items || []) {
    if (!it || typeof it !== 'object') continue;

    const type = VALID_TYPES.has(String(it.type)) ? String(it.type) : 'suggestion';
    const message = String(it.message || '').trim();
    if (!message) continue;

    const affected = Array.isArray(it.affected_services)
      ? it.affected_services.filter(x => typeof x === 'string').slice(0, 10)
      : [];

    let conf = Number(it.confidence_score);
    if (!Number.isFinite(conf)) conf = 0.7;
    conf = clamp(conf, 0, 1);

    out.push({ type, message, affected_services: affected, confidence_score: conf });
  }
  if (out.length > 7) return out.slice(0, 7);
  return out;
}

function heuristicInsights(features) {
  const insights = [];
  const currency = features.currency || 'NGN';

  // Overlap
  if (features.overlaps?.length) {
    const top = features.overlaps[0];
    const names = top.names || [];
    if (names.length >= 2) {
      insights.push({
        type: 'overlap_detected',
        message: `Overlap in ${top.category}: ${names.join(', ')}. Keep one to save monthly.`,
        affected_services: names,
        confidence_score: 0.8,
      });
    }
  }

  // Due soon
  if (features.due_soon?.length) {
    const names = features.due_soon.map(s => s.name).filter(Boolean);
    insights.push({
      type: 'alert',
      message: `${names.length} subscription${names.length > 1 ? 's' : ''} due within 7 days: ${names.join(', ')}.`,
      affected_services: names,
      confidence_score: 0.85,
    });
  }

  // Low usage
  if (features.low_usage?.length) {
    const names = features.low_usage.slice(0, 3).map(s => s.name).filter(Boolean);
    insights.push({
      type: 'suggestion',
      message: `No recent payments detected for ${names.join(', ')}. Consider pausing or cancelling.`,
      affected_services: names,
      confidence_score: 0.7,
    });
  }

  // Price change
  if (features.price_changes?.length) {
    const first = features.price_changes[0];
    const name = first?.sub?.name;
    const pct = Math.round((first?.pctDiff || 0) * 100);
    if (name && Math.abs(pct) >= 15) {
      const dir = pct > 0 ? 'increased' : 'decreased';
      insights.push({
        type: 'alert',
        message: `${name} price appears to have ${dir} by ~${Math.abs(pct)}% vs recent payments.`,
        affected_services: [name],
        confidence_score: 0.75,
      });
    }
  }

  // Top category
  const topCat = features.category_totals?.[0];
  if (topCat?.monthly_total > 0) {
    const names = (features.subscriptions || [])
      .filter(s => (s.category || 'Uncategorized') === topCat.category)
      .map(s => s.name);
    insights.push({
      type: 'suggestion',
      message: `Most spend in ${topCat.category}. Look for bundles/family plans for ${names.join(', ')}.`,
      affected_services: names,
      confidence_score: 0.7,
    });
  }

  // Expensive
  if (features.expensive?.length) {
    const top = [...features.expensive].sort((a, b) => Number(b.amount) - Number(a.amount))[0];
    if (top?.name) {
      insights.push({
        type: 'cost_saving_tip',
        message: `${top.name} is one of your most expensive plans at ${formatCurrency(top.amount, currency)}. Check for cheaper tiers or yearly savings.`,
        affected_services: [top.name],
        confidence_score: 0.72,
      });
    }
  }

  // Baseline overview (ensure something)
  if (insights.length < 3) {
    const total = formatCurrency(features.total_monthly, currency);
    const count = features.subscriptions?.length || 0;
    insights.push({
      type: 'suggestion',
      message: `You’re spending about ${total} per month across ${count} subscriptions.`,
      affected_services: [],
      confidence_score: 0.8,
    });
  }

  return insights.slice(0, 7);
}

async function generateWithModel(features) {
  if (!model) return [];
  const prompt = buildPrompt(features);
  const resp = await model.generateContent(prompt);
  const text = typeof resp?.response?.text === 'function' ? resp.response.text() : '';
  const arr = extractJsonArray(text);
  return sanitizeInsights(arr);
}

export async function generateInsights(features) {
  try {
    if (model) {
      const ai = await generateWithModel(features);
      const cleaned = sanitizeInsights(ai);
      if (cleaned.length >= 3) return cleaned;

      const heur = heuristicInsights(features);
      const merged = [...cleaned, ...heur].reduce((acc, it) => {
        if (!acc.some(x => x.message === it.message)) acc.push(it);
        return acc;
      }, []);
      return merged.slice(0, 7);
    }
  } catch (e) {
    console.error('Gemini generation error:', e?.message || e);
  }
  return heuristicInsights(features);
}

export default {
  generateInsights,
};