import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.resolve(__dirname, '../.env') })

import { getPayload, createLocalReq } from 'payload'

export const HISTORICAL_CEREMONIES = [
  { key: 'نیمه1402', title: 'جشن نیمه شعبان ۱۴۰۲', date: '2024-02-25T08:00:00.000Z' },
  { key: 'غدیر1403', title: 'جشن غدیر ۱۴۰۳', date: '2024-06-25T08:00:00.000Z' },
  { key: 'نیمه1403', title: 'جشن نیمه شعبان ۱۴۰۳', date: '2025-02-14T08:00:00.000Z' },
  { key: 'غدیر1404', title: 'جشن غدیر ۱۴۰۴', date: '2025-06-15T08:00:00.000Z' },
  { key: 'غدیر1405', title: 'جشن غدیر ۱۴۰۵', date: '2026-06-04T08:00:00.000Z' },
]

export const SEED_NEIGHBORHOODS: Array<{ name: string; description?: string; subDistricts?: string[] }> = [
  {
    name: 'سجاد',
    description: 'محدوده بلوار سجاد و خیابان‌های اطراف',
    subDistricts: ['بزرگمهر', 'بهار', 'سوسن', 'پردیس', 'خیام جنوبی', 'امین'],
  },
  {
    name: 'احمدآباد',
    description: 'محدوده میدان و بلوار احمدآباد',
    subDistricts: ['ملاصدرا', 'رضا', 'طالقانی', 'عدالت', 'پاستور', 'کوهسنگی شمالی'],
  },
  {
    name: 'کوهسنگی',
    description: 'محدوده پارک و خیابان کوهسنگی',
    subDistricts: ['بهشتی', 'حکیم نظامی', 'پارس', 'دانشگاه'],
  },
  {
    name: 'ابوطالب',
    description: 'محدوده بلوار ابوطالب و خیابان‌های اطراف',
    subDistricts: ['حر عاملی', 'عبدالمطلب', 'شفا', 'هدایت'],
  },
  {
    name: 'فرامرز',
    description: 'محدوده بلوار شهید فرامرز عباسی',
    subDistricts: ['فرامرز عباسی', 'رسالت', 'جانباز', 'سعدی'],
  },
  {
    name: 'آبکوه',
    description: 'محدوده بلوار آبکوه و کلاهدوز',
    subDistricts: ['کلاهدوز', 'آبکوه', 'توتستان', 'قاضی طباطبایی'],
  },
  {
    name: 'رضاشهر',
    description: 'محدوده رضاشهر و شهرک طالقانی',
    subDistricts: ['پیروزی', 'خاقانی', 'کلانتری', 'دعبل خزاعی', 'رضوی'],
  },
  {
    name: 'امام رضا',
    description: 'محدوده خیابان امام رضا و حرم مطهر',
    subDistricts: ['امام رضا', 'دانش', 'عنصری', 'هفده شهریور', 'فدائیان اسلام'],
  },
  {
    name: 'قاسم آباد الهیه',
    description: 'محدوده شهرک غرب، قاسم‌آباد و الهیه',
    subDistricts: ['شریعتی', 'فلاحی', 'امیریه', 'الهیه', 'اقدسیه', 'میثاق', 'حجابی'],
  },
  {
    name: 'وکیل آباد راست',
    description: 'حاشیه راست بلوار وکیل‌آباد (سمت باهنر و هاشمیه)',
    subDistricts: ['باهنر', 'کوثر', 'هاشمیه', 'هنرستان', 'هفت تیر', 'سامانیه'],
  },
  {
    name: 'وکیل آباد راست نزدیک',
    description: 'اوایل وکیل‌آباد راست (کوثر، باهنر)',
    subDistricts: ['کوثر', 'باهنر', 'دانشگاه فردوسی'],
  },
  {
    name: 'وکیل آباد راست دور',
    description: 'انتهای وکیل‌آباد راست (صیاد، لادن، اقبال)',
    subDistricts: ['صیاد شیرازی', 'حافظ', 'لادن', 'اقبال لاهوری'],
  },
  {
    name: 'وکیل آباد چپ',
    description: 'حاشیه چپ بلوار وکیل‌آباد (سمت دانشجو، صدف)',
    subDistricts: ['دانشجو', 'صدف', 'معلم', 'دندانپزشکان', 'فارغ‌التحصیلان'],
  },
  {
    name: 'وکیل آباد چپ نزدیک',
    description: 'اوایل وکیل‌آباد چپ (امامت، جلال)',
    subDistricts: ['امامت', 'جلال آل احمد', 'سروش'],
  },
  {
    name: 'وکیل آباد چپ دور',
    description: 'انتهای وکیل‌آباد چپ (نمایشگاه، دانشجو)',
    subDistricts: ['دانشجو دور', 'نمایشگاه', 'صدف دور'],
  },
  {
    name: 'حومه',
    description: 'مناطق حاشیه و روستاهای اطراف مشهد',
    subDistricts: ['طرق', 'خواجه‌ربیع', 'طبرسی شمالی', 'رسالت دور'],
  },
  {
    name: 'شاندیز/طرقبه',
    description: 'شهرستان‌های طرقبه و شاندیز',
    subDistricts: ['طرقبه', 'شاندیز', 'ویرانی', 'حصار'],
  },
  {
    name: 'کلاهدوز1',
    description: 'محدوده خیابان کلاهدوز',
    subDistricts: ['کلاهدوز'],
  },
  {
    name: 'قاسم آباد',
    description: 'محدوده قاسم‌آباد',
    subDistricts: ['شریعتی', 'فلاحی'],
  },
  {
    name: 'کوهسنگی، پارس6',
    description: 'محدوده کوهسنگی پارس',
    subDistricts: ['پارس'],
  },
  {
    name: 'وکیل اباد راست',
    description: 'محدوده وکیل آباد راست',
    subDistricts: ['وکیل آباد'],
  },
]

