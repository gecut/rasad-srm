import React from 'react'
import ReactDOM from 'react-dom/client'
import { createRouter, RouterProvider } from '@tanstack/react-router'
import { Button, Spinner } from '@heroui/react'
import { routeTree } from './routeTree.gen'
import './styles/app.css'

const router = createRouter({
  routeTree,
  defaultPendingComponent: () => (
    <div className="shell flex items-center justify-center min-h-[50vh] gap-3" role="status">
      <Spinner size="md" />
      <span className="text-muted text-sm">در حال دریافت اطلاعات…</span>
    </div>
  ),
  defaultErrorComponent: () => (
    <div className="shell py-8" role="alert">
      <div className="bg-danger/10 border border-danger/30 rounded-lg p-4 flex items-center justify-between gap-4">
        <span className="text-sm text-danger font-medium">دریافت اطلاعات ممکن نشد.</span>
        <Button size="sm" variant="outline" onPress={() => location.reload()}>
          تلاش دوباره
        </Button>
      </div>
    </div>
  ),
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
)
