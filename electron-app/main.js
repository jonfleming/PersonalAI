const { app, BrowserWindow, dialog, globalShortcut, ipcMain, Menu } = require("electron")
const path = require('path')
const fs = require('fs');
const indexer = require('./indexer')
const azure = require('./azure-rest-api');
const log = require('electron-log');

require("dotenv").config()
require('update-electron-app')({
  repo: `jonfleming/PersonalAI`,
  logger: log,
  requireSignedApp: false
})

let requestId = 0
let currentDir = './index'
let sessionId = ''
let config = { currentDir, sessionId }
let handlingInit = false
let handlingOpenDialog = false
let mainWindow = null

function needsIndexing(currentDir) {
  const indexFile = path.join(currentDir, 'index.ini')

  return !fs.existsSync(indexFile)
}

async function handleChat(prompt) {
  if (prompt === 'test') {
    indexer.text()
    return
  }

  const matches = await indexer.similaritySearch(prompt, sessionId)
  const context = matches.map(x => x.pageContent).join(' ').substring(0, 6000)
  console.log('context:', context)

  const data = {
    "model": "gpt-3.5-turbo",
    "messages": [
        {"role": "system", "content": `You are a helpful assistant. Use the following context to anser the User's question. Context: ${context}`},
        {"role": "user", "content": prompt}
      ]
  }

  const response = await azure.chatCompletion(data)

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

    if (currentDir === process.cwd()) {
      log.info(`Triggering SelectFolder`)
      handlingInit = true
      mainWindow.webContents.send('init:filelist')

      return
    }

    handlingInit = true
    log.info(`Sending filelist: ${config.currentDir}`)
    selectDirectory(config.currentDir)

    try {
      sessionId = await indexer.LoadIndex(config.currentDir, sessionId)
    } catch (error) {
      log.error(error)
    }

    handlingInit = false
  })

  ipcMain.on('dialog:openFolder', async () => {
    if (handlingOpenDialog) {
      return
    }

    handlingOpenDialog = true
    const { canceled, filePaths } = await dialog.showOpenDialog({ properties: ['openDirectory']})

    if (!canceled) {
      selectDirectory(filePaths[0])

      if (needsIndexing(config.currentDir)) {
        await indexer.indexDirectory(config.currentDir, sessionId)
      } else {
        await indexer.createIndex()
      }
    }

    handlingOpenDialog = false
  })

  ipcMain.on('chat:completion', async (_, prompt) => {
    console.log('chat:completion', prompt)
    const response = await handleChat(prompt)
    response.id = requestId++
    mainWindow.webContents.send('chat:response', response)
    console.log('chat:response', response)
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
}

function selectDirectory(filepath) {
  const files = indexer.getFilenames(filepath)
  mainWindow.webContents.send('dialog:reply', filepath)
  mainWindow.webContents.send('dialog:filelist', files)

  config.currentDir = filepath
  config.sessionId = indexer.saveIndex(config.currentDir)
  indexer.writeConfig(config)
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

  if (!fs.existsSync(currentDir)) {
    log.info(`Creating ${currentDir}`)
    fs.mkdirSync(currentDir)
  }

  openWindow()
}
