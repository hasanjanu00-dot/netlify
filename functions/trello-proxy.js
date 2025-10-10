// functions/trello-proxy.js
import fetch from "node-fetch"; // <-- Use import instead of require

export async function handler(event) {
  const { TRELLO_KEY, TRELLO_TOKEN } = process.env;

  const url = `https://api.trello.com/1/members/me/boards?key=${TRELLO_KEY}&token=${TRELLO_TOKEN}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
}