export async function seedHistoricalEventsAndNeighborhoods() {
  console.log(`====================================================`)
  console.log(`  Seeding Neighborhoods & Historical Ceremonies`)
  console.log(`====================================================`)

  const { default: config } = await import('../src/payload.config')
  const payload = await getPayload({ config })
  const req = await createLocalReq({}, payload)

  try {
    // 1. Seed Neighborhoods
    console.log(`\n1. Upserting Neighborhoods (${SEED_NEIGHBORHOODS.length})...`)
    for (const item of SEED_NEIGHBORHOODS) {
      const existing = await payload.find({
        collection: 'neighborhoods',
        where: { name: { equals: item.name } },
        limit: 1,
        depth: 0,
        req,
        overrideAccess: true,
      })

      const subDistrictsData = item.subDistricts?.map((name) => ({ name })) || []

      if (existing.totalDocs > 0) {
        await payload.update({
          collection: 'neighborhoods',
          id: existing.docs[0].id,
          data: {
            description: item.description,
            subDistricts: subDistrictsData,
          },
          req,
          overrideAccess: true,
        })
        console.log(`  ✓ Updated neighborhood: ${item.name}`)
      } else {
        await payload.create({
          collection: 'neighborhoods',
          data: {
            name: item.name,
            description: item.description,
            subDistricts: subDistrictsData,
          },
          req,
          overrideAccess: true,
        })
        console.log(`  + Created neighborhood: ${item.name}`)
      }
    }

    // 2. Seed Historical Ceremonies & Sessions
    console.log(`\n2. Upserting Historical Ceremonies (${HISTORICAL_CEREMONIES.length})...`)
    for (const item of HISTORICAL_CEREMONIES) {
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
        console.log(`  ✓ Found existing ceremony: ${item.title} (ID: ${ceremonyId})`)
      } else {
        const created = await payload.create({
          collection: 'ceremonies',
          data: {
            title: item.title,
            description: `ثبت آرشیوی مراسم های برگزار شده گذشته (${item.key})`,
            status: 'completed',
          },
          req,
          overrideAccess: true,
        })
        ceremonyId = created.id
        console.log(`  + Created ceremony: ${item.title} (ID: ${ceremonyId})`)
      }

      // Check / Create Archival Session
      const existingSession = await payload.find({
        collection: 'sessions',
        where: { ceremony: { equals: ceremonyId } },
        limit: 1,
        depth: 0,
        req,
        overrideAccess: true,
      })

      if (existingSession.totalDocs === 0) {
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
        console.log(`    + Created archival session for ${item.title} (ID: ${session.id})`)
      } else {
        console.log(`    ✓ Found archival session for ${item.title}`)
      }
    }

    console.log(`\n====================================================`)
    console.log(`  Seeding Completed Successfully!`)
    console.log(`====================================================\n`)
  } finally {
    await payload.destroy()
  }
}

// Execute if run directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  seedHistoricalEventsAndNeighborhoods()
    .then(() => {
      process.exit(0)
    })
    .catch((err) => {
      console.error('Seeding error:', err)
      process.exit(1)
    })
}
