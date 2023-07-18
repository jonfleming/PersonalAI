// a class that implements langchainjs Embeddings
const { OpenAIEmbeddings } = require("langchain/embeddings/openai")
const azure = require('./azure-rest-api')
require('dotenv').config()

const embeddings = new OpenAIEmbeddings()

class XenovaEmbeddings {
  constructor(params) {
    console.log("XenovaEmbeddings constructor")
  }

  async embedDocuments(documents) {    
    return documents.map(async (document) => await this.embedQuery(document))
  }

  async getEmbeddings(text) {
    const xenova = await import("@xenova/transformers");  // const {pipeline } = require('@xenova/transformers')
    const xenovaEmbeddings = await xenova.pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2')
    const output = await xenovaEmbeddings(text, { pooling: 'mean', normalize: true })

    return output.data
  }

  async embedQuery(text) {
    // LangChain/embeddings/oppenai
    // const response = await embeddings.embedQuery(text);
    const response = await this.getEmbeddings(text)
  
    return response; // an array of numbers
  }
}

module.exports = XenovaEmbeddings