const { app, BrowserWindow, dialog, ipcMain } = require("electron")
const path = require('path')

function handleSetTitle (event, title) {
  const webContents = event.sender
  const win = BrowserWindow.fromWebContents(webContents)
  win.setTitle(title)
}

async function handleFileOpen () {
  const { canceled, filePaths } = await dialog.showOpenDialog({})
  if (!canceled) {
    return filePaths[0]
  }
}

const createWindow = () => {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  })
  
  win.loadFile("index.html").catch(err => {})

  return win
}

app.whenReady().then(() => {
  ipcMain.on('set-title', handleSetTitle)
  ipcMain.handle('dialog:openFile', handleFileOpen)
  const mainWindow = createWindow();
  mainWindow.webContents.openDevTools()


  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })  
})
.catch(err => console.log(err));

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit()
})
