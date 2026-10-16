import { Tray, Menu, app, BrowserWindow, nativeImage } from 'electron'
import iconPath from '../../resources/icon.png?asset'
import { getRules } from './store'

let tray: Tray | null = null
let mainWindowRef: BrowserWindow | null = null
let onTriggerBackupRef: ((deviceName: string) => void) | null = null

export function setupTray(mainWindow: BrowserWindow, onTriggerBackup: (deviceName: string) => void) {
  if (tray) return

  mainWindowRef = mainWindow
  onTriggerBackupRef = onTriggerBackup
  
  const icon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 })
  tray = new Tray(icon)
  tray.setToolTip('Auto Backup Agent')
  
  updateTrayMenu()

  tray.on('click', () => {
    if (mainWindow && !mainWindow.isVisible()) {
      mainWindow.show()
      mainWindow.focus()
    }
  })
}

export function updateTrayMenu() {
  if (!tray) return

  const rules = getRules()
  
  const ruleItems: Electron.MenuItemConstructorOptions[] = rules.map(rule => ({
    label: `▶ Run Backup: ${rule.sourceName}`,
    enabled: rule.enabled,
    click: () => {
      if (onTriggerBackupRef) {
        onTriggerBackupRef(rule.sourceName)
      }
    }
  }))

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open Dashboard',
      click: () => {
        if (mainWindowRef) {
          mainWindowRef.show()
          mainWindowRef.focus()
        }
      }
    },
    { type: 'separator' },
    ...(ruleItems.length > 0 ? [...ruleItems, { type: 'separator' } as Electron.MenuItemConstructorOptions] : []),
    {
      label: 'Quit Auto Backup Agent',
      click: () => {
        app.quit()
      }
    }
  ])

  tray.setContextMenu(contextMenu)
}
