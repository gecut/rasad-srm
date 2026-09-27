import type { SanitizedConfig } from 'payload'
import { assertSeedTarget } from './dev-seed/safety'
import { accounts, password, readSeed, seedDevelopment } from './dev-seed/fixtures'

export async function script(config: SanitizedConfig): Promise<void> {
  try {
    assertSeedTarget(process.env, process.argv.slice(3))
    // The CLI loads environment/config; seed config disables schema push and workers.
    process.env.RUN_JOBS = 'false'
    process.env.SMS_PROVIDER = 'mock'
    process.env.SCHEMA_PUSH = 'false'
    const { getPayload } = await import('payload')
    const payload = await getPayload({ config })
    try {
      const result = await seedDevelopment(payload)
      const data = await readSeed(payload)
      console.log(
        result === 'created'
          ? 'Development seed created and validated.'
          : 'Seed already exists; all records and manual changes left unchanged.',
      )
      console.table(
        Object.fromEntries(Object.entries(data).map(([key, value]) => [key, value.length])),
      )
      console.table(
        accounts.map((account) => ({
          role: account.role,
          phone: account.phone,
          email: `${account.key}@seed.rasad.invalid`,
        })),
      )
      console.log(`Initial development-only password: ${password} (reruns do not reset passwords).`)
      console.log(
        'Synthetic data only. No SMS jobs or claims created. See docs/DEV_SEED.md for scenarios.',
      )
    } finally {
      await payload.destroy()
    }
    process.exit(0)
  } catch (error) {
    // Connection errors can contain credentials: never echo arbitrary errors or URLs.
    console.error(
      'Development seed failed; existing data was not reset. Check the local target, migrations and seed account collisions.',
    )
    if (error instanceof Error && !/postgres(?:ql)?:\/\//i.test(error.message))
      console.error(error.message)
    process.exit(1)
  }
}
