const endpoint='https://api.openai.com/v1'
const completionUrl=`${endpoint}/chat/completions`
const embeddingsUrl=`${endpoint}/embeddings`

module.exports = {completionUrl, embeddingsUrl}
