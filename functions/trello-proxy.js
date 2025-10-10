// netlify/functions/trello-proxy.js (CommonJS)
const fetch = require('node-fetch');

const ALLOWED_ORIGINS = [
  'https://flip-rabbit.webflow.io',   // Webflow published preview (change if needed)
  'https://flip-rabbit.netlify.app',   // your Netlify site (if calling from same origin)
  // add other allowed origins here, e.g. 'https://your-custom-domain.com'
];

function getCorsHeaders(origin) {
  const headers = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }
  // If you want to allow credentials (cookies/auth), add:
  // headers['Access-Control-Allow-Credentials'] = 'true';
  return headers;
}

exports.handler = async function(event, context) {
  // read origin of the request
  const origin = (event.headers && (event.headers.origin || event.headers.Origin)) || null;
  const headers = getCorsHeaders(origin);

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers,
      body: '' // no body for preflight
    };
  }

  try {
    const params = event.queryStringParameters || {};
    const { action, boardId, listId, cardId } = params;
    // note: `name` and `desc` might contain spaces/special chars; we will encode when needed
    const name = params.name;
    const desc = params.desc;

    const TRELLO_KEY = process.env.TRELLO_KEY;
    const TRELLO_TOKEN = process.env.TRELLO_TOKEN;

    if (!TRELLO_KEY || !TRELLO_TOKEN) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Trello credentials not configured on server' })
      };
    }

    const base = 'https://api.trello.com/1';
    let url = '';
    let options = { method: 'GET' };

    switch (action) {
      case 'getBoards':
        url = `${base}/members/me/boards?key=${TRELLO_KEY}&token=${TRELLO_TOKEN}`;
        break;

      case 'createBoard':
        url = `${base}/boards/?name=${encodeURIComponent(name || '')}&key=${TRELLO_KEY}&token=${TRELLO_TOKEN}`;
        options.method = 'POST';
        break;

      case 'getLists':
        // include cards and some fields
        url = `${base}/boards/${boardId}/lists?cards=all&card_fields=name,desc&key=${TRELLO_KEY}&token=${TRELLO_TOKEN}`;
        break;

      case 'createList':
        url = `${base}/lists?name=${encodeURIComponent(name || '')}&idBoard=${boardId}&key=${TRELLO_KEY}&token=${TRELLO_TOKEN}`;
        options.method = 'POST';
        break;

      case 'createCard':
        url = `${base}/cards?name=${encodeURIComponent(name || '')}&idList=${listId}&key=${TRELLO_KEY}&token=${TRELLO_TOKEN}`;
        options.method = 'POST';
        break;

      case 'updateCard':
        url = `${base}/cards/${cardId}?name=${encodeURIComponent(name || '')}&desc=${encodeURIComponent(desc || '')}&key=${TRELLO_KEY}&token=${TRELLO_TOKEN}`;
        options.method = 'PUT';
        break;

      case 'deleteCard':
        url = `${base}/cards/${cardId}?key=${TRELLO_KEY}&token=${TRELLO_TOKEN}`;
        options.method = 'DELETE';
        break;

      case 'moveCard':
        url = `${base}/cards/${cardId}?idList=${listId}&key=${TRELLO_KEY}&token=${TRELLO_TOKEN}`;
        options.method = 'PUT';
        break;

      default:
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid action' })
        };
    }

    const res = await fetch(url, options);
    const text = await res.text();
    // Try to parse JSON; if not JSON, return text.
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      data = { raw: text };
    }

    return {
      statusCode: res.status || 200,
      headers,
      body: JSON.stringify(data),
    };

  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message })
    };
  }
};
