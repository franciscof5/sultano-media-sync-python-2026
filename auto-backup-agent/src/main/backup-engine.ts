import { getRules } from './store'
import fs from 'fs'
import path from 'path'

export interface BackupProgress {
  ruleId: string
  status: 'running' | 'completed' | 'error'
  filesCopied: number
  totalFiles: number
  error?: string
}

const activeBackups = new Map<string, BackupProgress>()

export async function startBackup(deviceName: string, onProgress: (progress: BackupProgress) => void) {
  const rules = getRules()
  
  // Find rule matching the device name
  const matchedRules = rules.filter((rule) => rule.enabled && rule.sourceName === deviceName)

  // Start processing each rule (though usually it's one per device)
  for (const rule of matchedRules) {
    const sourcePathFullPath = path.join('/Volumes', deviceName, rule.sourcePath)
    const destinationFullPath = rule.destinationPath

    const progress: BackupProgress = {
      ruleId: rule.id,
      status: 'running',
      filesCopied: 0,
      totalFiles: 0
    }
    
    activeBackups.set(rule.id, progress)
    onProgress({ ...progress })

    try {
      if (!fs.existsSync(sourcePathFullPath)) {
        throw new Error(`Source path inside device does not exist: ${sourcePathFullPath}`)
      }
      
      if (!fs.existsSync(destinationFullPath)) {
        fs.mkdirSync(destinationFullPath, { recursive: true })
      }

      await copyDirectory(sourcePathFullPath, destinationFullPath, rule.deleteAfterBackup || false, (c, t) => {
        progress.filesCopied = c
        progress.totalFiles = t
        onProgress({ ...progress })
      })

      progress.status = 'completed'
      onProgress({ ...progress })
    } catch (err: any) {
      progress.status = 'error'
      progress.error = err?.message || 'Unknown error'
      onProgress({ ...progress })
    }
  }
}

async function copyDirectory(src: string, dest: string, deleteAfterBackup: boolean, reportProgress: (c: number, t: number) => void) {
  // Simple recursive directory copy for Node >= 16.7 fs.cp is available
  // To get progress we can just use promises and naive counting
  let totalFiles = 0
  let copiedFiles = 0

  async function countFiles(dir: string): Promise<number> {
    let count = 0
    const items = await fs.promises.readdir(dir, { withFileTypes: true })
    for (const item of items) {
      if (item.isDirectory()) {
         count += await countFiles(path.join(dir, item.name))
      } else {
         count++
      }
    }
    return count
  }

  totalFiles = await countFiles(src)
  reportProgress(copiedFiles, totalFiles)

  async function doCopy(srcDir: string, destDir: string) {
    await fs.promises.mkdir(destDir, { recursive: true })
    const items = await fs.promises.readdir(srcDir, { withFileTypes: true })
    for (const item of items) {
      const srcItem = path.join(srcDir, item.name)
      const destItem = path.join(destDir, item.name)
      
      if (item.isDirectory()) {
        await doCopy(srcItem, destItem)
        if (deleteAfterBackup) {
          try { await fs.promises.rmdir(srcItem) } catch (e) {} // ignore if not empty
        }
      } else {
        // Skip if destination file exists
        if (!fs.existsSync(destItem)) {
           await fs.promises.cp(srcItem, destItem, { preserveTimestamps: true })
        }
        
        if (deleteAfterBackup) {
           await fs.promises.unlink(srcItem)
        }

        copiedFiles++
        reportProgress(copiedFiles, totalFiles)
      }
    }
  }

  await doCopy(src, dest)
}
