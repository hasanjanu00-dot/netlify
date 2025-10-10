const fetch = require("node-fetch");

const TRELLO_KEY = process.env.TRELLO_KEY;
const TRELLO_TOKEN = process.env.TRELLO_TOKEN;

exports.handler = async function(event, context) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  };

  // Handle preflight OPTIONS
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, body: "OK", headers };
  }

  const { action, boardId, listId, cardId, name, desc } = event.queryStringParameters || {};
  
  let url = "";
  let options = { method: "GET" };

  try {
    switch(action) {
      case "getBoards":
        url = `https://api.trello.com/1/members/me/boards?key=${TRELLO_KEY}&token=${TRELLO_TOKEN}`;
        break;
      case "getLists":
        url = `https://api.trello.com/1/boards/${boardId}/lists?cards=all&card_fields=name,desc&key=${TRELLO_KEY}&token=${TRELLO_TOKEN}`;
        break;
      case "createCard":
        url = `https://api.trello.com/1/cards?name=${encodeURIComponent(name)}&desc=${encodeURIComponent(desc || "")}&idList=${listId}&key=${TRELLO_KEY}&token=${TRELLO_TOKEN}`;
        options.method = "POST";
        break;
      case "updateCard":
        url = `https://api.trello.com/1/cards/${cardId}?name=${encodeURIComponent(name)}&desc=${encodeURIComponent(desc || "")}&key=${TRELLO_KEY}&token=${TRELLO_TOKEN}`;
        options.method = "PUT";
        break;
      case "deleteCard":
        url = `https://api.trello.com/1/cards/${cardId}?key=${TRELLO_KEY}&token=${TRELLO_TOKEN}`;
        options.method = "DELETE";
        break;
      default:
        return { statusCode: 400, body: JSON.stringify({ error: "Invalid action" }), headers };
    }

    const res = await fetch(url, options);
    const data = await res.json();
    return { statusCode: 200, body: JSON.stringify(data), headers };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }), headers };
  }
};
