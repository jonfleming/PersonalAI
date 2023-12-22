const spawn = require('child_process').spawn
const fetch = require('node-fetch')
const log = require('electron-log');
const settings = require('./azure-settings')
require('dotenv').config()

let expiresOn = null

function getHeaders() {
  return {
    'Content-Type': 'application/json',
    "Accept": "application/json, text/plain, */*",
    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
  }
}

async function chatCompletion(data) {
  // {messages: [{role: 'system', 'content': 'your are a helpful assistant'}, {role: 'user', content: 'hi'}] }
  const response = await fetch(settings.completionUrl, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data),
  })

  const json = await response.json();
  log.info(json);

  return json.choices[0].message.content
}

async function getEmbeddings(data) {
  // { input: 'string' }
  const response = await fetch(settings.embeddingsUrl, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data),
  })

  const json = await response.json();
  log.info(json);

  return json.data[0].embeddings
}

module.exports = { chatCompletion, getEmbeddings }
