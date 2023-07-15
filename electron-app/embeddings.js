// a class that implements langchainjs Embeddings
const {pipeline } = require('@xenova/transformers')
const {config } = require('dotenv')
const embeddings = new OpenAIEmbeddings()
const azure = require('./azure-rest-api')

class AzureEmbeddings {
  constructor(params) {
  }

  async embedDocuments(documents) {    
    return documents.map(async (document) => await this.embedQuery(document))
  }

  // async embedQuery(document) {
  //   //const output = await embeddings(document, { pooling: 'mean', normalize: true })    
  //   const output = await embeddings.getEmbeddings({ input: document,  })

  //   // output.data
  //   // EmbeddingResponse = { 'object': string, 'model': string, 'data': Array<DataInner>, 'usage': EmbeddingResponseUsage}
  //   // DataInner = { 'index': number, 'object':string, 'embedding': Array<number>)}
  //   return output
  // }

  async embedQuery(text) {
    const response = await openai.createEmbedding({
      input: text,
      model: 'text-embedding-ada-002',
    });
  
    return response.data.embedding;
  }
}

module.exports = { AzureEmbeddings }