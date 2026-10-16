import { useState, useEffect } from 'react'

export default function RulesEditor() {
  const [rules, setRules] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [progressDetails, setProgressDetails] = useState<Record<string, any>>({})
  
  const [drives, setDrives] = useState<string[]>([])
  const [formState, setFormState] = useState({
    sourceName: '',
    sourcePath: '',
    destinationPath: '',
    deleteAfterBackup: false,
    postBackupScript: ''
  })

  const loadRules = async () => {
    setLoading(true)
    const data = await window.api.getRules()
    setRules(data)
    setLoading(false)
  }

  const loadDrives = async () => {
    const list = await window.api.getConnectedDrives()
    setDrives(list)
    if (list.length > 0) {
      setFormState(f => ({ ...f, sourceName: list[0] }))
    }
  }

  useEffect(() => {
    loadRules()
    loadDrives()
    
    window.api.onBackupProgress((progress) => {
      if (progress.ruleId) {
        setProgressDetails(prev => ({
          ...prev,
          [progress.ruleId]: progress
        }))
      }
    })
  }, [])

  const handleAddParams = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    
    if (!formState.sourceName || !formState.destinationPath) {
      alert("Source Name and Destination Path are required.")
      return
    }

    const newRule = {
      id: crypto.randomUUID(),
      sourceName: formState.sourceName,
      sourcePath: formState.sourcePath || '',
      destinationPath: formState.destinationPath,
      enabled: true,
      deleteAfterBackup: formState.deleteAfterBackup,
      postBackupScript: formState.postBackupScript
    }

    const updated = await window.api.addRule(newRule)
    setRules(updated)
    setFormState(f => ({ ...f, sourcePath: '', destinationPath: '', deleteAfterBackup: false, postBackupScript: '' }))
  }

  const handleBrowseSource = async () => {
    if (!formState.sourceName) return alert('Select a drive first')
    const defaultPath = `/Volumes/${formState.sourceName}`
    const result = await window.api.selectFolder(defaultPath)
    if (result) {
      if (result.startsWith(defaultPath)) {
        let relative = result.substring(defaultPath.length)
        if (relative.startsWith('/')) relative = relative.substring(1)
        setFormState(prev => ({ ...prev, sourcePath: relative }))
      } else {
        alert("Selected folder is not inside the chosen Drive!")
      }
    }
  }

  const handleBrowseDest = async () => {
    const result = await window.api.selectFolder()
    if (result) {
      setFormState(prev => ({ ...prev, destinationPath: result }))
    }
  }

  const handleDelete = async (id: string) => {
    const updated = await window.api.deleteRule(id)
    setRules(updated)
  }

  const toggleStatus = async (rule: any) => {
    const updated = await window.api.updateRule({ ...rule, enabled: !rule.enabled })
    setRules(updated)
  }

  const toggleDelete = async (rule: any) => {
    const updated = await window.api.updateRule({ ...rule, deleteAfterBackup: !rule.deleteAfterBackup })
    setRules(updated)
  }

  return (
    <div className="bg-slate-800/50 backdrop-blur rounded-2xl border border-slate-700 p-8 shadow-xl">
      <h2 className="text-2xl font-semibold mb-6">Backup Rules (De-Para)</h2>
      
      <div className="grid grid-cols-1 gap-6 mb-8">
        {loading ? (
          <p className="text-slate-400">Loading rules...</p>
        ) : rules.length === 0 ? (
          <div className="bg-slate-800 p-8 rounded-xl text-center border-dashed border-2 border-slate-700 text-slate-400">
            No rules configured. Add one below.
          </div>
        ) : (
          rules.map(rule => {
            const prog = progressDetails[rule.id]
            const isRunning = prog?.status === 'running'
            const percentage = prog?.totalFiles > 0 ? Math.round((prog.filesCopied / prog.totalFiles) * 100) : 0

            return (
            <div key={rule.id} className="bg-slate-800 p-5 rounded-xl border border-slate-700 flex flex-col gap-4 group hover:border-blue-500/30 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-3 h-3 rounded-full ${rule.enabled ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-slate-600'}`}></div>
                    <h3 className="font-semibold text-lg">{rule.sourceName}</h3>
                    {rule.deleteAfterBackup && (
                      <span className="text-[10px] uppercase font-bold bg-amber-500/20 text-amber-500 px-2 rounded-full ring-1 ring-amber-500/50">Move</span>
                    )}
                    {rule.postBackupScript && (
                      <span className="text-[10px] uppercase font-bold bg-purple-500/20 text-purple-400 px-2 rounded-full ring-1 ring-purple-500/50">Python Script</span>
                    )}
                  </div>
                  <div className="text-sm text-slate-400 flex items-center gap-2">
                    <span className="bg-slate-700 px-2 py-1 rounded">/{rule.sourcePath || '.'}</span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-arrow-right"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                    <span className="bg-slate-700 px-2 py-1 rounded text-blue-300 font-mono text-xs">{rule.destinationPath}</span>
                  </div>
                </div>

                <div className="flex gap-2 items-center">
                  <button 
                    onClick={() => toggleDelete(rule)}
                    title="Toggle 'Delete files after backup'"
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold focus:outline-none transition-all ${rule.deleteAfterBackup ? 'bg-amber-500/20 text-amber-500 hover:bg-amber-500/30 ring-1 ring-amber-500/50' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 border border-slate-700'}`}
                  >
                    {rule.deleteAfterBackup ? 'MOVING' : 'COPYING'}
                  </button>
                  <button 
                    onClick={() => window.api.startBackup(rule.sourceName)}
                    disabled={isRunning || !rule.enabled}
                    className="px-3 py-1.5 rounded-md text-sm font-medium bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 transition-colors disabled:opacity-50 flex items-center gap-1 ml-2"
                  >
                    {isRunning ? 'Running...' : 'Run'}
                  </button>
                  <button 
                    onClick={() => toggleStatus(rule)}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${rule.enabled ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-green-600/20 text-green-400 hover:bg-green-600/30'}`}
                  >
                    {rule.enabled ? 'Disable' : 'Enable'}
                  </button>
                  <button 
                    onClick={() => handleDelete(rule.id)}
                    className="px-3 py-1.5 rounded-md text-sm font-medium bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {(isRunning || prog?.status === 'completed') && (
                <div className="w-full bg-slate-900/50 rounded-lg p-3 border border-slate-700/50 mt-1">
                  <div className="flex justify-between text-xs text-slate-400 mb-2">
                    <span>{prog?.status === 'completed' ? 'Backup Complete' : `Copying files... (${prog.filesCopied}/${prog.totalFiles})`}</span>
                    <span className="font-mono text-blue-400 font-bold">{percentage}%</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div className={`h-1.5 rounded-full transition-all duration-300 ${prog?.status === 'completed' ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${percentage}%` }}></div>
                  </div>
                </div>
              )}
            </div>
          )}
        )
        )}
      </div>

      <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800">
        <h3 className="text-lg font-medium mb-4 text-blue-400 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-plus-circle"><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/><path d="M12 8v8"/></svg>
          Add New Rule
        </h3>
        
        <form onSubmit={handleAddParams} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs uppercase tracking-wider text-slate-400 font-semibold mb-1 flex justify-between">
              Drive Name
              <button type="button" onClick={loadDrives} className="text-blue-400 hover:text-blue-300">Refresh</button>
            </label>
            <select
              required
              value={formState.sourceName}
              onChange={e => setFormState(f => ({ ...f, sourceName: e.target.value }))}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
            >
              <option value="" disabled>Select connected drive</option>
              {drives.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider text-slate-400 font-semibold mb-1">Internal Path (optional)</label>
            <div className="flex gap-2">
              <input 
                value={formState.sourcePath}
                onChange={e => setFormState(f => ({ ...f, sourcePath: e.target.value }))}
                type="text" 
                placeholder="Ex: DCIM" 
                className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-600" 
              />
              <button type="button" onClick={handleBrowseSource} className="bg-slate-700 hover:bg-slate-600 px-4 rounded-lg font-medium transition-colors border border-slate-600">Browse</button>
            </div>
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs uppercase tracking-wider text-slate-400 font-semibold mb-1">Destination Path</label>
            <div className="flex gap-2">
              <input 
                required
                value={formState.destinationPath}
                onChange={e => setFormState(f => ({ ...f, destinationPath: e.target.value }))}
                type="text" 
                placeholder="/Users/francisco/Documents/Backups" 
                className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-600 font-mono text-sm" 
              />
              <button type="button" onClick={handleBrowseDest} className="bg-slate-700 hover:bg-slate-600 px-4 rounded-lg font-medium transition-colors border border-slate-600">Browse</button>
            </div>
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs uppercase tracking-wider text-slate-400 font-semibold mb-1">Post-Backup Script (optional)</label>
            <input 
              value={formState.postBackupScript}
              onChange={e => setFormState(f => ({ ...f, postBackupScript: e.target.value }))}
              type="text" 
              placeholder="python process.py {destination}" 
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-600 font-mono text-sm" 
            />
            <p className="text-xs text-slate-500 mt-1">Use <code className="text-blue-400">{`{destination}`}</code> to inject the final backup path.</p>
          </div>
          <div className="md:col-span-2 pt-2">
            <label className="flex items-center gap-3 cursor-pointer group mb-4">
              <input 
                type="checkbox" 
                checked={formState.deleteAfterBackup}
                onChange={e => setFormState(f => ({ ...f, deleteAfterBackup: e.target.checked }))}
                className="w-5 h-5 bg-slate-800 border border-slate-700 rounded text-blue-500 focus:ring-blue-500/50 focus:ring-offset-slate-900 cursor-pointer"
              />
              <div>
                <span className="block text-sm font-semibold text-slate-200 group-hover:text-blue-400 transition-colors">Move Files (Delete Source after Backup)</span>
                <span className="block text-xs text-slate-500 mt-0.5">Warning: This will permanently delete the original files from the SD Card/Drive once successfully copied.</span>
              </div>
            </label>
            <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-lg shadow-lg shadow-blue-500/30 transition-all font-medium flex items-center gap-2">
              Save Rule
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
