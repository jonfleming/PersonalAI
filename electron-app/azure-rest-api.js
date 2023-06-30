const spawn = require('child_process').spawn
const fetch = require('node-fetch')
const path = require('path')
const fs = require('fs');
const ini = require('ini')

const config = ini.parse(fs.readFileSync('./config.ini', 'utf-8'))
const completionUrl = config.completionUrl
const embeddingsUrl = config.embeddingsUrl

let bearerToken = null

function getAccessToken() {
  const login = spawn('az.cmd', ['login'])
  login.stdout.on('data', (data) => {
    console.log(`stdout: ${data}`) 
    spawn('az.cmd', ['account', 'set', '--subscription', '45ee5d37-dd7d-42dc-84d7-5c2c4aba7e1a'])

    const accessToken = spawn('az.cmd', ['account', 'get-access-token', '--resource', 'https://cognitiveservices.azure.com', '-o', 'json'])
    accessToken.stdout.on('data', (data) => {
      console.log(`stdout: ${data}`)
      bearerToken = JSON.parse(data).accessToken
    })    
  })
}

function azureEmbeddings() {
  const embedDocuments = async (documents) => {
    return documents.map(document => embedQuery(document))
  }

  const embedQuery = async (document) => {
    const response = await fetch(embeddingsUrl, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({input: document}),
    })
    
    const json = await response.json();
    console.log(json);
  
    return json.choices[0].message.content
  }

  return { embedDocuments, embedQuery }
}

function getHeaders() {
  return {
    'Content-Type': 'application/json',
    "Accept": "application/json, text/plain, */*",
    'Authorization': `Bearer ${bearerToken}`
  }
}
async function chatCompletion(data) { 
  const response = await fetch(completionUrl, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data),
  })
  
  const json = await response.json();
  console.log(json);

  return json.choices[0].message.content
}

module.exports = { azureEmbeddings, chatCompletion, getAccessToken }
