const endpoint='https://mcg-internal-playground.openai.azure.com'
const subscription='45ee5d37-dd7d-42dc-84d7-5c2c4aba7e1a'
const resource = 'https://cognitiveservices.azure.com'
const deployment='gpt35'
const apiVersion='2023-05-15'
const completionUrl=`${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`
const embeddingsUrl=`${endpoint}/openai/deployments/${deployment}/embeddings?api-version=${apiVersion}`

module.exports = {completionUrl, embeddingsUrl, subscription, resource}
