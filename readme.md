# Personal AI

Confluence-GPT is a project I created for getting answers from our Confluence pages using a chat interface.  The project has a few parts:

An app that uses the Atlassian API to read the content of Confluence pages.

A LangChain loader that parses the pages and generates an in-memory vector store of the text embeddings from the Confluence content.

A Chat UI that lets you ask questions about the indexed content.

---
## Screenshot

![Screenshot](https://github.com/jonfleming/PersonalAI/raw/main/screenshot.png)

## Technology Stack
Electron - 