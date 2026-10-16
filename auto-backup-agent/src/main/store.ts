import StoreModule from 'electron-store'

const Store = ((StoreModule as any).default || StoreModule) as typeof StoreModule

export interface BackupRule {
  id: string
  sourceName: string // e.g. "CAMERA_SD"
  sourcePath: string // inner path, e.g. "DCIM"
  destinationPath: string
  enabled: boolean
  deleteAfterBackup?: boolean
  postBackupScript?: string
}

export interface StoreSchema {
  rules: BackupRule[]
}

export const store = new Store<StoreSchema>({
  defaults: {
    rules: []
  }
})

export function getRules() {
  return store.get('rules') || []
}

export function saveRules(rules: BackupRule[]) {
  store.set('rules', rules)
}

export function addRule(rule: BackupRule) {
  const rules = getRules()
  rules.push(rule)
  saveRules(rules)
}

export function updateRule(updatedRule: BackupRule) {
  const rules = getRules()
  const index = rules.findIndex((r) => r.id === updatedRule.id)
  if (index !== -1) {
    rules[index] = updatedRule
    saveRules(rules)
  }
}

export function deleteRule(id: string) {
  const rules = getRules()
  saveRules(rules.filter((r) => r.id !== id))
}
