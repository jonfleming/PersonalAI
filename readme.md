# Personal AI

Confluence-GPT was a project I created for getting answers from our Confluence pages using a chat interface.  The project had a few parts:

An app that uses the Atlassian API to read the content of Confluence pages.

A LangChain loader that parses the pages and generates an in-memory vector store of the text embeddings from the Confluence content.

A Chat UI that lets you ask questions about the indexed content.

These 3 separate apps have been combined into an installable Electron app I call __Personal AI__.

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

CONFLUENCE_USER=\<your-confluence-user-name\>

CONFLUENCE_TOKEN=\<your-confluence-api-token\>

CONFLUENCE_UR=https://mcghealth.atlassian.net/wiki

How to get your Confluence API Token [https://support.atlassian.com/atlassian-account/docs/manage-api-tokens-for-your-atlassian-account/](https://support.atlassian.com/atlassian-account/docs/manage-api-tokens-for-your-atlassian-account/)

## OpenAI API Access

OPENAI_API_KEY=\<your-openai-api-key\>

How to get you OpenAI API Key [https://platform.openai.com/account/api-keys](https://platform.openai.com/account/api-keys)

---

## How Vector Similarity Search works

When pages are downloaded from Confluence they are broken up into chuncks and each chunck is turned into a vector using OpenAI's embedding API.  These vectors are store in a vector database (in this case it is actually an in-memory LangChain [MemoryVectorStore](https://js.langchain.com/docs/modules/indexes/vector_stores/integrations/memory)).

When you type a question into chat, we use the embedding API again to turn your question into a vector.  We can then perform a query using `MemoryVectorStore.similaritySearch` which will return all of the Confluence chunks that are near your question in vector space.

