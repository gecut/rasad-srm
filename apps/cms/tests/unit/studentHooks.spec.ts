import { describe, it, expect } from 'vitest'
import {
  sanitizeStudentInput,
  applyStudentLifecycleTransitions,
} from '@/domain/students/studentHooks'
import type { Student } from '@/payload-types'
import type { PayloadRequest } from 'payload'

describe('studentHooks', () => {
  describe('sanitizeStudentInput', () => {
    it('normalizes Persian/Arabic characters, trims and collapses spaces', () => {
      const data: Partial<Student> = {
        firstName: 'علي  ',
        lastName: '  رضايي ',
        address: 'خيابان   كوهسنگي',
        referrer: '  مدرسه   شهيد   بهشتي  ',
        notes: 'يادداشت  اوليه',
        mobile: '0912 345 6789',
        motherMobile: '+989123456788',
        fatherMobile: '۰۹۱۲۳۴۵۶۷۸۷',
        landline: '۰۵۱۳۸۴۵۰۰۰۰',
      }
      sanitizeStudentInput(data)
      expect(data.firstName).toBe('علی')
      expect(data.lastName).toBe('رضایی')
      expect(data.address).toBe('خیابان کوهسنگی')
      expect(data.referrer).toBe('مدرسه شهید بهشتی')
      expect(data.notes).toBe('یادداشت اولیه')
      expect(data.mobile).toBe('09123456789')
      expect(data.motherMobile).toBe('09123456788')
      expect(data.fatherMobile).toBe('09123456787')
      expect(data.landline).toBe('05138450000')
    })

    it('handles empty landline string by setting it to null', () => {
      const data: Partial<Student> = {
        landline: '   ',
      }
      sanitizeStudentInput(data)
      expect(data.landline).toBeNull()
    })
  })

  describe('applyStudentLifecycleTransitions', () => {
    const adminReq = {
      user: { role: 'admin' },
    } as unknown as PayloadRequest

    it('auto-transitions unknown to referred_to_teacher and sets referredAt when currentClass is assigned', () => {
      const data: Partial<Student> = { currentClass: 10 }
      const originalDoc = { id: 1, lifecycleStatus: 'unknown' } as Student
      applyStudentLifecycleTransitions({ data, originalDoc, req: adminReq })

      expect(data.lifecycleStatus).toBe('referred_to_teacher')
      expect(data.referredAt).toBeDefined()
      expect(data.removedReason).toBeNull()
    })

    it('auto-transitions class_seeker to referred_to_teacher and sets referredAt when currentClass is assigned', () => {
      const data: Partial<Student> = { currentClass: 15 }
      const originalDoc = { id: 2, lifecycleStatus: 'class_seeker' } as Student
      applyStudentLifecycleTransitions({ data, originalDoc, req: adminReq })

      expect(data.lifecycleStatus).toBe('referred_to_teacher')
      expect(data.referredAt).toBeDefined()
    })

    it('does NOT downgrade status when updating profile of referred_to_teacher student', () => {
      const data: Partial<Student> = { notes: 'یادداشت جدید' }
      const originalDoc = {
        id: 3,
        lifecycleStatus: 'referred_to_teacher',
        currentClass: 10,
        referredAt: '2026-01-01T12:00:00.000Z',
      } as Student
      applyStudentLifecycleTransitions({ data, originalDoc, req: adminReq })

      expect(data.lifecycleStatus).toBeUndefined()
      expect(data.referredAt).toBeUndefined()
    })

    it('does NOT downgrade status when changing class of absorbed student', () => {
      const data: Partial<Student> = { currentClass: 20 }
      const originalDoc = {
        id: 4,
        lifecycleStatus: 'absorbed',
        currentClass: 10,
        absorbedAt: '2026-02-01T12:00:00.000Z',
      } as Student
      applyStudentLifecycleTransitions({ data, originalDoc, req: adminReq })

      expect(data.lifecycleStatus).toBeUndefined()
      expect(data.absorbedAt).toBeUndefined()
    })

    it('does NOT downgrade status when updating profile of stabilized student', () => {
      const data: Partial<Student> = { address: 'آدرس جدید' }
      const originalDoc = {
        id: 5,
        lifecycleStatus: 'stabilized',
        currentClass: 10,
        absorbedAt: '2025-01-01T12:00:00.000Z',
        stabilizedAt: '2025-08-01T12:00:00.000Z',
      } as Student
      applyStudentLifecycleTransitions({ data, originalDoc, req: adminReq })

      expect(data.lifecycleStatus).toBeUndefined()
      expect(data.stabilizedAt).toBeUndefined()
    })

    it('gracefully transitions referred_to_teacher to class_seeker when class is unassigned/null', () => {
      const data: Partial<Student> = { currentClass: null }
      const originalDoc = {
        id: 6,
        lifecycleStatus: 'referred_to_teacher',
        currentClass: 10,
        referredAt: '2026-01-01T12:00:00.000Z',
      } as Student
      applyStudentLifecycleTransitions({ data, originalDoc, req: adminReq })

      expect(data.lifecycleStatus).toBe('class_seeker')
      expect(data.referredAt).toBeNull()
    })

    it('auto-upgrades referred_to_teacher to absorbed when absorbedAt is provided', () => {
      const data: Partial<Student> = { absorbedAt: '2026-03-01T12:00:00.000Z' }
      const originalDoc = {
        id: 7,
        lifecycleStatus: 'referred_to_teacher',
        currentClass: 10,
      } as Student
      applyStudentLifecycleTransitions({ data, originalDoc, req: adminReq })

      expect(data.lifecycleStatus).toBe('absorbed')
    })

    it('auto-stamps absorbedAt when lifecycleStatus is set to absorbed without date', () => {
      const data: Partial<Student> = { lifecycleStatus: 'absorbed' }
      const originalDoc = {
        id: 8,
        lifecycleStatus: 'referred_to_teacher',
        currentClass: 10,
      } as Student
      applyStudentLifecycleTransitions({ data, originalDoc, req: adminReq })

      expect(data.absorbedAt).toBeDefined()
    })

    it('clears removedReason when reactivating removed student to class_seeker', () => {
      const data: Partial<Student> = { lifecycleStatus: 'class_seeker' }
      const originalDoc = {
        id: 9,
        lifecycleStatus: 'removed',
        removedReason: 'انصراف',
      } as Student
      applyStudentLifecycleTransitions({ data, originalDoc, req: adminReq })

      expect(data.removedReason).toBeNull()
    })

    it('requires non-empty removedReason when transitioning to removed', () => {
      const data: Partial<Student> = { lifecycleStatus: 'removed', removedReason: '   ' }
      const originalDoc = { id: 10, lifecycleStatus: 'unknown' } as Student
      expect(() =>
        applyStudentLifecycleTransitions({ data, originalDoc, req: adminReq }),
      ).toThrow('برای دانش‌آموز حذف‌شده، ثبت دلیل حذف الزامی است.')
    })
  })
})
