const { app, BrowserWindow, dialog, globalShortcut, ipcMain, Menu } = require("electron")
const path = require('path')
const fs = require('fs');
const indexer = require('./indexer')
const azure = require('./azure-rest-api');
const log = require('electron-log');

require("dotenv").config()
// require('update-electron-app')({
//   repo: `jonfleming/PersonalAI`,
//   logger: log,
//   requireSignedApp: false
// })

let requestId = 0
let currentDir = './index'
let sessionId = ''
let config = { currentDir, sessionId }
let handlingInit = false
let handlingSelect = false
let mainWindow = null

async function handleChat(prompt) {
  if (prompt === 'test') {
    indexer.text()
    return
  }

  const matches = await indexer.similaritySearch(prompt, sessionId)
  const context = matches.map(x => x.pageContent).join(' ').substring(0, 6000)
  const reference = matches.slice(0, 3).map(match => match.metadata.source).join('\n')

  log.info('context:', context)

  const data = {
    "model": "gpt-3.5-turbo",
    "messages": [
        {"role": "system", "content": `You are a helpful assistant. Use the following context to anser the User's question. Context: ${context}`},
        {"role": "user", "content": prompt}
      ]
  }

  let response = await azure.chatCompletion(data)
  response += `\n\nReferences:\n${reference}`

  log.info('response:', response)

  return { prompt, completion: response }
}

const createWindow = () => {
  const win = new BrowserWindow({
    minWidth: 800,
    width: 1200,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  })

  if(!process.defaultApp) {
    log.info('PAI: packaged')
    win.loadFile('index.html'); // prod
  } else {
    log.info('PAI: dev')
    win.loadURL('http://localhost:3000'); // dev
  }

  const menu = Menu.buildFromTemplate([])
  Menu.setApplicationMenu(menu)

  return win
}

function openWindow() {
  mainWindow = createWindow();

  globalShortcut.register('Control+Shift+I', () => {
    mainWindow.webContents.openDevTools()
  })

  ipcMain.on('init:filelist', async () => {
    if (handlingInit) {
      return
    }

    if (config.currentDir === process.cwd()) {
      log.info(`Triggering SelectFolder`)
      handlingInit = true
      mainWindow.webContents.send('init:filelist')

      return
    }

    handlingInit = true
    await handleSelectFolder(config.currentDir)
  })

  ipcMain.on('dialog:openFolder', async () => {
    if (handlingSelect) {
      return
    }

    await handleSelectFolder('')
  })

  ipcMain.on('chat:completion', async (_, prompt) => {
    log.info('chat:completion', prompt)
    const response = await handleChat(prompt)
    response.id = requestId++
    mainWindow.webContents.send('chat:response', response)
    log.info('chat:response', response)
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
}

function selectDirectory(filepath) {
  log.info(`Sending currentDir: ${filepath}`)

  mainWindow.webContents.send('dialog:reply', filepath)
  sendFileList(filepath)

  config.currentDir = filepath
  indexer.writeConfig(config)
}

function sendFileList(filepath) {
  const files = indexer.getFilenames(filepath)
  log.info(`Sending filelist: ${JSON.stringify(files, null, 2)}`)
  mainWindow.webContents.send('dialog:filelist', files)
}

async function handleSelectFolder(filepath) {
  log.info(`Selected folder: ${filepath}`)

  let response = null
  let selected = true
  handlingSelect = true

  if (!filepath) {
    response = await dialog.showOpenDialog({ properties: ['openDirectory']})
    selected = !response.canceled
    filepath = response.filePaths[0]
  }

  if (selected && filepath) {
    selectDirectory(filepath)
    sessionId = await indexer.LoadOrCreateIndex(filepath, sessionId)
    mainWindow.webContents.send('indexing:complete', '')
    config.sessionId = sessionId
    config.currentDir = filepath
    indexer.writeConfig(config)
  }

  handlingSelect = false
}

app.whenReady().then(() => {
  main()
})
.catch(err => log.error(err));

app.on("window-all-closed", () => {
  globalShortcut.unregisterAll();

  if (process.platform !== "darwin") app.quit()
})

async function main() {
  config = indexer.readConfig()
  currentDir = config.currentDir
  sessionId = config.sessionId

  indexer.writeConfig(config)

  openWindow()
}
