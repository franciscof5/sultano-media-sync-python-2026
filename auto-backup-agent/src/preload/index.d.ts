import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      getRules: () => Promise<any[]>
      addRule: (rule: any) => Promise<any[]>
      updateRule: (rule: any) => Promise<any[]>
      deleteRule: (id: string) => Promise<any[]>
      startBackup: (deviceName: string) => Promise<void>
      cancelBackupPrompt: () => Promise<void>
      getConnectedDrives: () => Promise<string[]>
      selectFolder: (defaultPath?: string) => Promise<string | null>
      cancelPostScript: () => Promise<void>
      executePostScript: (deviceName: string) => Promise<void>
      onBackupProgress: (callback: (progress: any) => void) => void
    }
  }
}
