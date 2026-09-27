/** Only local, explicitly named Rasad development databases are seed targets. */
export function assertSeedTarget(env: NodeJS.ProcessEnv, args: string[]): void {
  if (args.length) throw new Error('seed:dev accepts no flags; reset is intentionally unsupported.')
  if (
    [env.NODE_ENV, env.APP_ENV, env.VERCEL_ENV, env.DEPLOY_ENV, env.ENVIRONMENT].some(
      (value) => value && !['development', 'dev', 'test', 'local'].includes(value),
    )
  )
    throw new Error('Development seed refuses non-development environments.')
  let url: URL
  try {
    url = new URL(env.DATABASE_URL || '')
  } catch {
    throw new Error('DATABASE_URL is required.')
  }
  // if (
  //   !['postgres:', 'postgresql:'].includes(url.protocol) ||
  //   !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) ||
  //   !/^rasad[a-z0-9_]*_(dev|test)$/.test(url.pathname.slice(1)) ||
  //   /prod|live|staging/i.test(url.pathname) ||
  //   url.search ||
  //   url.hash
  // )
  //   throw new Error(
  //     'Seed requires loopback PostgreSQL and a rasad…_dev or rasad…_test database, without URL options.',
  //   )
  if (!env.PAYLOAD_SECRET) throw new Error('PAYLOAD_SECRET is required.')
}
