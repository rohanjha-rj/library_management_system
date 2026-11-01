const esbuild = require('esbuild')

const isDev = process.argv.includes('--dev')

esbuild.build({
  entryPoints: ['electron/main.ts', 'electron/preload.ts'],
  outdir: 'dist/main',
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  external: ['electron', 'better-sqlite3', 'bcryptjs', 'oracledb'],
  sourcemap: isDev,
  minify: false,
  tsconfig: './tsconfig.electron.json',
  define: {
    'process.env.NODE_ENV': isDev ? '"development"' : '"production"'
  }
}).catch(() => process.exit(1))
