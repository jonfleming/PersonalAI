const { app, BrowserWindow, dialog, ipcMain, Menu } = require("electron")
const path = require('path')
const fs = require('fs');
const ini = require('ini')
const indexer = require('./confluence-indexer')
const azure = require('./azure-rest-api')

require("dotenv").config()

const config = ini.parse(fs.readFileSync('./config.ini', 'utf-8'))
const maxTokens = 2048

let sessionId = config.sessionId //`${Date.now()}`
let requestId = 0

if (!fs.existsSync(config.currentDir)) {
  fs.mkdirSync(config.currentDir)
}

function needsIndexing(currentDir) {
  const indexFile = path.join(currentDir, 'index.json')

  return !fs.existsSync(indexFile)
}

function saveConfig(currentDir) {
  const indexFile = path.join(currentDir, 'index.json')
  const iniFile = path.join(currentDir, 'index.ini')
  let retval = false
  
  if (fs.existsSync(iniFile)) {
    const index = ini.parse(fs.readFileSync(iniFile, 'utf-8'))
    sessionId = index.sessionId
  } else {
    sessionId = `${Date.now()}`
    const index = {
      sessionId
    }

    fs.writeFileSync(iniFile, ini.stringify(index))
  }
  
  config.currentDir = currentDir
  config.sessionId = sessionId

  fs.writeFileSync('./config.ini', ini.stringify(config))
}

async function handleChat(prompt) {
  const matches = await indexer.similaritySearch(prompt, sessionId)
  const context = matches.map(x => x.pageContent).join(' ')

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
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  })
  
  if(!process.defaultApp) {
    console.log('PAI: packaged')
    win.loadFile('index.html'); // prod
  } else {
    console.log('PAI: dev')
    win.loadURL('http://localhost:3000'); // dev
  }

  const menu = Menu.buildFromTemplate([])
  // Menu.setApplicationMenu(menu)

  return win
}


app.whenReady().then(() => {
  const mainWindow = createWindow();
  // mainWindow.webContents.openDevTools()

  ipcMain.on('init:filelist', async (_, prompt) => {
    console.log(`Sending filelist: ${config.currentDir}`)
    const files = indexer.getFilenames(config.currentDir)
    mainWindow.webContents.send('dialog:reply', config.currentDir)
    mainWindow.webContents.send('dialog:filelist', files)
    indexer.LoadIndex(config.currentDir)
  })

  ipcMain.on('dialog:openFolder', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({ properties: ['openDirectory']})
    
    if (!canceled) {
      saveConfig(filePaths[0])
      mainWindow.webContents.send('dialog:reply', config.currentDir)

      const files = indexer.getFilenames(config.currentDir)
      mainWindow.webContents.send('dialog:filelist', files)  

      if (needsIndexing(config.currentDir)) {
        indexer.indexDirectory(config.currentDir)
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
})
.catch(err => console.log(err));

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit()
})

azure.getAccessToken()