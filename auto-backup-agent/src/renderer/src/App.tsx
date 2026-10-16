import { useState, useEffect } from 'react'
import RulesEditor from './components/RulesEditor'
import PromptWindow from './components/PromptWindow'

function App() {
  const [route, setRoute] = useState<string>(window.location.hash)

  useEffect(() => {
    const handleHashChange = () => setRoute(window.location.hash)
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  if (route.startsWith('#prompt')) {
    const params = new URLSearchParams(route.split('?')[1])
    const deviceName = params.get('device') || 'Unknown Device'
    const mode = params.get('mode') as 'backup' | 'post-script' || 'backup'
    return <PromptWindow deviceName={deviceName} mode={mode} />
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-50 flex flex-col items-center">
      <header className="w-full max-w-4xl p-6 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="text-blue-500 bg-blue-500/10 p-2 rounded-lg">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-hard-drive"><line x1="22" x2="2" y1="12" y2="12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/><line x1="6" x2="6.01" y1="16" y2="16"/><line x1="10" x2="10.01" y1="16" y2="16"/></svg>
          </div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
            Auto Backup Agent
          </h1>
        </div>
        <div className="text-sm text-slate-400">System Tray Active</div>
      </header>

      <main className="w-full max-w-4xl p-6 flex-1">
        <RulesEditor />
      </main>
    </div>
  )
}

export default App
