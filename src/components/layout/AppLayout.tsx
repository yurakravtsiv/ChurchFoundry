import { useState } from "react"
import { Outlet } from "react-router"

import { Header } from "@/components/layout/Header"
import { Sidebar } from "@/components/layout/Sidebar"

const themeBackgroundStyle = { backgroundColor: "hsl(var(--background))" } as const

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div
      className="flex h-[var(--app-height)] max-h-[var(--app-height)] flex-col overflow-hidden bg-background"
      style={themeBackgroundStyle}
    >
      <Header onOpenSidebar={() => setSidebarOpen(true)} />
      <div
        className="flex min-h-0 flex-1 overflow-hidden bg-background pl-[env(safe-area-inset-left,0px)] pr-[env(safe-area-inset-right,0px)]"
        style={themeBackgroundStyle}
      >
        <Sidebar open={sidebarOpen} onOpenChange={setSidebarOpen} />
        <div
          className="relative flex min-h-0 min-w-0 flex-1 flex-col bg-background"
          style={themeBackgroundStyle}
        >
          <div
            className="relative min-h-0 flex-1 overflow-y-auto overscroll-y-contain bg-background"
            style={themeBackgroundStyle}
          >
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  )
}
