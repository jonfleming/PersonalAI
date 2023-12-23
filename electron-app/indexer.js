const fetch = require('node-fetch')
const path = require('path')
const fs = require('fs')
const ini = require('ini')

const { DirectoryLoader } = require('langchain/document_loaders/fs/directory')
const { TextLoader } = require('langchain/document_loaders/fs/text')
const { CSVLoader } = require('langchain/document_loaders/fs/csv')
const { PDFLoader } = require('langchain/document_loaders/fs/pdf')
const { DocxLoader } = require('langchain/document_loaders/fs/docx')
const { UnstructuredLoader } = require('langchain/document_loaders/fs/unstructured')
const { CharacterTextSplitter } = require('langchain/text_splitter')
const { OpenAIEmbeddings } = require('langchain/embeddings/openai')
const  xenova = require('./embeddings')
const { MemoryVectorStore } = require('langchain/vectorstores/memory')
const { PineconeClient } = require('@pinecone-database/pinecone')
const { PineconeStore } = require('langchain/vectorstores/pinecone')
const { convert } = require('html-to-text')
const log = require('electron-log');
const azure = require('./azure-rest-api')

require('dotenv').config()

const fileExtensions = ['.txt', '.xslx', '.docx', '.pdf', '.csv', '.html']
const indexIni = 'index.ini'
const spaces = {}
let vectorStore = null

const splitter = new CharacterTextSplitter({
  separator: ' ',
  chunkSize: 200,
  chunkOverlap: 3,
})

const htmlOptions = {
  wordwrap: 130,
}

async function similaritySearch(prompt, sessionId) {
  const filter = (doc) => doc.metadata.sessionId === sessionId
  const result = await vectorStore.similaritySearch(prompt, 30, filter)
  log.info(result)

  return result
}

async function indexDirectory(directoryPath, sessionId) {
  await createIndex()

  const loader = new DirectoryLoader(directoryPath, {
      '.txt':  (path) => new TextLoader(path),
      '.csv':  (path) => new CSVLoader(path, 'text'),
      '.pdf':  (path) => new PDFLoader(path),
      '.docx': (path) => new DocxLoader(path),
      '.html': (path) => new TextLoader(path),
      '.md':   (path) => new TextLoader(path),
      },
  )

  const docs = await loader.load()
  const splitDocs = await splitter.splitDocuments(docs)

  splitDocs.forEach((doc) => (doc.metadata.sessionId = sessionId))

  try {
    await vectorStore.addDocuments(splitDocs)
  } catch (error) {
    log.error(error)
  }

  sessionId = saveIndex(directoryPath)
  log.info('indexed ', directoryPath)
}

function getFilenames(directoryPath) {
  let result = []

  const items = fs.readdirSync(directoryPath)

  for (let item of items) {
    let fullPath = path.join(directoryPath, item)
    let stat = fs.statSync(fullPath)

    if (stat.isDirectory()) {
      result.push({
        name: item,
        path: fullPath,
        type: 'directory',
        children: getFilenames(fullPath),
      })
    } else {
      fileExtensions.includes(path.extname(item).toLowerCase())
        ? result.push({ name: item, path: fullPath, type: 'file' })
        : null
    }
  }

  return result
}

function readConfig() {
  let config = {}
  if (fs.existsSync('./config.ini')) {
    console.log('Read config')
    config = ini.parse(fs.readFileSync('./config.ini', 'utf-8'))
  } else {
    console.log('No config found')
    config = {
      currentDir: process.cwd(),
      sessionId: `${Date.now()}`,
    }
  }

  return config
}

function writeConfig(config) {
  fs.writeFileSync('./config.ini', ini.stringify(config))
}

async function createIndex() {
  if (vectorStore) {
    return
  }

  const client = new PineconeClient()
  await client.init({
    apiKey: process.env.PINECONE_API_KEY,
    environment: process.env.PINECONE_ENVIRONMENT,
  });
  const pineconeIndex = client.Index(process.env.PINECONE_INDEX);
  const embeddings = new OpenAIEmbeddings()
  vectorStore = await PineconeStore.fromExistingIndex(embeddings, { pineconeIndex });
}

async function LoadIndex(directoryPath, sessionId) {
  log.info('Loading index...', directoryPath)
  const indexFile = path.join(directoryPath, indexIni)

  if (!vectorStore) {
    await createIndex()
  }
  if (fs.existsSync(indexFile)) {
    const index = ini.parse(fs.readFileSync(indexFile, 'utf-8'))
    sessionId = index.sessionId
  } else {
    try {
      await indexDirectory(directoryPath, sessionId)
    } catch (error) {
      log.error(error)
    }
  }

  return sessionId
}

function saveIndex(directoryPath) {
  const iniFile = path.join(directoryPath, indexIni)
  log.info(`Saving ${indexIni}`, directoryPath)

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

  return sessionId
}

function test() {
  const response = azure.getEmbeddings('Hello World')
}

module.exports = {
  getFilenames,
  similaritySearch,
  createIndex,
  LoadIndex,
  saveIndex,
  indexDirectory,
  readConfig,
  writeConfig,
  test,
}
