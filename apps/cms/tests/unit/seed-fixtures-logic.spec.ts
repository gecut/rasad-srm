import { describe, it, expect } from 'vitest'

describe('Seed Historical Ceremony Mapping', () => {
  it('maps ceremony keys to ceremony IDs and passes attendedCeremonies array', () => {
    const ceremonyKeyToId = new Map([
      ['نیمه1402', 1],
      ['غدیر1403', 2],
    ])
    const studentCeremonies = { نیمه1402: '5.0', غدیر1403: '2.0' }

    const attendedCeremonies = Object.keys(studentCeremonies)
      .map((k) => ceremonyKeyToId.get(k))
      .filter((id): id is number => Boolean(id))

    expect(attendedCeremonies).toEqual([1, 2])
  })
})
