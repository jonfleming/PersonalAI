# Personal AI

Personal AI provides a simple UI that lets you ask questions and use documents on your local computer as context for answering the questions.

It uses [LangChain DirectoryLoader](https://js.langchain.com/docs/integrations/document_loaders/file_loaders/directory) to parse, chunk, and generate text embeddings for files in a directory that you specify.  The embeddings are store in a [Pinecone Vector Database](https://www.pinecone.io/).


---

## Screenshot

![Screenshot](https://github.com/jonfleming/PersonalAI/raw/main/screenshot.png)

## Technology Stack

[Electron](https://www.electronjs.org/) - A JavaScript framework for building cross-platform desktop applications leveraging the power of modern web technologies and libraries.

[React](https://react.dev/) - A Javascript User Interface library.

[Material UI (MUI)](https://mui.com/) - Open Source user interface framework with a broad list of UI components.

[LangChain](https://docs.langchain.com/docs/) - A framework for developing applications powered by large language models.

---

## Setup

You can install Personal AI by downloading the latest setup.exe from the [Releases](https://github.com/jonfleming/PersonalAI) page [https://github.com/jonfleming/PersonalAI](https://github.com/jonfleming/PersonalAI/releases).

## Confluence Access

To make Confluence API calls you need to set a couple of environment variables.

``` cmd
CONFLUENCE_USER=<your-confluence-user-name>
CONFLUENCE_TOKEN=<your-confluence-api-token>
CONFLUENCE_URL=https://mcghealth.atlassian.net/wiki
```

How to get your Confluence API Token [https://support.atlassian.com/atlassian-account/docs/manage-api-tokens-for-your-atlassian-account/](https://support.atlassian.com/atlassian-account/docs/manage-api-tokens-for-your-atlassian-account/)

## OpenAI API Access

``` cmd
OPENAI_API_KEY=<your-openai-api-key>
```

How to get you OpenAI API Key [https://platform.openai.com/account/api-keys](https://platform.openai.com/account/api-keys)

## Pinecone API Access

``` cmd
PINECONE_API_KEY=<your-pinecone-api-key>
PINECONE_ENVIRONMENT=<your-pinecone-environment>
PINECONE_INDEX=<your-pineconde-index>
```

---

## How Vector Similarity Search works

When pages are downloaded from Confluence they are broken up into chuncks and each chunck is turned into a vector using OpenAI's embedding API.  These vectors are store in a vector database (Pinecone).

When you type a question into chat, we use the embedding API again to turn your question into a vector.  We can then perform a query using `MemoryVectorStore.similaritySearch` which will return all of the Confluence chunks that are near your question in vector space.

This context is then added to the question that gets sent as the prompt to ChatGPT.

## To Run From Source

1. Clone the repo:

  ``` cmd
  git clone https://github.com/jonfleming/PersonalAI
  ```

2. Copy and edit sample.env

  ``` cmd
  copy PersonalAI\electron-app\sample.env PersonalAI\electron-app\.env
  ```

> Edit `PersonalAI\electron-app\.env` and put in you API keys

3. Run the React frontend:

  ``` cmd
  cd PersonalAI\react-app
  npm install
  npm start
  ```

4. Run the Electron app (in a separate command prompt):

  ``` cmd
  cd PersonalAI\electron-app
  npm install
  npm start
  ```

This should open your browser to log into Azure.
