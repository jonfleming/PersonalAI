const { app, BrowserWindow, dialog, ipcMain } = require("electron")
const path = require('path')
const fs = require('fs');

function handleSetTitle(event, title) {
  const webContents = event.sender
  const win = BrowserWindow.fromWebContents(webContents)
  win.setTitle(title)
}

function handleChat(prompt) {
  return { prompt, completion: "Good question."}
}

function getFilenames (directoryPath) {
  let result = [];

  const items = fs.readdirSync(directoryPath);

  for (let item of items) {
      let fullPath = path.join(directoryPath, item);
      let stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
          result.push({
              name: item,
              path: fullPath,
              type: 'directory',
              children: getFilenames(fullPath)
          });
      } else {
          result.push({
              name: item,
              path: fullPath,
              type: 'file'
          });
      }
  }

  return result;
}

const createWindow = () => {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  })
  
  if(!process.defaultApp) {
    console.log('PAI: packaged')
    win.loadFile('index.html'); // prod
  } else {
    console.log('PAI: dev')
    win.loadURL('http://localhost:3000'); // dev
  }

  return win
}

app.whenReady().then(() => {
  const mainWindow = createWindow();
  // mainWindow.webContents.openDevTools()
  ipcMain.on('set-title', handleSetTitle)
  ipcMain.on('dialog:openFolder', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({ properties: ['openDirectory']})
    if (!canceled) {
      mainWindow.webContents.send('dialog:reply', filePaths[0])

      const files = getFilenames(filePaths[0])
      mainWindow.webContents.send('dialog:filelist', files)
    }      
  })

  ipcMain.on('chat:completion', async (_, prompt) => {
    const response = handleChat(prompt)
    mainWindow.webContents.send('chat:response', response)
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })  
})
.catch(err => console.log(err));

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit()
})

