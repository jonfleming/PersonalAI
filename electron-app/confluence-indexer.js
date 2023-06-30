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
const { MemoryVectorStore } = require("langchain/vectorstores/memory")
const { convert } = require("html-to-text")
const azure = require("./azure-rest-api")
const fileExtensions = [".txt", ".xslx", ".docx", ".pdf", ".csv"]

require("dotenv").config()

const email = "jon.fleming@mcg.com"
const apiToken = process.env.JIRA_TOKEN
const base64EncodedCredentials = btoa(email + ":" + apiToken)
const baseUrl = "https://mcghealth.atlassian.net/wiki"
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
    Authorization: `Basic ${base64EncodedCredentials}`,
    Accept: "application/json",
  },
}

const request = async (url) => {
  const response = await fetch(url, options)
  console.log("Request:", url)
  const json = await response.json()

  return json
}

const getPage = async (spaceKey, title) => {
  const queryString = `spaceKey=${encodeURIComponent(
    spaceKey
  )}&title=${encodeURIComponent(title)}`
  const response = await request(
    `${baseUrl}/rest/api/content?${queryString}&expand=body.storage`
  )

  return response
}

const getSpace = async (spaceKey) => {
  const response = await request(`${baseUrl}/rest/api/space/${spaceKey}`)

  return response.name
}

const getSpaceKey = (url) => {
  const spaceKey = url.split("/")[2]

  return spaceKey
}

const getPages = async (title) => {
  const queryString = `type="page" and title~"*${title}*"&includeArchivedSpaces=false&limit=20`
  const response = await request(
    `${baseUrl}/rest/api/search?cql=${queryString}`
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

  console.log(`Page: ${spaceKey}/${title}`)
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
    console.log(error)
  }

  console.log("indexed ", filename)
}

async function similaritySearch(prompt, sessionId) {
  const filter = (doc) => doc.metadata.sessionId === sessionId
  const result = await vectorStore.similaritySearch(prompt, 20, filter)
  console.log(result)

  return result
}

async function indexDirectory(directoryPath) {
  if (!vectorStore) {
    createIndex()
  }
  
  const loader = new DirectoryLoader(directoryPath, {
    ".txt": (dir) => new TextLoader(dir),
    ".csv": (path) => new CSVLoader(path, "text"),
    ".pdf": (path) => new PDFLoader(path),
    ".docx": (path) => new DocxLoader(path),
  })

  const docs = await loader.load()
  const splitDocs = await splitter.splitDocuments(docs)

  try {
    await vectorStore.addDocuments(splitDocs)
  } catch (error) {
    console.log(error)
  }

  console.log("indexed ", directoryPath)
}

async function handleFetch(mainWindow, outputPath, searchTerm, sessionId) {
  console.log("Output Path:", outputPath)
  console.log("Search Term:", searchTerm)
  console.log("Starting fetch...")

  const pages = await getPages(searchTerm)
  mainWindow.webContents.send("fetch:reply", `Fetching ${pages.length} pages`)
  try {
    await saveContent(pages, outputPath, sessionId)
    mainWindow.webContents.send("fetch:done", "Indexing")
  } catch (err) {
    console.log(err)
  }

  SaveIndex(outputPath, vectorStore)
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
  //const embeddings = azure.azureEmbeddings()
  const embeddings = new OpenAIEmbeddings()
  vectorStore = new MemoryVectorStore(embeddings)
}

function LoadIndex(directoryPath) {
  console.log("Loading index...", directoryPath)
  const indexFile = path.join(directoryPath, "index.json")

  if (!vectorStore) {
    createIndex()
  }
  if (fs.existsSync(indexFile)) {
    const json = fs.readFileSync(path.join(directoryPath, "index.json"), "utf8")
    vectorStore.memoryVectors = JSON.parse(json)
  } else {
    indexDirectory(directoryPath)
  }
}

function SaveIndex(directoryPath) {
  console.log("Saving index...", directoryPath)
  const indexFile = path.join(directoryPath, "index.json")
  const json = JSON.stringify(vectorStore.memoryVectors)
  fs.writeFileSync(indexFile, json)
}

module.exports = {
  handleFetch,
  getFilenames,
  similaritySearch,
  createIndex,
  LoadIndex,
  SaveIndex,
  indexDirectory,
}
