const axios = require('axios')
const path = require('path')
const fs = require('fs')
const { PineconeClient } = require("@pinecone-database/pinecone");
const { DirectoryLoader } = require("langchain/document_loaders/fs/directory");
const { TextLoader } = require("langchain/document_loaders/fs/text");
const { CharacterTextSplitter } = require("langchain/text_splitter");
const { PineconeStore } = require("langchain/vectorstores/pinecone");
const { OpenAIEmbeddings } = require("langchain/embeddings/openai");
const { convert } = require('html-to-text');

require("dotenv").config();

const email = 'jon.fleming@mcg.com'
const apiToken = process.env.JIRA_TOKEN
const base64EncodedCredentials = btoa(email + ':' + apiToken)
const baseUrl = 'https://mcghealth.atlassian.net/wiki'
const splitter = new CharacterTextSplitter({separator: ' ', chunkSize: 100, chunkOverlap: 3})
const htmlOptions = {
  wordwrap: 130,
};

const spaces = {}
let pineconeIndex = null;

const options = {
  headers: { 
    Authorization: `Basic ${base64EncodedCredentials}`,
    Accept: 'application/json'
  }
}

const request = async (url) => {
  const response = await axios.get(url, options)
  console.log('Request:', url)
  
  return response.data
}

const getPage = async (spaceKey, title) => {
  const queryString = `spaceKey=${encodeURIComponent(spaceKey)}&title=${encodeURIComponent(title)}`  
  const response = await request(`${baseUrl}/rest/api/content?${queryString}&expand=body.storage`)

  return response
}

const getSpace = async (spaceKey) => {
  const response = await request(`${baseUrl}/rest/api/space/${spaceKey}`)

  return response.name
}

const getSpaceKey = (url) => {
  const spaceKey = url.split('/')[2]

  return spaceKey
}

const getPages = async (title) => {
  const queryString = `type="page" and title~"*${title}*"&includeArchivedSpaces=false&limit=20`
  const response = await request(`${baseUrl}/rest/api/search?cql=${queryString}`)
  const pages = await response.results.map(page => {
    return { id: page.content.id, title: page.content.title, url: page.url, space: page.space }
  })

  return pages
}

const savePage = async (spaceKey, outputPath, title, body) => {
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
  let filename = `${title.replace(/\//g, ' - ').replace(/</g, '(').replace(/>/g, ')')}.txt`
  filename = path.join(directory, filename)

  if (!fs.existsSync(filename)) {
    fs.writeFileSync(filename, text)
    await indexPage(filename)
  }

  console.log(`Page: ${spaceKey}/${title}`)
}

const saveContent = async (pages, outputPath) => {
  await Promise.all(pages.map(async (page, pageIndex, arr) => {
    const spaceKey = getSpaceKey(page.url)
    const response = await getPage(spaceKey, page.title)

    await savePage(spaceKey, outputPath, page.title, response.results[0].body.storage.value)
  }))
}

async function indexPage(filename) {
  const loader = new TextLoader(filename)
  const docs = await loader.load()
  const splitDocs = await splitter.splitDocuments(docs)

  try {
    await PineconeStore.fromDocuments(splitDocs, new OpenAIEmbeddings(), {
      pineconeIndex,
    });    
  } catch(error) {
    console.log(error)
  }
  
  console.log('indexed ', filename)
}

async function indexDirectory(directoryPath) {  
  const loader = new DirectoryLoader( directoryPath, { ".txt": (dir) => new TextLoader(dir) } )
  const docs = await loader.load()
  const splitDocs = await splitter.splitDocuments(docs)

  try {
    await PineconeStore.fromDocuments(splitDocs, new OpenAIEmbeddings(), {
      pineconeIndex,
    });    
  } catch(error) {
    console.log(error)
  }
  
  console.log('indexed ', directoryPath)
}

async function handleFetch(mainWindow, outputPath, searchTerm) {
  const pineconeClient = new PineconeClient()

  await pineconeClient.init({
    apiKey: process.env.PINECONE_API_KEY,
    environment: process.env.PINECONE_ENVIRONMENT,
  });

  pineconeIndex = pineconeClient.Index(process.env.PINECONE_INDEX)
   
  console.log('Output Path:', outputPath)
  console.log('Search Term:', searchTerm)
  console.log('Starting fetch...')

  const pages = await getPages(searchTerm)
  mainWindow.webContents.send('fetch:reply', `Fetched ${pages.length} pages`)
  try {
    await saveContent(pages, outputPath)
    mainWindow.webContents.send('fetch:done', 'Indexing')  
  } catch(err) {
    console.log(err)
  }
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

module.exports = { handleFetch, getFilenames }