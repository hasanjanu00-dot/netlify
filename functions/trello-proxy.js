const fetch = require('node-fetch');

exports.handler = async (event) => {
  const path = event.queryStringParameters?.path || '/1/members/me/boards';
  const token = event.headers['x-trello-token']; // user token from client
  const key = process.env.TRELLO_KEY; // your API key from Trello

  const url = `https://api.trello.com${path}?key=${key}${token ? `&token=${token}` : ''}`;
  
  const resp = await fetch(url);
  const data = await resp.text();

  return {
    statusCode: resp.status,
    headers: { 
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json'
    },
    body: data
  };
};
