# Personal AI

Confluence-GPT is a project I created for getting answers from our Confluence pages using a chat interface.  The project has a few parts:

An app that uses the Atlassian API to read the content of Confluence pages.

A LangChain loader that parses the pages and generates an in-memory vector store of the text embeddings from the Confluence content.

A Chat UI that lets you ask questions about the indexed content.

---
## Screenshot

![Screenshot](https://github.com/jonfleming/PersonalAI/raw/main/screenshot.png)

## Technology Stack

[Electron](https://www.electronjs.org/) - A JavaScript framework for building cross-platform desktop applications leveraging the power of modern web technologies and libraries.

[React](https://react.dev/) - A Javascript User Interface library.

[Material UI (MUI)](https://mui.com/) - Open Source user interface framework with a broad list of UI components.

[LangChain](https://docs.langchain.com/docs/) - A framework for developing applications powered by large language models.

## Setup

You can install the latest version of Personal AI by downloading the latest setup.exe from the [releases page](https://github.com/jonfleming/PersonalAI/releases).

### Confluence Access

To make Confluence API calls you need to set a couple of environment variables.

CONFLUENCE_USER=<your-confluence-user-name>
CONFLUENCE_token=<your-confluence-api-token>

### OpenAI API Access

OPENAI_API_KEY=<your-openai-api-key>
