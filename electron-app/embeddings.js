// a class that implements langchainjs Embeddings
const azure = require("./azure-rest-api")

class AzureEmbeddings {
  constructor(params) {
  }

  async embedDocuments(documents) {    
    return documents.map(async (document) => await this.embedQuery(document))
  }

  async embedQuery(document) {
    return await azure.getEmbeddings({ input: document,  })
  }
}

module.exports = { AzureEmbeddings }