import { createRootRoute, Link, Outlet } from '@tanstack/react-router'
import { Button } from '@heroui/react'
import { errorMessage } from '../lib/api'

export const Route = createRootRoute({
  component: Outlet,
  errorComponent: ({ error }) => (
    <main className="shell py-12">
      <div className="bg-surface border border-border rounded-xl p-6 shadow-xs max-w-lg mx-auto flex flex-col gap-4 text-center items-center">
        <h1 className="text-xl font-bold text-foreground">دریافت اطلاعات انجام نشد</h1>
        <p role="alert" className="text-sm text-danger bg-danger/10 p-3 rounded-lg w-full">
          {errorMessage(error)}
        </p>
        <Button variant="primary" size="md" onPress={() => location.reload()}>
          تلاش دوباره
        </Button>
      </div>
    </main>
  ),
  notFoundComponent: () => (
    <main className="shell py-12">
      <div className="bg-surface border border-border rounded-xl p-6 shadow-xs max-w-lg mx-auto flex flex-col gap-4 text-center items-center">
        <h1 className="text-xl font-bold text-foreground">صفحه پیدا نشد</h1>
        <p className="text-sm text-muted">آدرس مورد نظر شما در سیستم یافت نشد.</p>
        <Link to="/">
          <Button variant="secondary" size="md">
            بازگشت به صفحه اصلی
          </Button>
        </Link>
      </div>
    </main>
  ),
})
