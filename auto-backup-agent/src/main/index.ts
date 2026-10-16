import { app, shell, BrowserWindow, ipcMain, screen, dialog } from 'electron'
import fs from 'fs'
import { exec } from 'child_process'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'

import { setupTray, updateTrayMenu } from './tray'
import { setupDeviceWatcher, matchesBackupRule } from './device-watcher'
import { startBackup } from './backup-engine'
import { getRules, addRule, updateRule, deleteRule } from './store'

let mainWindow: BrowserWindow | null = null
let promptWindow: BrowserWindow | null = null
let isQuitting = false

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    // We only show it automatically in dev or if the tray is clicked
    if (is.dev) mainWindow!.show()
  })

  // Keep it hidden on close to just run in background
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault()
      mainWindow!.hide()
    }
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function triggerBackup(deviceName: string) {
  if (promptWindow) promptWindow.close()
  if (mainWindow) {
    mainWindow.show()
    mainWindow.webContents.send('backup-progress', { status: 'running', deviceName }) // initial pulse
  }
  
  startBackup(deviceName, (progress) => {
    if (mainWindow) {
      mainWindow.webContents.send('backup-progress', progress)
    }
    if (progress.status === 'completed') {
      const rules = getRules()
      const rule = rules.find(r => r.id === progress.ruleId)
      if (rule && rule.postBackupScript) {
        createPromptWindow(deviceName, 'post-script')
      }
    }
  })
}

function createPromptWindow(deviceName: string, mode: 'backup' | 'post-script' = 'backup'): void {
  if (promptWindow) {
    promptWindow.close()
  }

  const { width: screenW, height: screenH } = screen.getPrimaryDisplay().workAreaSize
  const w = 400
  const h = 250

  promptWindow = new BrowserWindow({
    width: w,
    height: h,
    x: screenW - w - 20,
    y: screenH - h - 20,
    show: false,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  promptWindow.on('ready-to-show', () => {
    promptWindow!.show()
  })

  app.dock?.hide() // Optionally hide dock icon

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    promptWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}#prompt?mode=${mode}&device=${encodeURIComponent(deviceName)}`)
  } else {
    promptWindow.loadFile(join(__dirname, '../renderer/index.html'), { hash: `prompt?mode=${mode}&device=${encodeURIComponent(deviceName)}` })
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.backupagent')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()

  // Setup rules IPC
  ipcMain.handle('get-rules', () => getRules())
  ipcMain.handle('add-rule', (_, rule) => { addRule(rule); updateTrayMenu(); return getRules() })
  ipcMain.handle('update-rule', (_, rule) => { updateRule(rule); updateTrayMenu(); return getRules() })
  ipcMain.handle('delete-rule', (_, id) => { deleteRule(id); updateTrayMenu(); return getRules() })

  // Drive & UI interactions
  ipcMain.handle('get-connected-drives', () => {
    try {
      return fs.readdirSync('/Volumes').filter(name => !name.startsWith('.'))
    } catch (e) {
      return []
    }
  })

  ipcMain.handle('select-folder', async (_, defaultPath) => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openDirectory', 'createDirectory'],
      defaultPath
    })
    return result.canceled ? null : result.filePaths[0]
  })

  // Trigger from Prompt UI
  ipcMain.handle('start-backup', (_, deviceName) => {
    triggerBackup(deviceName)
  })

  ipcMain.handle('cancel-backup-prompt', () => {
    if (promptWindow) promptWindow.close()
  })

  ipcMain.handle('execute-post-script', (_, deviceName) => {
    if (promptWindow) promptWindow.close()
    
    // get rules matching deviceName and having postBackupScript
    const rules = getRules()
    const rule = rules.find(r => r.enabled && r.sourceName === deviceName && r.postBackupScript)
    if (rule && rule.postBackupScript) {
      const script = rule.postBackupScript.replace(/{destination}/g, rule.destinationPath)
      
      console.log(`Executing post-backup script: ${script}`)
      exec(script, (error, stdout, stderr) => {
        if (error) {
           console.error(`Script error: ${error.message}`)
        }
        if (stdout) console.log(`Script output: ${stdout}`)
        if (stderr) console.error(`Script stderr: ${stderr}`)
      })
    }
  })

  ipcMain.handle('cancel-post-script', () => {
    if (promptWindow) promptWindow.close()
  })

  // Watch for drives
  setupDeviceWatcher((deviceName) => {
    if (matchesBackupRule(deviceName)) {
      createPromptWindow(deviceName)
    }
  })

  // System tray
  setupTray(mainWindow!, (deviceName) => {
    triggerBackup(deviceName)
  })

  app.on('activate', function () {
    if (!mainWindow) createWindow()
    else mainWindow.show()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Set quit flag when app actually quits (so close event works properly for hiding)
app.on('before-quit', () => {
  isQuitting = true
})
