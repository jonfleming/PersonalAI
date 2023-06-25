const { app, BrowserWindow, dialog, ipcMain } = require("electron")
const path = require('path')
const fs = require('fs');
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

const chat = new ChatOpenAI({ temperature: 0 })
const pineconeClient = new PineconeClient()
let requestId = 0

pineconeClient.init({
  apiKey: process.env.PINECONE_API_KEY,
  environment: process.env.PINECONE_ENVIRONMENT,
});

async function indexPage(directoryPath) {
  const splitter = new CharacterTextSplitter({separator: ' ', chunkSize: 100, chunkOverlap: 3})
  const loader = new DirectoryLoader( directoryPath, { ".txt": (dir) => new TextLoader(dir) } )
  const docs = await loader.load()
  const splitDocs = await splitter.splitDocuments(docs)

  try {
    vectorStore = await MemoryVectorStore.fromDocuments(splitDocs, new OpenAIEmbeddings())
  } catch(error) {
    console.log(error)
  }
  
  console.log(docs)
}

async function handleChat(prompt) {
  const pineconeIndex = pineconeClient.Index(process.env.PINECONE_INDEX)
  const vectorStore = await PineconeStore.fromExistingIndex(new OpenAIEmbeddings(), { pineconeIndex })
  const matches = await vectorStore.similaritySearch(prompt, 10)
  const context = matches.map(x => x.pageContent).join(' ')
  const response = await chat.call([
    new SystemChatMessage(`You are a helpful assistant. Use the following context to anser the User's question. Context: ${context}`),
    new HumanChatMessage(`User: ${prompt}`)
  ])

  return { prompt, completion: response.text }
}

const createWindow = () => {
  const win = new BrowserWindow({
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

  return win
}

app.whenReady().then(() => {
  const mainWindow = createWindow();
  // mainWindow.webContents.openDevTools()
  ipcMain.on('dialog:openFolder', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({ properties: ['openDirectory']})
    if (!canceled) {
      mainWindow.webContents.send('dialog:reply', filePaths[0])

      const files = indexer.getFilenames(filePaths[0])
      mainWindow.webContents.send('dialog:filelist', files)
    }      
  })

  ipcMain.on('chat:completion', async (_, prompt) => {
    const response = await handleChat(prompt)
    response.id = requestId++
    mainWindow.webContents.send('chat:response', response)
  })

  ipcMain.on('fetch:searchTerm', async (_, {outputPath, searchTerm}) => {
    await indexer.handleFetch(mainWindow, outputPath, searchTerm)
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
