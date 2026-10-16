import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  getRules: () => ipcRenderer.invoke('get-rules'),
  addRule: (rule: any) => ipcRenderer.invoke('add-rule', rule),
  updateRule: (rule: any) => ipcRenderer.invoke('update-rule', rule),
  deleteRule: (id: string) => ipcRenderer.invoke('delete-rule', id),
  startBackup: (deviceName: string) => ipcRenderer.invoke('start-backup', deviceName),
  cancelBackupPrompt: () => ipcRenderer.invoke('cancel-backup-prompt'),
  getConnectedDrives: () => ipcRenderer.invoke('get-connected-drives'),
  selectFolder: (defaultPath?: string) => ipcRenderer.invoke('select-folder', defaultPath),
  cancelPostScript: () => ipcRenderer.invoke('cancel-post-script'),
  executePostScript: (deviceName: string) => ipcRenderer.invoke('execute-post-script', deviceName),
  onBackupProgress: (callback: (progress: any) => void) => {
    ipcRenderer.on('backup-progress', (_event, value) => callback(value))
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
