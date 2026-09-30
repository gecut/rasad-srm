import type { SanitizedConfig } from 'payload'
import { assertSeedTarget } from './dev-seed/safety'
import { runUnifiedSeed } from './seed'

export async function script(config: SanitizedConfig): Promise<void> {
  try {
    assertSeedTarget(process.env, process.argv.slice(3))
    // Disable background workers and SMS provider in seed run
    process.env.RUN_JOBS = 'false'
    process.env.SMS_PROVIDER = 'mock'
    process.env.SCHEMA_PUSH = 'false'

    const { getPayload } = await import('payload')
    const payload = await getPayload({ config })

    try {
      await runUnifiedSeed(payload)
    } finally {
      await payload.destroy()
    }
    process.exit(0)
  } catch (error) {
    console.error('Seed execution failed.')
    if (error instanceof Error && !/postgres(?:ql)?:\/\//i.test(error.message)) {
      console.error(error.message)
    }
    process.exit(1)
  }
}
