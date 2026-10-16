import { useState, useEffect } from 'react'

export default function PromptWindow({ deviceName, mode = 'backup' }: { deviceName: string, mode?: 'backup' | 'post-script' }) {
  const [timeLeft, setTimeLeft] = useState(10)
  const [isExecuting, setIsExecuting] = useState(false)

  useEffect(() => {
    document.body.style.backgroundColor = 'transparent'
    document.getElementById('root')!.style.backgroundColor = 'transparent'
  }, [])

  useEffect(() => {
    if (isExecuting) return

    if (timeLeft <= 0) {
      handleStart()
      return
    }

    const timerId = setInterval(() => {
      setTimeLeft(t => t - 1)
    }, 1000)

    return () => clearInterval(timerId)
  }, [timeLeft, isExecuting])

  const handleStart = () => {
    setIsExecuting(true)
    if (mode === 'post-script') {
      window.api.executePostScript(deviceName)
    } else {
      window.api.startBackup(deviceName)
    }
  }

  const handleCancel = () => {
    setIsExecuting(true)
    if (mode === 'post-script') {
      window.api.cancelPostScript()
    } else {
      window.api.cancelBackupPrompt()
    }
  }

  return (
    <div className="flex h-screen items-center justify-center p-4 select-none" style={{ WebkitAppRegion: 'drag' } as any}>
      <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-700 shadow-2xl overflow-hidden w-full h-full flex flex-col items-center justify-center p-6 text-center shadow-blue-900/20" style={{ WebkitAppRegion: 'no-drag' } as any}>
        
        <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 mb-4 animate-pulse">
          {mode === 'post-script' ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-terminal"><polyline points="4 17 10 11 4 5"/><line x1="12" x2="20" y1="19" y2="19"/></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-sd-card"><path d="M4 11V5a2 2 0 0 1 2-2h8.5L20 8.5V19a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-3"/><path d="M9 5v4"/><path d="M13 5v4"/><path d="M17 5v3"/></svg>
          )}
        </div>
        
        <h2 className="text-xl font-bold text-slate-100 uppercase tracking-wider mb-2">{deviceName}</h2>
        <div className="text-sm text-slate-300 mb-6 font-medium">
          {mode === 'post-script' 
             ? <span>Backup Complete. Running Post-Script in <span className="font-mono text-lg font-bold text-purple-400">{timeLeft}s</span>...</span>
             : <span>Device detected. Starting backup in <span className="font-mono text-lg font-bold text-blue-400">{timeLeft}s</span>...</span>}
        </div>

        <div className="flex gap-4 w-full px-4">
          <button 
            onClick={handleCancel}
            className="flex-1 py-2 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700 font-medium"
          >
            Cancel
          </button>
          <button 
            onClick={handleStart}
            className="flex-1 py-2 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium shadow-lg shadow-blue-500/30 transition-all"
          >
            {mode === 'post-script' ? 'Run Now' : 'Backup Now'}
          </button>
        </div>
      </div>
    </div>
  )
}
