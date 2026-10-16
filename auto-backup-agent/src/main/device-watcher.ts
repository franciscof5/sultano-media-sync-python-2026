import chokidar from 'chokidar'
import path from 'path'
import os from 'os'
import { getRules } from './store'
import fs from 'fs'

let watcher: ReturnType<typeof chokidar.watch> | null = null

export function setupDeviceWatcher(onDeviceDetected: (deviceName: string) => void) {
  if (os.platform() !== 'darwin') {
    console.warn('Device watcher only supports macOS for now (/Volumes)')
    return
  }

  const volumesPath = '/Volumes'

  // Watch for new directories added to /Volumes
  watcher = chokidar.watch(volumesPath, {
    depth: 0,
    ignoreInitial: true,
    awaitWriteFinish: false
  })

  watcher.on('addDir', (dirPath) => {
    // Only care about top-level items in /Volumes
    if (path.dirname(dirPath) === volumesPath) {
      const deviceName = path.basename(dirPath)
      
      // Wait a bit to ensure it's fully mounted
      setTimeout(() => {
        if (fs.existsSync(dirPath)) {
          console.log(`[Device Watcher] Device mounted: ${deviceName}`)
          onDeviceDetected(deviceName)
        }
      }, 500)
    }
  })

  console.log('[Device Watcher] Started watching /Volumes')
}

export function matchesBackupRule(deviceName: string) {
  const rules = getRules()
  return rules.some((rule) => rule.enabled && rule.sourceName === deviceName)
}
