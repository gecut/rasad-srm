import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'
import type { Payload, PayloadRequest } from 'payload'
import { getPayload, createLocalReq } from 'payload'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.resolve(__dirname, '../.env') })

// Simplified developer password per user instruction
export const SEED_PASSWORD = '123456'

export const SEED_ACCOUNTS = [
  { key: 'admin', name: 'آرمان مدیر', role: 'admin' as const, phone: '09000000001' },
  { key: 'employee', name: 'نگار هماهنگ', role: 'employee' as const, phone: '09000000002' },
  {
    key: 'followup',
    name: 'مریم پیگیر',
    role: 'follow_up_specialist' as const,
    phone: '09000000003',
  },
  { key: 'inviter-a', name: 'سارا دعوت', role: 'inviter' as const, phone: '09000000004' },
  { key: 'inviter-b', name: 'رضا دعوت', role: 'inviter' as const, phone: '09000000005' },
  { key: 'teacher-a', name: 'امیر دانا', role: 'teacher' as const, phone: '09000000006' },
  { key: 'teacher-b', name: 'نیما فرهی', role: 'teacher' as const, phone: '09000000007' },
  { key: 'teacher-c', name: 'پگاه روشن', role: 'teacher' as const, phone: '09000000008' },
  { key: 'reception-a', name: 'لیلا پذیرش', role: 'receptionist' as const, phone: '09000000009' },
  { key: 'reception-b', name: 'سامان پذیرش', role: 'receptionist' as const, phone: '09000000010' },
]

interface NeighborhoodItem {
  name: string
  description?: string
  subDistricts?: string[]
}

interface CeremonyItem {
  key: string
  title: string
  date: string
  status: 'completed' | 'active' | 'scheduled' | 'draft' | 'cancelled'
  attendancePolicy?: 'single' | 'multiple'
  description?: string
}

interface TeacherItem {
  firstName: string
  lastName: string
  status: 'active' | 'inactive'
}

interface ClassItem {
  code: string
  title: string
  grade: number
  status: 'active' | 'transition_to_preliminaries'
  primaryTeacher: string
  teachers: string[]
  studentNames: string[]
}

interface StudentItem {
  id: string
  firstName: string
  lastName: string
  grade: number | null
  origin: 'import'
  readinessStatus: 'normal' | 'waitlisted'
  lifecycleStatus: 'unknown' | 'class_seeker' | 'referred_to_teacher'
  currentClass: string | null
  fatherMobile: string | null
  motherMobile: string | null
  mobile: string | null
  landline: string | null
  neighborhood: string | null
  address: string | null
  referrer: string | null
  notes: string
  ceremonies: Record<string, string>
}

function resolveDataPath(filename: string): string {
  const p1 = path.resolve(process.cwd(), 'data', filename)
  if (fs.existsSync(p1)) return p1
  const p2 = path.resolve(__dirname, '../../../data', filename)
  if (fs.existsSync(p2)) return p2
  throw new Error(`Data file not found: ${filename}`)
}

export interface SeedSummary {
  usersCreated: number
  usersUpdated: number
  neighborhoodsCreated: number
  neighborhoodsUpdated: number
  ceremoniesCreated: number
  sessionsCreated: number
  teachersCreated: number
  classesCreated: number
  studentsCreated: number
  studentsSkipped: number
  waitlistedStudents: number
  classSeekerStudents: number
  referredStudents: number
  unknownGradeStudents: number
  historicalCheckinsCreated: number
  durationMs: number
}

