import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { fa } from '@payloadcms/translations/languages/fa'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { migrations } from './migrations'
import { panelEndpoints } from './endpoints/panel'
import { SessionCheckins } from './collections/session-checkins'
import { Users } from './collections/users'
import { Teachers } from './collections/teachers'
import { Classes } from './collections/classes'
import { Students } from './collections/students'
import { FollowUps } from './collections/follow-ups'
import { Ceremonies } from './collections/ceremonies'
import { Sessions } from './collections/sessions'
import { Invitations } from './collections/invitations'
import { InvitationClaims } from './collections/invitation-claims'
import { Neighborhoods } from './collections/neighborhoods'
import { sendSmsTask } from './domain/sms/send-sms-task'
import { configuredImportExportPlugin } from './integrations/importExport'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)
// Custom CLI seeds must not run background jobs or modify the schema.
const isDevelopmentSeed = process.argv[2]?.toLowerCase() === 'seed'

const allowedOrigins = Array.from(
  new Set(
    [
      process.env.PUBLIC_ORIGIN,
      process.env.PANEL_ORIGIN,
      'http://localhost:5173',
      'http://localhost:3000',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:3000',
    ].filter(Boolean) as string[],
  ),
)

export default buildConfig({
  bin: [{ key: 'seed', scriptPath: path.resolve(dirname, '../scripts/seed-dev.ts') }],
  cors: allowedOrigins,
  csrf: allowedOrigins,
  admin: {
    user: Users.slug,
    meta: {
      titleSuffix: '- سامانه رصد (Rasad SRM)',
      description: 'سامانه مدیریت ارتباط با فراگیران (Rasad SRM)',
    },
    importMap: {
      baseDir: path.resolve(dirname),
    },
    dateFormat: 'yyyy/MM/dd',
  },
  i18n: {
    supportedLanguages: {
      fa,
    },
  },
  collections: [
    Users,
    Teachers,
    Classes,
    Students,
    FollowUps,
    Ceremonies,
    Sessions,
    Invitations,
    InvitationClaims,
    SessionCheckins,
    Neighborhoods,
  ],
  endpoints: panelEndpoints,
  jobs: {
    tasks: [sendSmsTask],
    autoRun:
      !isDevelopmentSeed && process.env.RUN_JOBS === 'true'
        ? [{ cron: '* * * * *', limit: 20 }]
        : [],
  },
  editor: lexicalEditor(),
  secret:
    process.env.PAYLOAD_SECRET ||
    (() => {
      throw new Error('PAYLOAD_SECRET is required')
    })(),
  typescript: {
    declare: false,
    outputFile: path.resolve(dirname, '../../../packages/contracts/src/payload-types.ts'),
  },
  db: postgresAdapter({
    push:
      !isDevelopmentSeed &&
      process.env.SCHEMA_PUSH === 'true' &&
      process.env.NODE_ENV !== 'production',
    migrationDir: path.resolve(dirname, 'migrations'),
    prodMigrations: migrations,
    pool: {
      connectionString:
        process.env.DATABASE_URL ||
        (() => {
          throw new Error('DATABASE_URL is required')
        })(),
    },
  }),
  sharp,
  plugins: [configuredImportExportPlugin],
})
