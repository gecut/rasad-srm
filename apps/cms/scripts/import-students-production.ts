import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.resolve(__dirname, '../.env') })

import type { Where } from 'payload'
import { getPayload, createLocalReq } from 'payload'
import { HISTORICAL_CEREMONIES } from './seed-historical-events-and-neighborhoods'

interface StudentImportRow {
  firstName: string
  lastName: string
  origin?: 'import'
  readinessStatus?: 'normal' | 'waitlisted'
  lifecycleStatus?: 'unknown' | 'class_seeker' | 'referred_to_teacher' | 'absorbed' | 'stabilized' | 'removed'
  grade?: number | null
  mobile?: string | null
  fatherMobile?: string | null
  motherMobile?: string | null
  landline?: string | null
  neighborhood?: string | null
  address?: string | null
  referrer?: string | null
  notes?: string[] | string | null
  ceremonies?: Record<string, string>
}

async function runImport() {
  const isDryRun = process.argv.includes('--dry-run')
  const jsonPath = path.resolve(__dirname, '../data/import/students_unified_full.json')

  if (!fs.existsSync(jsonPath)) {
    console.error(`File not found: ${jsonPath}`)
    process.exit(1)
  }

  const rawData = fs.readFileSync(jsonPath, 'utf-8')
  const studentsToImport: StudentImportRow[] = JSON.parse(rawData)

  console.log(`====================================================`)
  console.log(`  Rasad SRM v2 — Production Student Import Pipeline`)
  console.log(`====================================================`)
  console.log(`Mode: ${isDryRun ? 'DRY-RUN (No changes will be saved)' : 'LIVE IMPORT'}`)
  console.log(`Source file: ${jsonPath}`)
  console.log(`Total records in source: ${studentsToImport.length}`)
  console.log(`----------------------------------------------------`)

  const { default: config } = await import('../src/payload.config')
  const payload = await getPayload({ config })
  const req = await createLocalReq({}, payload)

  let createdStudentsCount = 0
  let skippedStudentsCount = 0
  let createdCheckinsCount = 0
  let errorCount = 0
  const errors: { name: string; error: string }[] = []

  try {
    // 1. Pre-load Neighborhoods Map (name -> id)
    console.log(`1. Pre-loading Neighborhoods dictionary...`)
    const neighborhoodsRes = await payload.find({
      collection: 'neighborhoods',
      limit: 500,
      depth: 0,
      req,
      overrideAccess: true,
    })
    const neighborhoodMap = new Map<string, number>()
    for (const doc of neighborhoodsRes.docs) {
      neighborhoodMap.set(doc.name.trim(), doc.id)
    }
    console.log(`   Loaded ${neighborhoodMap.size} neighborhoods into memory.`)

    // 2. Pre-load Historical Ceremonies and Archival Sessions
    console.log(`2. Pre-loading Historical Ceremony Sessions...`)
    const ceremonySessionMap = new Map<string, number>()
    for (const hc of HISTORICAL_CEREMONIES) {
      const ceremony = await payload.find({
        collection: 'ceremonies',
        where: { title: { equals: hc.title } },
        limit: 1,
        depth: 0,
        req,
        overrideAccess: true,
      })

      if (ceremony.totalDocs > 0) {
        const ceremonyId = ceremony.docs[0].id
        const session = await payload.find({
          collection: 'sessions',
          where: { ceremony: { equals: ceremonyId } },
          limit: 1,
          depth: 0,
          req,
          overrideAccess: true,
        })
        if (session.totalDocs > 0) {
          ceremonySessionMap.set(hc.key, session.docs[0].id)
        }
      }
    }
    console.log(`   Loaded ${ceremonySessionMap.size} historical ceremony sessions.`)

    // 3. Find default system/admin user for check-in records
    const adminUserRes = await payload.find({
      collection: 'users',
      where: { role: { equals: 'admin' } },
      limit: 1,
      depth: 0,
      req,
      overrideAccess: true,
    })
    const systemAdminId = adminUserRes.totalDocs > 0 ? adminUserRes.docs[0].id : 1

    console.log(`3. Processing students batch...`)
    for (let i = 0; i < studentsToImport.length; i++) {
      const raw = studentsToImport[i]

      // Format notes
      let formattedNotes: string | null = null
      if (Array.isArray(raw.notes) && raw.notes.length > 0) {
        formattedNotes = raw.notes.filter(Boolean).join('\n')
      } else if (typeof raw.notes === 'string' && raw.notes.trim() !== '') {
        formattedNotes = raw.notes.trim()
      }

      // Resolve neighborhood ID
      let neighborhoodId: number | null = null
      if (raw.neighborhood && raw.neighborhood.trim() !== '') {
        const trimmedNeighborhood = raw.neighborhood.trim()
        neighborhoodId = neighborhoodMap.get(trimmedNeighborhood) || null
      }

      // Check existing student
      const phoneConditions: Where[] = []
      if (raw.mobile && raw.mobile.trim()) phoneConditions.push({ mobile: { equals: raw.mobile.trim() } })
      if (raw.fatherMobile && raw.fatherMobile.trim())
        phoneConditions.push({ fatherMobile: { equals: raw.fatherMobile.trim() } })
      if (raw.motherMobile && raw.motherMobile.trim())
        phoneConditions.push({ motherMobile: { equals: raw.motherMobile.trim() } })

      let existing = null

      if (phoneConditions.length > 0) {
        const queryRes = await payload.find({
          collection: 'students',
          where: {
            and: [
              { firstName: { equals: raw.firstName.trim() } },
              { lastName: { equals: raw.lastName.trim() } },
              { or: phoneConditions },
            ],
          },
          limit: 1,
          depth: 0,
          req,
          overrideAccess: true,
        })
        if (queryRes.totalDocs > 0) {
          existing = queryRes.docs[0]
        }
      } else {
        const queryRes = await payload.find({
          collection: 'students',
          where: {
            and: [
              { firstName: { equals: raw.firstName.trim() } },
              { lastName: { equals: raw.lastName.trim() } },
            ],
          },
          limit: 1,
          depth: 0,
          req,
          overrideAccess: true,
        })
        if (queryRes.totalDocs > 0) {
          existing = queryRes.docs[0]
        }
      }

      if (existing) {
        skippedStudentsCount++
        continue
      }

      const studentPayloadData = {
        firstName: raw.firstName.trim(),
        lastName: raw.lastName.trim(),
        origin: 'import' as const,
        readinessStatus: raw.readinessStatus || ('normal' as const),
        lifecycleStatus: raw.lifecycleStatus || ('unknown' as const),
        grade: typeof raw.grade === 'number' && raw.grade >= 1 && raw.grade <= 6 ? raw.grade : null,
        mobile: raw.mobile?.trim() || null,
        fatherMobile: raw.fatherMobile?.trim() || null,
        motherMobile: raw.motherMobile?.trim() || null,
        landline: raw.landline?.trim() || null,
        neighborhood: neighborhoodId,
        address: raw.address?.trim() || null,
        referrer: raw.referrer?.trim() || null,
        notes: formattedNotes,
      }

      if (!isDryRun) {
        try {
          const createdStudent = await payload.create({
            collection: 'students',
            data: studentPayloadData,
            req,
            overrideAccess: true,
          })
          createdStudentsCount++

          // Create historical ceremony session check-ins if recorded
          if (raw.ceremonies && typeof raw.ceremonies === 'object') {
            for (const [ceremonyKey, gradeVal] of Object.entries(raw.ceremonies)) {
              const sessionId = ceremonySessionMap.get(ceremonyKey)
              if (sessionId) {
                try {
                  await payload.create({
                    collection: 'session-checkins',
                    data: {
                      student: createdStudent.id,
                      session: sessionId,
                      checkedInBy: systemAdminId,
                      checkedInAt: new Date().toISOString(),
                      source: 'invited',
                      note: `پایه تحصیلی در زمان برگزاری مراسم: ${gradeVal}`,
                    },
                    req,
                    overrideAccess: true,
                  })
                  createdCheckinsCount++
                } catch {
                  // Unique index protection on [student, session] prevents duplicate checkins
                }
              }
            }
          }
        } catch (err) {
          errorCount++
          errors.push({
            name: `${raw.firstName} ${raw.lastName}`,
            error: err instanceof Error ? err.message : String(err),
          })
        }
      } else {
        createdStudentsCount++
        if (raw.ceremonies && typeof raw.ceremonies === 'object') {
          for (const ceremonyKey of Object.keys(raw.ceremonies)) {
            if (ceremonySessionMap.has(ceremonyKey)) createdCheckinsCount++
          }
        }
      }

      if ((i + 1) % 250 === 0 || i + 1 === studentsToImport.length) {
        console.log(
          `Processed: ${i + 1}/${studentsToImport.length} | Students Created: ${createdStudentsCount} | Skipped: ${skippedStudentsCount} | Ceremony Checkins: ${createdCheckinsCount} | Errors: ${errorCount}`,
        )
      }
    }

    console.log(`----------------------------------------------------`)
    console.log(`Import Summary:`)
    console.log(`  Total Ingested: ${studentsToImport.length}`)
    console.log(`  Students Created: ${createdStudentsCount}`)
    console.log(`  Students Skipped: ${skippedStudentsCount}`)
    console.log(`  Historical Ceremony Check-ins: ${createdCheckinsCount}`)
    console.log(`  Errors: ${errorCount}`)

    if (errors.length > 0) {
      console.log(`\nEncountered Errors (${errors.length}):`)
      errors.slice(0, 10).forEach((e, idx) => console.log(`  ${idx + 1}. ${e.name}: ${e.error}`))
      if (errors.length > 10) console.log(`  ... and ${errors.length - 10} more.`)
    }

    console.log(`====================================================`)
  } finally {
    await payload.destroy()
  }
}

runImport()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Fatal import error:', err)
    process.exit(1)
  })