export async function runUnifiedSeed(
  payload: Payload,
  providedReq?: PayloadRequest,
): Promise<SeedSummary> {
  const startTime = Date.now()
  const req = providedReq || (await createLocalReq({ context: { domainAction: true } }, payload))

  console.log(`\n=============================================================`)
  console.log(`  Rasad SRM v2 — JSON-Driven Unified Production Seed Pipeline`)
  console.log(`=============================================================`)

  // 1. Seed Core Accounts
  console.log(`\n1. Upserting System & Panel Operator Accounts (${SEED_ACCOUNTS.length})...`)
  let usersCreated = 0
  let usersUpdated = 0
  const teacherProfileMap = new Map<string, number>()

  for (const account of SEED_ACCOUNTS.filter((a) => a.role === 'teacher')) {
    const existingTeacher = await payload.find({
      collection: 'teachers',
      where: { and: [{ firstName: { equals: account.name } }] },
      limit: 1,
      depth: 0,
      req,
      overrideAccess: true,
    })

    if (existingTeacher.totalDocs > 0) {
      teacherProfileMap.set(account.key, existingTeacher.docs[0].id)
    } else {
      const createdTeacher = await payload.create({
        collection: 'teachers',
        data: { firstName: account.name, lastName: 'مدرس', status: 'active' },
        req,
        overrideAccess: true,
      })
      teacherProfileMap.set(account.key, createdTeacher.id)
    }
  }

  for (const acc of SEED_ACCOUNTS) {
    const existingUser = await payload.find({
      collection: 'users',
      where: {
        or: [
          { username: { equals: acc.phone } },
          { email: { equals: `${acc.key}@seed.rasad.invalid` } },
        ],
      },
      limit: 1,
      depth: 0,
      req,
      overrideAccess: true,
    })

    const teacherProfileId = teacherProfileMap.get(acc.key) || null

    if (existingUser.totalDocs > 0) {
      await payload.update({
        collection: 'users',
        id: existingUser.docs[0].id,
        data: {
          name: acc.name,
          role: acc.role,
          status: 'active',
          password: SEED_PASSWORD,
          ...(teacherProfileId ? { teacherProfile: teacherProfileId } : {}),
        },
        req,
        overrideAccess: true,
      })
      usersUpdated++
    } else {
      await payload.create({
        collection: 'users',
        data: {
          name: acc.name,
          email: `${acc.key}@seed.rasad.invalid`,
          username: acc.phone,
          password: SEED_PASSWORD,
          role: acc.role,
          status: 'active',
          ...(teacherProfileId ? { teacherProfile: teacherProfileId } : {}),
        },
        req,
        overrideAccess: true,
      })
      usersCreated++
    }
  }
  console.log(
    `   ✓ Accounts: ${usersCreated} created, ${usersUpdated} updated (Default Password: ${SEED_PASSWORD}).`,
  )

  // 2. Seed Neighborhoods from JSON
  const neighborhoodsData: NeighborhoodItem[] = JSON.parse(
    fs.readFileSync(resolveDataPath('neighborhoods.json'), 'utf8'),
  )
  console.log(`\n2. Upserting Mashhad Neighborhoods (${neighborhoodsData.length})...`)
  let neighborhoodsCreated = 0
  let neighborhoodsUpdated = 0
  const neighborhoodMap = new Map<string, number>()

  for (const item of neighborhoodsData) {
    const existing = await payload.find({
      collection: 'neighborhoods',
      where: { name: { equals: item.name } },
      limit: 1,
      depth: 0,
      req,
      overrideAccess: true,
    })

    const subDistrictsData = item.subDistricts?.map((name) => ({ name })) || []
    let nId: number

    if (existing.totalDocs > 0) {
      nId = existing.docs[0].id
      await payload.update({
        collection: 'neighborhoods',
        id: nId,
        data: { description: item.description, subDistricts: subDistrictsData },
        req,
        overrideAccess: true,
      })
      neighborhoodsUpdated++
    } else {
      const created = await payload.create({
        collection: 'neighborhoods',
        data: {
          name: item.name,
          description: item.description,
          subDistricts: subDistrictsData,
        },
        req,
        overrideAccess: true,
      })
      nId = created.id
      neighborhoodsCreated++
    }
    neighborhoodMap.set(item.name.trim(), nId)
  }
  console.log(
    `   ✓ Neighborhoods: ${neighborhoodsCreated} created, ${neighborhoodsUpdated} updated.`,
  )

  // 3. Seed Ceremonies & Archival Sessions from JSON
  const ceremoniesData: CeremonyItem[] = JSON.parse(
    fs.readFileSync(resolveDataPath('ceremonies.json'), 'utf8'),
  )
  console.log(`\n3. Upserting Historical Ceremonies (${ceremoniesData.length})...`)
  let ceremoniesCreated = 0
  let sessionsCreated = 0
  const ceremonySessionMap = new Map<string, number>()
  const ceremonyKeyToIdMap = new Map<string, number>()

  for (const item of ceremoniesData) {
    const existing = await payload.find({
      collection: 'ceremonies',
      where: { title: { equals: item.title } },
      limit: 1,
      depth: 0,
      req,
      overrideAccess: true,
    })

    let ceremonyId: number
    if (existing.totalDocs > 0) {
      ceremonyId = existing.docs[0].id
    } else {
      const created = await payload.create({
        collection: 'ceremonies',
        data: {
          title: item.title,
          description: item.description || `ثبت آرشیوی مراسم (${item.key})`,
          status: item.status,
          attendancePolicy: item.attendancePolicy || 'single',
        },
        req,
        overrideAccess: true,
      })
      ceremonyId = created.id
      ceremoniesCreated++
    }
    ceremonyKeyToIdMap.set(item.key, ceremonyId)

    const existingSession = await payload.find({
      collection: 'sessions',
      where: { ceremony: { equals: ceremonyId } },
      limit: 1,
      depth: 0,
      req,
      overrideAccess: true,
    })

    let sessionId: number
    if (existingSession.totalDocs > 0) {
      sessionId = existingSession.docs[0].id
    } else {
      const session = await payload.create({
        collection: 'sessions',
        data: {
          ceremony: ceremonyId,
          title: `سانس آرشیوی ${item.title}`,
          startsAt: item.date,
          status: 'sealed',
        },
        req,
        overrideAccess: true,
      })
      sessionId = session.id
      sessionsCreated++
    }
    ceremonySessionMap.set(item.key, sessionId)
  }
  console.log(
    `   ✓ Historical Ceremonies: ${ceremoniesCreated} created, ${sessionsCreated} archival sessions ready.`,
  )

  // 4. Seed Teachers from JSON
  const teachersData: TeacherItem[] = JSON.parse(
    fs.readFileSync(resolveDataPath('teachers.json'), 'utf8'),
  )
  console.log(`\n4. Upserting Teachers (${teachersData.length})...`)
  let teachersCreated = 0
  const allTeachersByName = new Map<string, number>()

  for (const t of teachersData) {
    const existing = await payload.find({
      collection: 'teachers',
      where: {
        and: [{ firstName: { equals: t.firstName } }, { lastName: { equals: t.lastName } }],
      },
      limit: 1,
      depth: 0,
      req,
      overrideAccess: true,
    })

    let tId: number
    if (existing.totalDocs > 0) {
      tId = existing.docs[0].id
    } else {
      const created = await payload.create({
        collection: 'teachers',
        data: { firstName: t.firstName, lastName: t.lastName, status: t.status },
        req,
        overrideAccess: true,
      })
      tId = created.id
      teachersCreated++
    }
    allTeachersByName.set(`${t.firstName} ${t.lastName}`.trim(), tId)
    allTeachersByName.set(t.lastName.trim(), tId)
  }
  console.log(`   ✓ Teachers: ${teachersCreated} created, ${allTeachersByName.size} indexed.`)

  // Default fallback teacher
  const defaultTeacherId =
    allTeachersByName.get('مقدمات') ||
    allTeachersByName.get('امیر دانا') ||
    (allTeachersByName.values().next().value as number)

  // 5. Seed Classes from JSON
  const classesData: ClassItem[] = JSON.parse(
    fs.readFileSync(resolveDataPath('classes.json'), 'utf8'),
  )
  console.log(`\n5. Upserting Classes (${classesData.length})...`)
  let classesCreated = 0
  const classCodeToIdMap = new Map<string, number>()

  for (const c of classesData) {
    const existing = await payload.find({
      collection: 'classes',
      where: { title: { equals: c.title } },
      limit: 1,
      depth: 0,
      req,
      overrideAccess: true,
    })

    const primaryTeacherId = allTeachersByName.get(c.primaryTeacher) || defaultTeacherId

    let classId: number
    if (existing.totalDocs > 0) {
      classId = existing.docs[0].id
    } else {
      const created = await payload.create({
        collection: 'classes',
        data: {
          title: c.title,
          primaryTeacher: primaryTeacherId,
          status:
            c.status === 'transition_to_preliminaries' ? 'transition_to_preliminaries' : 'active',
        },
        req,
        overrideAccess: true,
      })
      classId = created.id
      classesCreated++
    }
    classCodeToIdMap.set(c.code, classId)
    classCodeToIdMap.set(c.title, classId)
  }
  console.log(`   ✓ Classes: ${classesCreated} created, ${classCodeToIdMap.size} indexed.`)

  // 6. Ingest Students from JSON
  const studentsData: StudentItem[] = JSON.parse(
    fs.readFileSync(resolveDataPath('students.json'), 'utf8'),
  )
  console.log(`\n6. Ingesting Students from JSON (${studentsData.length})...`)

  const adminUserRes = await payload.find({
    collection: 'users',
    where: { role: { equals: 'admin' } },
    limit: 1,
    depth: 0,
    req,
    overrideAccess: true,
  })
  const systemAdminId = adminUserRes.totalDocs > 0 ? adminUserRes.docs[0].id : 1

  let studentsCreated = 0
  let studentsSkipped = 0
  let waitlistedStudents = 0
  let classSeekerStudents = 0
  let referredStudents = 0
  let unknownGradeStudents = 0
  let historicalCheckinsCreated = 0

  for (let i = 0; i < studentsData.length; i++) {
    const st = studentsData[i]

    if (st.readinessStatus === 'waitlisted') waitlistedStudents++
    if (st.lifecycleStatus === 'class_seeker') classSeekerStudents++
    if (st.lifecycleStatus === 'referred_to_teacher') referredStudents++
    if (st.grade === null) unknownGradeStudents++

    // Resolve neighborhood
    let neighborhoodId: number | null = null
    if (st.neighborhood) {
      neighborhoodId = neighborhoodMap.get(st.neighborhood.trim()) || null
    }

    // Resolve assigned class
    let currentClassId: number | null = null
    if (st.currentClass) {
      currentClassId = classCodeToIdMap.get(st.currentClass) || null
    }

    // Check existing for deduplication
    const existingCheck = await payload.find({
      collection: 'students',
      where: {
        and: [
          { firstName: { equals: st.firstName } },
          { lastName: { equals: st.lastName } },
          ...(st.fatherMobile ? [{ fatherMobile: { equals: st.fatherMobile } }] : []),
          ...(st.motherMobile ? [{ motherMobile: { equals: st.motherMobile } }] : []),
        ],
      },
      limit: 1,
      depth: 0,
      req,
      overrideAccess: true,
    })

    let studentDbId: number

    if (existingCheck.totalDocs > 0) {
      studentDbId = existingCheck.docs[0].id
      studentsSkipped++
    } else {
      const attendedCeremonyIds: number[] = []
      if (st.ceremonies && typeof st.ceremonies === 'object') {
        for (const ceremonyKey of Object.keys(st.ceremonies)) {
          const cId = ceremonyKeyToIdMap.get(ceremonyKey)
          if (cId) attendedCeremonyIds.push(cId)
        }
      }

      const created = await payload.create({
        collection: 'students',
        data: {
          firstName: st.firstName,
          lastName: st.lastName,
          grade: st.grade,
          origin: st.origin,
          readinessStatus: st.readinessStatus,
          lifecycleStatus: currentClassId ? 'referred_to_teacher' : st.lifecycleStatus,
          currentClass: currentClassId,
          fatherMobile: st.fatherMobile,
          motherMobile: st.motherMobile,
          mobile: st.mobile,
          landline: st.landline,
          neighborhood: neighborhoodId,
          address: st.address,
          referrer: st.referrer,
          notes: st.notes,
          attendedCeremonies: attendedCeremonyIds,
        },
        req,
        overrideAccess: true,
      })
      studentDbId = created.id
      studentsCreated++
    }

    // Create session check-ins for historical ceremonies
    if (st.ceremonies && typeof st.ceremonies === 'object') {
      for (const [ceremonyKey, markerVal] of Object.entries(st.ceremonies)) {
        const sessionId = ceremonySessionMap.get(ceremonyKey)
        const ceremonyId = ceremonyKeyToIdMap.get(ceremonyKey)
        if (sessionId && ceremonyId) {
          try {
            await payload.create({
              collection: 'session-checkins',
              data: {
                student: studentDbDbId(studentDbId),
                session: sessionId,
                ceremony: ceremonyId,
                checkedInBy: systemAdminId,
                checkedInAt: new Date().toISOString(),
                source: 'invited',
                note: `ثبت آرشیوی حضور در مراسم (${ceremonyKey} - نشانگر: ${markerVal})`,
              },
              req,
              overrideAccess: true,
            })
            historicalCheckinsCreated++
          } catch {
            // student_session_idx prevents duplicates
          }
        }
      }
    }

    if ((i + 1) % 400 === 0 || i + 1 === studentsData.length) {
      console.log(
        `   Processed ${i + 1}/${studentsData.length} | Created: ${studentsCreated} | Skipped: ${studentsSkipped} | Check-ins: ${historicalCheckinsCreated}`,
      )
    }
  }

  function studentDbDbId(id: number): number {
    return id
  }

  const durationMs = Date.now() - startTime

  const summary: SeedSummary = {
    usersCreated,
    usersUpdated,
    neighborhoodsCreated,
    neighborhoodsUpdated,
    ceremoniesCreated,
    sessionsCreated,
    teachersCreated,
    classesCreated,
    studentsCreated,
    studentsSkipped,
    waitlistedStudents,
    classSeekerStudents,
    referredStudents,
    unknownGradeStudents,
    historicalCheckinsCreated,
    durationMs,
  }

  console.log(`\n-------------------------------------------------------------`)
  console.log(`  Seed Execution Summary`)
  console.log(`-------------------------------------------------------------`)
  console.log(`  Total Students Processed:     ${studentsData.length}`)
  console.log(`  Students Created:             ${studentsCreated}`)
  console.log(`  Students Skipped (exists):    ${studentsSkipped}`)
  console.log(`  - Waitlisted (< Grade 4):     ${waitlistedStudents}`)
  console.log(`  - Class Seekers (>= Gr 4):    ${classSeekerStudents}`)
  console.log(`  - Referred to Class:          ${referredStudents}`)
  console.log(`  - Unknown Grade:              ${unknownGradeStudents}`)
  console.log(`  Historical Check-ins Created: ${historicalCheckinsCreated}`)
  console.log(`  Execution Time:               ${(durationMs / 1000).toFixed(2)}s`)
  console.log(`=============================================================\n`)

  return summary
}

// Standalone execution entrypoint
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const run = async () => {
    const { default: config } = await import('../src/payload.config')
    const payload = await getPayload({ config })
    try {
      await runUnifiedSeed(payload)
      process.exit(0)
    } catch (err) {
      console.error('Fatal seed error:', err)
      process.exit(1)
    } finally {
      await payload.destroy()
    }
  }
  run()
}
