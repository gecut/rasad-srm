import { createRootRoute, Outlet } from '@tanstack/react-router'
import { errorMessage } from '../lib/api'
export const Route = createRootRoute({
  component: Outlet,
  errorComponent: ({ error }) => (
    <main className="shell">
      <h1>دریافت اطلاعات انجام نشد</h1>
      <p role="alert">{errorMessage(error)}</p>
      <button type="button" onClick={() => location.reload()}>
        تلاش دوباره
      </button>
    </main>
  ),
  notFoundComponent: () => (
    <main className="shell">
      <h1>صفحه پیدا نشد</h1>
      <a href="/">بازگشت</a>
    </main>
  ),
})
