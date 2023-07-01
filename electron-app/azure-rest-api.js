const spawn = require('child_process').spawn
const fetch = require('node-fetch')
const path = require('path')
const fs = require('fs');
const ini = require('ini')
const settings = require('./azure-settings')

let accessToken = null
let expiresOn = null

async function getAccessToken(config) {
  if (new Date(config.expiresOn) > new Date()) {
    accessToken = config.accessToken
    expiresOn = config.expiresOn
    console.log('Using cached token')
    
    return { accessToken, expiresOn }  
  }

  await exec('az.cmd', ['login'])
  const data = await exec('az.cmd', ['account', 'get-access-token', '--resource', 'https://cognitiveservices.azure.com', '-o', 'json'])
  accessToken = JSON.parse(data).accessToken
  expiresOn = JSON.parse(data).expiresOn

  return { accessToken, expiresOn }
}

function exec(cmd, params) {
  return new Promise((resolve, reject) => {
    const childProcess = spawn(cmd, params)

    childProcess.stdout.on('data', (data) => {
      console.log(`stdout: ${data}`) 
      spawn('az.cmd', ['account', 'set', '--subscription', '45ee5d37-dd7d-42dc-84d7-5c2c4aba7e1a'])  
      resolve(data)
    })

    childProcess.on('error', (error) => {
      reject(error);
    });
  })  
}

function getHeaders() {
  return {
    'Content-Type': 'application/json',
    "Accept": "application/json, text/plain, */*",
    'Authorization': `Bearer ${accessToken}`
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
  console.log(json);

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
  console.log(json);

  return json.data[0].embeddings
}

module.exports = { chatCompletion, getAccessToken, getEmbeddings }
