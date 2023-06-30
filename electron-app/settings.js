const endpoint='https://mcg-internal-playground.openai.azure.com'
const deployment='gpt35'
const apiVersion='2023-05-15'
const completionUrl=`${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`
const embeddingsUrl=`${endpoint}/openai/deployments/${deployment}/embeddings?api-version=${apiVersion}`

module.exports = {completionUrl, embeddingsUrl}
