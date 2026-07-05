'use strict';

const MAX_IMAGES = 3;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const SERPER_API_KEY = process.env.SERPER_API_KEY || '';
const AI_CHAT_ENABLED = process.env.AI_CHAT_ENABLED !== 'false';

const WHATSAPP_REPAIR_NUMBERS = (process.env.WHATSAPP_NOTIFY_NUMBERS || '601128731020,601162021508,60187664947')
  .split(',')
  .map((n) => n.replace(/\D/g, ''))
  .filter(Boolean);

function isAiConfigured() {
  return AI_CHAT_ENABLED && Boolean(OPENAI_API_KEY || ANTHROPIC_API_KEY);
}

function sanitizeText(value, maxLen) {
  return String(value || '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/<[^>]*>/g, '')
    .trim()
    .slice(0, maxLen);
}

function parseDataUrl(dataUrl) {
  const match = String(dataUrl).match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!match) return null;
  const mime = match[1];
  const base64 = match[2];
  let buffer;
  try {
    buffer = Buffer.from(base64, 'base64');
  } catch {
    return null;
  }
  if (!buffer.length || buffer.length > MAX_IMAGE_BYTES) return null;
  return { mime, base64, bytes: buffer.length };
}

function validatePayload(body) {
  const errors = [];
  const description = sanitizeText(body.description, 2000);
  const brand = sanitizeText(body.brand, 120);
  const modelSerial = sanitizeText(body.modelSerial, 120);
  const lang = body.lang === 'ms' ? 'ms' : 'en';

  if (description.length < 10) {
    errors.push('Please describe the problem in at least 10 characters.');
  }
  if (!brand) {
    errors.push('Please enter the appliance brand.');
  }

  const images = [];
  const rawImages = Array.isArray(body.images) ? body.images.slice(0, MAX_IMAGES) : [];
  for (const raw of rawImages) {
    const parsed = parseDataUrl(raw);
    if (!parsed) {
      errors.push('One or more photos are invalid or too large (max 5MB each, JPEG/PNG/WebP).');
      break;
    }
    if (!ALLOWED_MIME.has(parsed.mime)) {
      errors.push('Unsupported image type. Use JPEG, PNG, or WebP.');
      break;
    }
    images.push(parsed);
  }

  if (errors.length) return { ok: false, errors };

  return {
    ok: true,
    data: { description, brand, modelSerial, lang, images },
  };
}

async function searchWeb(query) {
  const q = sanitizeText(query, 200);
  if (!q) return '';

  if (SERPER_API_KEY) {
    try {
      const res = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': SERPER_API_KEY,
        },
        body: JSON.stringify({ q, num: 5 }),
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        const data = await res.json();
        const snippets = (data.organic || [])
          .slice(0, 5)
          .map((r) => `- ${r.title}: ${r.snippet || ''}`)
          .join('\n');
        if (snippets) return snippets;
      }
    } catch (err) {
      console.warn('Serper search failed:', err.message);
    }
  }

  try {
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(q)}&format=json&no_html=1&skip_disambig=1`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (res.ok) {
      const data = await res.json();
      const parts = [];
      if (data.AbstractText) parts.push(data.AbstractText);
      if (data.Answer) parts.push(data.Answer);
      if (data.RelatedTopics?.length) {
        data.RelatedTopics.slice(0, 4).forEach((t) => {
          if (t.Text) parts.push(t.Text);
        });
      }
      if (parts.length) return parts.join('\n');
    }
  } catch (err) {
    console.warn('DuckDuckGo search failed:', err.message);
  }

  return '';
}

function buildSystemPrompt(lang) {
  const language = lang === 'ms' ? 'Bahasa Melayu' : 'English';
  return `You are a helpful appliance repair assistant for Aman Electrical, a home appliance repair service in Klang Valley, Malaysia.
