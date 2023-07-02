const fetch = require("node-fetch")
const path = require("path")
const fs = require("fs")
const { DirectoryLoader } = require("langchain/document_loaders/fs/directory")
const { TextLoader } = require("langchain/document_loaders/fs/text")
const { CSVLoader } = require("langchain/document_loaders/fs/csv")
const { PDFLoader } = require("langchain/document_loaders/fs/pdf")
const { DocxLoader } = require("langchain/document_loaders/fs/docx")
const { CharacterTextSplitter } = require("langchain/text_splitter")
const { OpenAIEmbeddings } = require("langchain/embeddings/openai")
const { AzureEmbeddings } = require("./embeddings")
const { MemoryVectorStore } = require("langchain/vectorstores/memory")
const { convert } = require("html-to-text")
const log = require('electron-log');
const azure = require("./azure-rest-api")

require('dotenv').config()
require('update-electron-app')({
  repo: `jonfleming/PersonalAI`,
  logger: log,
  requireSignedApp: false
})

const fileExtensions = [".txt", ".xslx", ".docx", ".pdf", ".csv"]
const spaces = {}
let vectorStore = null

const splitter = new CharacterTextSplitter({
  separator: " ",
  chunkSize: 100,
  chunkOverlap: 3,
})

const htmlOptions = {
  wordwrap: 130,
}

const options = {
  method: "GET",
  headers: {
    Authorization: `Basic ${process.env.CONFLUENCE_AUTH}`,
    Accept: "application/json",
  },
}

const request = async (url) => {
  const response = await fetch(url, options)
  log.info("Request:", url)
  const json = await response.json()

  return json
}

const getPage = async (spaceKey, title) => {
  const queryString = `spaceKey=${encodeURIComponent(
    spaceKey
  )}&title=${encodeURIComponent(title)}`
  const response = await request(
    `${process.env.CONFLUENCE_URL}/rest/api/content?${queryString}&expand=body.storage`
  )

  return response
}

const getSpace = async (spaceKey) => {
  const response = await request(`${process.env.CONFLUENCE_URL}/rest/api/space/${spaceKey}`)

  return response.name
}

const getSpaceKey = (url) => {
  const spaceKey = url.split("/")[2]

  return spaceKey
}

const getPages = async (title) => {
  const queryString = `type="page" and title~"*${title}*"&includeArchivedSpaces=false&limit=20`
  const response = await request(
    `${process.env.CONFLUENCE_URL}/rest/api/search?cql=${queryString}`
  )
  const pages = await response.results.map((page) => {
    return {
      id: page.content.id,
      title: page.content.title,
      url: page.url,
      space: page.space,
    }
  })

  return pages
}

const savePage = async (spaceKey, outputPath, title, body, sessionId) => {
  log.info('saving ', title)
  if (!spaces[spaceKey]) {
    const response = await getSpace(spaceKey)
    spaces[spaceKey] = response
  }

  const directory = path.join(outputPath, spaces[spaceKey])
  if (!fs.existsSync(outputPath)) {
    fs.mkdirSync(outputPath)
  }

  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory)
  }

  const text = convert(body, htmlOptions)
  let filename = `${title
    .replace(/\//g, " - ")
    .replace(/</g, "(")
    .replace(/>/g, ")")}.txt`
  filename = path.join(directory, filename)

  if (!fs.existsSync(filename)) {
    fs.writeFileSync(filename, text)
    await indexPage(filename, sessionId)
  }

  log.info(`Page: ${spaceKey}/${title}`)
}

const saveContent = async (pages, outputPath, sessionId) => {
  await Promise.all(
    pages.map(async (page, pageIndex, arr) => {
      const spaceKey = getSpaceKey(page.url)
      const response = await getPage(spaceKey, page.title)

      await savePage(
        spaceKey,
        outputPath,
        page.title,
        response.results[0].body.storage.value,
        sessionId
      )
    })
  )
}

async function indexPage(filename, sessionId) {
  const loader = new TextLoader(filename)
  const docs = await loader.load()
  const splitDocs = await splitter.splitDocuments(docs)

  splitDocs.forEach((doc) => (doc.metadata.sessionId = sessionId))

  try {
    await vectorStore.addDocuments(splitDocs)
  } catch (error) {
    log.error(error)
  }

  log.info("indexed ", filename)
}

async function similaritySearch(prompt, sessionId) {
  const filter = (doc) => doc.metadata.sessionId === sessionId
  const result = await vectorStore.similaritySearch(prompt, 20, filter)
  log.info(result)

  return result
}

async function indexDirectory(directoryPath, sessionId) {
  if (!vectorStore) {
    createIndex()
  }
  
  const loader = new DirectoryLoader(directoryPath, {
    ".txt": (path) => new TextLoader(path),
    ".csv": (path) => new CSVLoader(path, "text"),
    ".pdf": (path) => new PDFLoader(path),
    ".docx": (path) => new DocxLoader(path),
    ".ini": (path) => new TextLoader(path),
  })

  const docs = await loader.load()
  const splitDocs = await splitter.splitDocuments(docs)

  splitDocs.forEach((doc) => (doc.metadata.sessionId = sessionId))

  try {
    await vectorStore.addDocuments(splitDocs)
  } catch (error) {
    log.error(error)
  }

  SaveIndex(directoryPath)
  log.info("indexed ", directoryPath)
}

async function handleFetch(mainWindow, outputPath, searchTerm, sessionId) {
  log.info("Output Path:", outputPath)
  log.info("Search Term:", searchTerm)
  log.info("Starting fetch...")

  const pages = await getPages(searchTerm)
  mainWindow.webContents.send("fetch:reply", `Fetching ${pages.length} pages`)
  try {
    await saveContent(pages, outputPath, sessionId)
    mainWindow.webContents.send("fetch:done", "Indexing")
  } catch (err) {
    log.error(err)
  }

  SaveIndex(outputPath)
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
        type: "directory",
        children: getFilenames(fullPath),
      })
    } else {
      fileExtensions.includes(path.extname(item).toLowerCase())
        ? result.push({ name: item, path: fullPath, type: "file" })
        : null
    }
  }

  return result
}

function createIndex() {
  // const embeddings = new AzureEmbeddings()
  const embeddings = new OpenAIEmbeddings()
  vectorStore = new MemoryVectorStore(embeddings)
}

function LoadIndex(directoryPath, sessionId) {
  log.info("Loading index...", directoryPath)
  const indexFile = path.join(directoryPath, "index.json")

  if (!vectorStore) {
    createIndex()
  }
  if (fs.existsSync(indexFile)) {
    const json = fs.readFileSync(path.join(directoryPath, "index.json"), "utf8")
    vectorStore.memoryVectors = JSON.parse(json)
  } else {
    indexDirectory(directoryPath, sessionId)
  }
}

function SaveIndex(directoryPath) {
  log.info("Saving index...", directoryPath)
  const indexFile = path.join(directoryPath, "index.json")
  const json = JSON.stringify(vectorStore.memoryVectors)
  fs.writeFileSync(indexFile, json)
}

function test() {
  const response = azure.getEmbeddings("Hello World")
}

module.exports = {
  handleFetch,
  getFilenames,
  similaritySearch,
  createIndex,
  LoadIndex,
  SaveIndex,
  indexDirectory,
  test,
}
