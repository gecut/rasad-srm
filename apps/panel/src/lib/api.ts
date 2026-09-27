import { PayloadSDK, PayloadSDKError } from '@payloadcms/sdk'
import type { Config } from '@rasad/contracts'
const errorBodies = new WeakMap<Response, Promise<unknown>>()
const cmsBase = (
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_CMS_URL
    ? String(import.meta.env.VITE_CMS_URL)
    : ''
).replace(/\/+$/, '')

export const getAdminUrl = () => `${cmsBase}/admin`

export const sdk = new PayloadSDK<Config>({
  baseURL: cmsBase ? `${cmsBase}/api` : '/api',
  baseInit: { credentials: 'include' },
  fetch: async (input, init) => {
    const response = await fetch(input, init)
    // SDK consumes error bodies; preserve workflow details such as duplicate candidates.
    if (!response.ok)
      errorBodies.set(
        response,
        response
          .clone()
          .json()
          .catch(() => null),
      )
    return response
  },
})
export class APIError extends Error {
  status: number
  details: unknown
  constructor(status: number, message: string, details: unknown = null) {
    super(message)
    this.status = status
    this.details = details
  }
}
const messages: Record<number, string> = {
  401: 'نشست شما پایان یافته است. دوباره وارد شوید.',
  403: 'اجازه انجام این کار را ندارید.',
  404: 'اطلاعات مورد نظر پیدا نشد.',
  409: 'اطلاعات تغییر کرده است. وضعیت را بازخوانی کنید.',
  422: 'اطلاعات واردشده را بررسی کنید.',
}
async function operation<T>(path: string, run: () => Promise<T>): Promise<T> {
  try {
    return await run()
  } catch (error) {
    if (!(error instanceof PayloadSDKError))
      throw new APIError(0, 'ارتباط برقرار نشد. دوباره تلاش کنید.')
    const data = await errorBodies.get(error.response)
    if (
      error.status === 401 &&
      !path.includes('/login') &&
      !path.includes('/me') &&
      location.pathname !== '/login'
    )
      location.assign('/login')
    const detail =
      data &&
      typeof data === 'object' &&
      'error' in data &&
      typeof data.error === 'string' &&
      /[\u0600-\u06ff]/.test(data.error)
        ? data.error
        : undefined
    throw new APIError(
      error.status,
      error.status >= 500
        ? 'خطای موقت سرور. دوباره تلاش کنید.'
        : (path === '/users/login' && error.status === 401
            ? 'شماره موبایل یا رمز عبور درست نیست.'
            : detail) ||
            messages[error.status] ||
            'عملیات انجام نشد.',
      data,
    )
  }
}
export const getCurrentUser = () => operation('/users/me', () => sdk.me({ collection: 'users' }))
export async function request<T>(path: string, json?: Record<string, unknown>): Promise<T> {
  return operation(path, async () => {
    const response = await sdk.request({
      method: json ? 'POST' : 'GET',
      path,
      ...(json ? { json } : {}),
    })
    return (await response.json()) as T
  })
}
export const errorMessage = (error: unknown) =>
  error instanceof APIError ? error.message : 'عملیات انجام نشد. دوباره تلاش کنید.'
export function normalizePhone(value: string): string {
  const digits = value
    .replace(/[۰-۹]/g, (char) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(char)))
    .replace(/[٠-٩]/g, (char) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(char)))
    .replace(/[\s()-]/g, '')
  return digits.replace(/^(?:\+98|0098|98)(9\d{9})$/, '0$1')
}
