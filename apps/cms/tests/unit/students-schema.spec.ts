import { describe, it, expect } from 'vitest'
import { Students } from '@/collections/students'

describe('Students Collection Schema', () => {
  it('includes attendedCeremonies in defaultColumns and fields', () => {
    expect(Students.admin?.defaultColumns).toContain('attendedCeremonies')

    const tabsField = Students.fields.find((f: any) => f.type === 'tabs') as any
    expect(tabsField).toBeDefined()

    const tab1 = tabsField.tabs[0]
    const attendedCollapsible = tab1.fields.find((f: any) => f.label === 'مراسم‌های حضور یافته')
    const attendedField = attendedCollapsible
      ? attendedCollapsible.fields[0]
      : tab1.fields.find((f: any) => f.name === 'attendedCeremonies')
    expect(attendedField).toMatchObject({
      name: 'attendedCeremonies',
      type: 'relationship',
      relationTo: 'ceremonies',
      hasMany: true,
    })
  })

  it('updates checkins join columns and removes invitations join from tab 2', () => {
    const tabsField = Students.fields.find((f: any) => f.type === 'tabs') as any
    const tab1 = tabsField.tabs[0]
    const checkinsCollapsible = tab1.fields.find((f: any) => f.label === 'سوابق حضور در مراسم‌ها')
    expect(checkinsCollapsible).toBeDefined()
    const checkinsField = checkinsCollapsible.fields[0]
    expect(checkinsField.admin.defaultColumns).toEqual([
      'ceremony',
      'session',
      'source',
      'checkedInAt',
      'checkedInBy',
    ])

    const tab2 = tabsField.tabs[1]
    const invitationsField = tab2.fields.find(
      (f: any) => f.name === 'invitations' || f.label === 'سوابق دعوت به مراسم‌ها',
    )
    expect(invitationsField).toBeUndefined()
  })
})
