// a class that implements langchainjs Embeddings
const { OpenAIEmbeddings } = require("langchain/embeddings/openai")
const azure = require('./azure-rest-api')
require('dotenv').config()

const embeddings = new OpenAIEmbeddings()

class AzureEmbeddings {
  constructor(params) {
  }

  async embedDocuments(documents) {    
    return documents.map(async (document) => await this.embedQuery(document))
  }

  async getEmbeddings(document) {
    const xenova = await import("@xenova/transformers");  // const {pipeline } = require('@xenova/transformers')
    const xenovaEmbeddings = await xenova.pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2')
    const output = await xenovaEmbeddings(document, { pooling: 'mean', normalize: true })

    return output
  }

  async embedQuery(text) {
    const response = await openai.createEmbedding({
      input: text,
      model: 'text-embedding-ada-002',
    });
  
    return response.data.embedding;
  }
}

module.exports = { AzureEmbeddings }