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
let sessionId = `${Date.now()}`
let config = { currentDir, sessionId }

function needsIndexing(currentDir) {
  const indexFile = path.join(currentDir, 'index.json')

  return !fs.existsSync(indexFile)
}

async function handleChat(prompt) {
  if (prompt === 'test') {
    indexer.text()
    return
  }
  const matches = await indexer.similaritySearch(prompt, sessionId)
  const context = matches.map(x => x.pageContent).join(' ').substring(0, 6000)

  const data = {
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
  const mainWindow = createWindow();
  
  globalShortcut.register('Control+Shift+I', () => {
    mainWindow.webContents.openDevTools()
  })

  ipcMain.on('init:filelist', async () => {
    log.info(`Sending filelist: ${config.currentDir}`)
    const files = indexer.getFilenames(config.currentDir)
    mainWindow.webContents.send('dialog:reply', config.currentDir)
    mainWindow.webContents.send('dialog:filelist', files)
    sessionId = indexer.LoadIndex(config.currentDir, sessionId)
  })

  ipcMain.on('dialog:openFolder', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({ properties: ['openDirectory']})
    
    if (!canceled) {
      config.currentDir = filePaths[0]
      config.sessionId = indexer.saveIndex(config.currentDir)
      indexer.writeConfig(config)
      mainWindow.webContents.send('dialog:reply', config.currentDir)

      const files = indexer.getFilenames(config.currentDir)
      mainWindow.webContents.send('dialog:filelist', files)  

      if (needsIndexing(config.currentDir)) {
        await indexer.indexDirectory(config.currentDir, sessionId)
      }
    }      
  })

  ipcMain.on('chat:completion', async (_, prompt) => {
    const response = await handleChat(prompt)
    response.id = requestId++
    mainWindow.webContents.send('chat:response', response)
  })

  ipcMain.on('fetch:searchTerm', async (_, {outputPath, searchTerm}) => {
    
    await indexer.handleFetch(mainWindow, outputPath, searchTerm, sessionId)
    const files = indexer.getFilenames(outputPath)
    mainWindow.webContents.send('dialog:filelist', files)
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  }) 
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

  const {accessToken, expiresOn} = await azure.getAccessToken(config)
  config.accessToken = accessToken
  config.expiresOn = expiresOn

  indexer.writeConfig(config)

  if (!fs.existsSync(currentDir)) {
    console.log(`Creating ${currentDir}`)
    fs.mkdirSync(currentDir)
  }

  openWindow()
}
