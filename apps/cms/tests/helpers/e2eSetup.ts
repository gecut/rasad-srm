import { execFileSync } from 'node:child_process'
export default function setup() {
  execFileSync(process.execPath, ['--import', 'tsx', 'scripts/seed-e2e.ts'], {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'inherit',
  })
}
