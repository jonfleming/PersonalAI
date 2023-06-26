const { app, BrowserWindow, dialog, ipcMain, Menu } = require("electron")
const path = require('path')
const fs = require('fs');
const ini = require('ini')
const { PineconeClient } = require("@pinecone-database/pinecone")
const { ChatOpenAI } = require("langchain/chat_models/openai")
const { HumanChatMessage, SystemChatMessage } = require("langchain/schema")
const { DirectoryLoader } = require("langchain/document_loaders/fs/directory")
const { TextLoader } = require("langchain/document_loaders/fs/text")
const { CharacterTextSplitter } = require("langchain/text_splitter")
const { PineconeStore } = require("langchain/vectorstores/pinecone")
const { OpenAIEmbeddings } = require("langchain/embeddings/openai")
const { MemoryVectorStore } = require("langchain/vectorstores/memory")
const indexer = require('./confluence-indexer')

require("dotenv").config()

const config = ini.parse(fs.readFileSync('./config.ini', 'utf-8'))
const chat = new ChatOpenAI({ temperature: 0 })
const pineconeClient = new PineconeClient()
const maxTokens = 2048

let sessionId = config.sessionId //`${Date.now()}`
let pineconeIndex = null
let requestId = 0

pineconeClient.init({
  apiKey: process.env.PINECONE_API_KEY,
  environment: process.env.PINECONE_ENVIRONMENT,
}).then(() => {
  pineconeIndex = pineconeClient.Index(process.env.PINECONE_INDEX)
})

if (!fs.existsSync(config.currentDir)) {
  fs.mkdirSync(config.currentDir)
}

function saveConfig(currentDir) {
  const indexFile = path.join(currentDir, 'index.ini')
  let retval = false
  
  if (fs.existsSync(indexFile)) {
    const index = ini.parse(fs.readFileSync(indexFile, 'utf-8'))
    sessionId = index.sessionId
  } else {
    sessionId = `${Date.now()}`
    const index = {
      sessionId
    }

    fs.writeFileSync(indexFile, ini.stringify(index))
    retval = true
  }
  
  config.currentDir = currentDir
  config.sessionId = sessionId

  fs.writeFileSync('./config.ini', ini.stringify(config))

  return retval
}

async function handleChat(prompt) {
  const vectorStore = await PineconeStore.fromExistingIndex(new OpenAIEmbeddings(), { pineconeIndex })
  const matches = await vectorStore.similaritySearch(prompt, 20, { sessionId })
  const context = matches.map(x => x.pageContent).join(' ')

  const response = await chat.call([
    new SystemChatMessage(`You are a helpful assistant. Use the following context to anser the User's question. Context: ${context}`),
    new HumanChatMessage(`User: ${prompt}`)
  ])

  return { prompt, completion: response.text }
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
  })

  ipcMain.on('dialog:openFolder', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({ properties: ['openDirectory']})
    if (!canceled) {

      const needsIndexing = saveConfig(filePaths[0])
      mainWindow.webContents.send('dialog:reply', config.currentDir)

      if (needsIndexing) {
        const files = indexer.getFilenames(config.currentDir)
        mainWindow.webContents.send('dialog:filelist', files)  
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
