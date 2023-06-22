const { app, BrowserWindow, dialog, ipcMain } = require("electron")
const path = require('path')

function handleSetTitle (event, title) {
  const webContents = event.sender
  const win = BrowserWindow.fromWebContents(webContents)
  win.setTitle(title)
}

async function handleOpenFolder (event) {
  const { canceled, filePaths } = await dialog.showOpenDialog({ properties: ['openDirectory']})
  if (!canceled) {

    event.reply('dialog:reply', filePaths[0])
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
  
  if(app.isPackaged) {
    win.loadFile('index.html'); // prod
  } else {
    win.loadURL('http://localhost:3000'); // dev
  }
  return win
}

app.whenReady().then(() => {
  const mainWindow = createWindow();
  mainWindow.webContents.openDevTools()
  ipcMain.on('set-title', handleSetTitle)
  ipcMain.on('dialog:openFolder', async (event, args) => {
    const { canceled, filePaths } = await dialog.showOpenDialog({ properties: ['openDirectory']})
    if (!canceled) {
      mainWindow.webContents.send('dialog:reply', filePaths[0])
    }  
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })  
})
.catch(err => console.log(err));

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit()
})
