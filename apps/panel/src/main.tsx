import React from 'react'
import ReactDOM from 'react-dom/client'
import { createRouter, RouterProvider } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'
import './styles/app.css'
const router = createRouter({
  routeTree,
  defaultPendingComponent: () => (
    <p className="shell" role="status">
      در حال دریافت اطلاعات…
    </p>
  ),
  defaultErrorComponent: () => (
    <div className="shell" role="alert">
      دریافت اطلاعات ممکن نشد. <button onClick={() => location.reload()}>تلاش دوباره</button>
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