Respond in ${language}. Be practical, safety-conscious, and clear for homeowners.
Never claim a definitive diagnosis — use cautious language ("likely", "possible", "may indicate").
If electrical shock, gas smell, burning smell, or sparking is mentioned, strongly recommend turning off power and calling a professional immediately.
Return ONLY valid JSON with this exact structure (no markdown fences):
{
  "likelyCause": "string",
  "diyChecks": ["string"],
  "proRepairRecommended": boolean,
  "complexity": "simple" | "moderate" | "needs_technician",
  "explanation": "string (2-4 short paragraphs in plain language)"
}`;
}

function buildUserPrompt(data, webContext) {
  const lines = [
    `Brand: ${data.brand}`,
    data.modelSerial ? `Model/serial: ${data.modelSerial}` : 'Model/serial: not provided',
    `Problem: ${data.description}`,
  ];
  if (webContext) {
    lines.push('', 'Web search notes (use as hints, may be incomplete):', webContext);
  } else {
    lines.push('', 'No web search results — use common knowledge for this brand/appliance type and say so briefly.');
  }
  if (data.images.length) {
    lines.push('', `${data.images.length} photo(s) attached — inspect for visible damage, error codes, leaks, or wear.`);
  }
  return lines.join('\n');
}

function parseDiagnosisJson(text) {
  const cleaned = String(text).replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
  try {
    const parsed = JSON.parse(cleaned);
    const complexity = ['simple', 'moderate', 'needs_technician'].includes(parsed.complexity)
      ? parsed.complexity
      : 'moderate';
    return {
      likelyCause: sanitizeText(parsed.likelyCause, 500),
      diyChecks: Array.isArray(parsed.diyChecks)
        ? parsed.diyChecks.map((c) => sanitizeText(c, 300)).filter(Boolean).slice(0, 6)
        : [],
      proRepairRecommended: Boolean(parsed.proRepairRecommended),
      complexity,
      explanation: sanitizeText(parsed.explanation, 3000),
    };
  } catch {
    return {
      likelyCause: '',
      diyChecks: [],
      proRepairRecommended: true,
      complexity: 'moderate',
      explanation: sanitizeText(cleaned, 3000),
    };
  }
}

async function callOpenAI(data, webContext) {
  const content = [{ type: 'text', text: buildUserPrompt(data, webContext) }];
  for (const img of data.images) {
    content.push({
      type: 'image_url',
      image_url: { url: `data:${img.mime};base64,${img.base64}`, detail: 'low' },
    });
  }

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      max_tokens: 1200,
      temperature: 0.4,
      messages: [
        { role: 'system', content: buildSystemPrompt(data.lang) },
        { role: 'user', content },
      ],
    }),
    signal: AbortSignal.timeout(45000),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    throw new Error(`OpenAI error ${res.status}: ${errBody.slice(0, 200)}`);
  }

  const json = await res.json();
  const text = json.choices?.[0]?.message?.content || '';
  return parseDiagnosisJson(text);
}

async function callAnthropic(data, webContext) {
  const content = [{ type: 'text', text: buildUserPrompt(data, webContext) }];
  for (const img of data.images) {
    const mediaType = img.mime;
    content.push({
      type: 'image',
      source: { type: 'base64', media_type: mediaType, data: img.base64 },
    });
  }

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 1200,
      system: buildSystemPrompt(data.lang),
      messages: [{ role: 'user', content }],
    }),
    signal: AbortSignal.timeout(45000),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    throw new Error(`Anthropic error ${res.status}: ${errBody.slice(0, 200)}`);
  }

  const json = await res.json();
  const text = json.content?.find((b) => b.type === 'text')?.text || '';
  return parseDiagnosisJson(text);
}

async function runDiagnosis(data) {
  const searchQuery = `${data.brand} ${data.modelSerial} ${data.description} common problem fix`;
  const webContext = await searchWeb(searchQuery);

  let diagnosis;
  if (OPENAI_API_KEY) {
    diagnosis = await callOpenAI(data, webContext);
  } else if (ANTHROPIC_API_KEY) {
    diagnosis = await callAnthropic(data, webContext);
  } else {
    throw new Error('No AI provider configured');
  }

  return { diagnosis, webSearchUsed: Boolean(webContext) };
}

function buildWhatsAppRepairMessage(data, diagnosisSummary) {
  const isMs = data.lang === 'ms';
  const header = isMs
    ? '🔧 *Permintaan Pembaikan — Aman Electrical*'
    : '🔧 *Repair Request — Aman Electrical*';
  const lines = [header, ''];

  if (data.brand) lines.push(isMs ? `*Jenama:* ${data.brand}` : `*Brand:* ${data.brand}`);
  if (data.modelSerial) {
    lines.push(isMs ? `*Model/Siri:* ${data.modelSerial}` : `*Model/Serial:* ${data.modelSerial}`);
  }
  lines.push(isMs ? `*Masalah:* ${data.description}` : `*Problem:* ${data.description}`);

  if (diagnosisSummary) {
    lines.push('');
    lines.push(isMs ? '*Ringkasan AI:*' : '*AI summary:*');
    lines.push(diagnosisSummary);
  }

  lines.push('');
  lines.push(isMs ? 'Saya ingin tempah pembaikan. Boleh hubungi saya?' : 'I would like to book a repair. Please contact me.');
  return lines.join('\n');
}

function buildFallbackMessage(data) {
  const isMs = data.lang === 'ms';
  return isMs
    ? `Kami boleh bantu diagnosis peralatan anda.\n\nJenama: ${data.brand}\n${data.modelSerial ? `Model/Siri: ${data.modelSerial}\n` : ''}Masalah: ${data.description}\n\nSila hubungi kami untuk lawatan pembaikan.`
    : `Our team can help with your appliance issue.\n\nBrand: ${data.brand}\n${data.modelSerial ? `Model/Serial: ${data.modelSerial}\n` : ''}Problem: ${data.description}\n\nPlease contact us to arrange a repair visit.`;
}

function summarizeForWhatsApp(diagnosis) {
  if (!diagnosis) return '';
  const parts = [];
  if (diagnosis.likelyCause) parts.push(`Likely: ${diagnosis.likelyCause}`);
  if (diagnosis.complexity) parts.push(`Complexity: ${diagnosis.complexity}`);
  if (diagnosis.proRepairRecommended) parts.push('Pro repair recommended');
  return parts.join(' · ');
}

async function diagnose(body) {
  const validated = validatePayload(body);
  if (!validated.ok) {
    return { ok: false, status: 422, errors: validated.errors };
  }

  const { data } = validated;
  const whatsappMessage = buildWhatsAppRepairMessage(data, '');

  if (!isAiConfigured()) {
    return {
      ok: true,
      aiAvailable: false,
      message: 'AI assistant not configured. Our team can still help via WhatsApp.',
      fallbackText: buildFallbackMessage(data),
      whatsappMessage,
      whatsappNumbers: WHATSAPP_REPAIR_NUMBERS,
    };
  }

  try {
    const { diagnosis, webSearchUsed } = await runDiagnosis(data);
    const summary = summarizeForWhatsApp(diagnosis);
    return {
      ok: true,
      aiAvailable: true,
      diagnosis: { ...diagnosis, webSearchUsed },
      whatsappMessage: buildWhatsAppRepairMessage(data, summary),
      whatsappNumbers: WHATSAPP_REPAIR_NUMBERS,
    };
  } catch (err) {
    console.error('AI diagnosis failed:', err.message);
    return {
      ok: true,
      aiAvailable: false,
      message: 'AI is temporarily unavailable. You can still reach our electricians on WhatsApp.',
      fallbackText: buildFallbackMessage(data),
      whatsappMessage,
      whatsappNumbers: WHATSAPP_REPAIR_NUMBERS,
    };
  }
}

module.exports = {
  diagnose,
  validatePayload,
  isAiConfigured,
  WHATSAPP_REPAIR_NUMBERS,
  buildWhatsAppRepairMessage,
};
