const spawn = require('child_process').spawn
const fetch = require('node-fetch')
const log = require('electron-log');
const settings = require('./azure-settings')

let accessToken = null
let expiresOn = null

async function getAccessToken(config) {
  if (new Date(config.expiresOn) > new Date()) {
    accessToken = config.accessToken
    expiresOn = config.expiresOn
    log.info('Using cached token')

    return { accessToken, expiresOn }  
  }

  await exec('az.cmd', ['login'])
  await spawn('az.cmd', ['account', 'set', '--subscription', settings.subscription])
  console.log('Getting access token')
  const data = await exec('az.cmd', ['account', 'get-access-token', '--resource', settings.resource, '-o', 'json'])
  accessToken = JSON.parse(data).accessToken
  expiresOn = JSON.parse(data).expiresOn

  return { accessToken, expiresOn }
}

function exec(cmd, params) {
  console.log(`Executing: ${cmd} ${params.join(' ')}`)
  let output = ''

  return new Promise((resolve, reject) => {
    const childProcess = spawn(cmd, params)

    childProcess.stdout.on('data', (data) => {
      output += data
      log.info(`stdout: ${data}`)       
      resolve(data)
    })

    childProcess.on('close', (code) => {
      console.log(`child process exited with code ${code}`)
    })

    childProcess.on('error', (error) => {
      log.error(error)
      reject(error)
    })
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

module.exports = { chatCompletion, getAccessToken, getEmbeddings }
