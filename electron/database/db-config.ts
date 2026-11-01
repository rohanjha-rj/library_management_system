import path from 'path'
import fs from 'fs'
import { app } from 'electron'

export interface DatabaseConfig {
  dbType: 'oracle' | 'sqlite'
  oracle: {
    user: string
    password: string
    connectString: string
    poolMin: number
    poolMax: number
  }
}

const DEFAULT_CONFIG: DatabaseConfig = {
  dbType: (process.env.DB_TYPE as any) || 'sqlite',
  oracle: {
    user: process.env.ORACLE_USER || 'LIBRARY',
    password: process.env.ORACLE_PASSWORD || 'library123',
    connectString: process.env.ORACLE_CONNECT || 'localhost:1521/XEPDB1',
    poolMin: 2,
    poolMax: 10,
  }
}

export function loadDbConfig(): DatabaseConfig {
  try {
    const configPath = getConfigFilePath()
    if (fs.existsSync(configPath)) {
      const content = fs.readFileSync(configPath, 'utf-8')
      const parsed = JSON.parse(content)
      return {
        ...DEFAULT_CONFIG,
        ...parsed,
        oracle: {
          ...DEFAULT_CONFIG.oracle,
          ...(parsed.oracle || {})
        }
      }
    }
  } catch (err) {
    console.error('Could not read db-config.json, using defaults:', err)
  }
  return DEFAULT_CONFIG
}

export function saveDbConfig(config: Partial<DatabaseConfig>): void {
  try {
    const configPath = getConfigFilePath()
    const current = loadDbConfig()
    const updated = {
      ...current,
      ...config,
      oracle: {
        ...current.oracle,
        ...(config.oracle || {})
      }
    }
    fs.writeFileSync(configPath, JSON.stringify(updated, null, 2), 'utf-8')
  } catch (err) {
    console.error('Failed to save db-config.json:', err)
  }
}

export function getConfigFilePath(): string {
  const baseDir = app ? app.getPath('userData') : process.cwd()
  return path.join(baseDir, 'db-config.json')
}

