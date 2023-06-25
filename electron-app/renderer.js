const titleInput = document.getElementById('title')
const fileButton = document.getElementById('file-btn')

const filePathElement = document.getElementById('filePath')

fileButton.addEventListener('click', async () => {
  const filePath = await window.electronAPI.openFile()
  filePathElement.innerText = filePath
  
})
