// netlify/functions/gemini-chat.js (CommonJS)
// Paste this file into your repo, push, and Netlify will deploy it.
// Uses built-in fetch if available; falls back to node-fetch if not.
const fetch = globalThis.fetch || require('node-fetch');

const ALLOWED_ORIGINS = [
  'https://flip-rabbit.webflow.io',     // Webflow published/preview domain
  'https://flip-rabbit.netlify.app',     // your netlify site origin (if needed)
  // add your custom domain(s) here, e.g. 'https://www.yourdomain.com'
];

function getCorsHeaders(origin) {
  const headers = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }
  // during dev you can set '*' but it's less secure
  // headers['Access-Control-Allow-Origin'] = '*';
  return headers;
}

exports.handler = async function (event, context) {
  const origin = (event.headers && (event.headers.origin || event.headers.Origin)) || null;
  const headers = getCorsHeaders(origin);

  // handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers,
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const { message, history = [], model } = body;

    if (!message || typeof message !== 'string') {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing message' }) };
    }

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'GEMINI_API_KEY not configured' }),
      };
    }

    const MODEL = model || process.env.GEMINI_MODEL || 'gemini-2.5-flash';

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

    // Build a simple payload. We include the latest user message and optionally attach prior messages (history)
    // Format: contents -> parts -> text  (per docs/examples)
    const contents = [
      {
        parts: [
          {
            text: message,
          },
        ],
      },
    ];

    // If you want to include history for multi-turn, you can prepend it to 'contents'.
    // Be careful: long history -> more tokens/usage. Here we append history as previous content parts (simple approach).
    if (Array.isArray(history) && history.length) {
      // keep history small: only last N messages (trim on client ideally)
      const trimmed = history.slice(-6); // keep last 6 messages as example
      // Prepend previous messages as distinct content items:
      const historyContents = trimmed.map(h => ({
        parts: [{ text: `${h.role === 'user' ? 'User:' : 'Assistant:'} ${h.text}` }],
      }));
      // Combine: history first, then current prompt
      contents.unshift(...historyContents);
    }

    const payload = { contents };

    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': GEMINI_API_KEY,   // as shown in docs/examples
      },
      body: JSON.stringify(payload),
    });

    const data = await resp.json();

    // Extract a reasonable text reply (matches doc example structure)
    const reply =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      data?.candidates?.[0]?.text ||
      (typeof data === 'string' ? data : null) ||
      'Sorry, no reply returned';

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ reply, raw: data }),
    };

  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
