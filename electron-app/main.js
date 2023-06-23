const { app, BrowserWindow, dialog, ipcMain } = require("electron")
const path = require('path')
const fs = require('fs');
const { PineconeClient } = require("@pinecone-database/pinecone");
const { ChatOpenAI } = require("langchain/chat_models/openai")
const { HumanChatMessage, SystemChatMessage } = require("langchain/schema")
const { DirectoryLoader } = require("langchain/document_loaders/fs/directory");
const { TextLoader } = require("langchain/document_loaders/fs/text");
const { CharacterTextSplitter } = require("langchain/text_splitter");
const { PineconeStore } = require("langchain/vectorstores/pinecone");
const { OpenAIEmbeddings } = require("langchain/embeddings/openai");
require("dotenv").config();

const chat = new ChatOpenAI({ temperature: 0 });
const pineconeClient = new PineconeClient();

pineconeClient.init({
  apiKey: process.env.PINECONE_API_KEY,
  environment: process.env.PINECONE_ENVIRONMENT,
});

let vectorStore;

async function indexDocuments(directoryPath) {
  const pineconeIndex = pineconeClient.Index(process.env.PINECONE_INDEX);
  const splitter = new CharacterTextSplitter({separator: ' ', chunkSize: 100, chunkOverlap: 3});  
  const loader = new DirectoryLoader( directoryPath, { ".html": (dir) => new TextLoader(dir) } )
  const docs = await loader.load()
  const splitDocs = await splitter.splitDocuments(docs)

  try {
    await PineconeStore.fromDocuments(docs, new OpenAIEmbeddings(), {
      pineconeIndex,
    });    
  } catch(error) {
    console.log(error)
  }
  
  console.log(docs)
}

function handleSetTitle(event, title) {
  const webContents = event.sender
  const win = BrowserWindow.fromWebContents(webContents)
  win.setTitle(title)
}

async function handleChat(prompt) {
  const pineconeIndex = pineconeClient.Index(process.env.PINECONE_INDEX)
  const vectorStore = await PineconeStore.fromExistingIndex(new OpenAIEmbeddings(), { pineconeIndex })
  const matches = await vectorStore.similaritySearch(prompt, 1)
  const context = matches[0].pageContent
  const response = await chat.call([
    new SystemChatMessage(`You are a helpful assistant. Use the following context to anser the User's question. Context: ${context}`),
    new HumanChatMessage(`User: ${prompt}`)
  ])

  return { prompt, completion: response.text }
}

function getFilenames (directoryPath) {
  let result = [];

  const items = fs.readdirSync(directoryPath);

  for (let item of items) {
      let fullPath = path.join(directoryPath, item);
      let stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
          result.push({
              name: item,
              path: fullPath,
              type: 'directory',
              children: getFilenames(fullPath)
          });
      } else {
          result.push({
              name: item,
              path: fullPath,
              type: 'file'
          });
      }
  }

  return result;
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
  ipcMain.on('set-title', handleSetTitle)
  ipcMain.on('dialog:openFolder', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({ properties: ['openDirectory']})
    if (!canceled) {
      mainWindow.webContents.send('dialog:reply', filePaths[0])

      const files = getFilenames(filePaths[0])
      mainWindow.webContents.send('dialog:filelist', files)
      try {
        await indexDocuments(filePaths[0])
      } catch (error) {
        console.log(error)
      }
      
    }      
  })

  ipcMain.on('chat:completion', async (_, prompt) => {
    const response = await handleChat(prompt)
    mainWindow.webContents.send('chat:response', response)
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })  
})
.catch(err => console.log(err));

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit()
})

