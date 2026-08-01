import { useState } from "react"
import { Outlet } from "react-router"

import { Header } from "@/components/layout/Header"
import { Sidebar } from "@/components/layout/Sidebar"

// Diagnostic: temporarily unused to test bottom strip without PTR.
// import { PullToRefresh } from "@/components/PullToRefresh"

const themeBackgroundStyle = { backgroundColor: "hsl(var(--background))" } as const

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-dvh min-h-dvh flex-col bg-background" style={themeBackgroundStyle}>
      <Header onOpenSidebar={() => setSidebarOpen(true)} />
      <div
        className="flex min-h-0 flex-1 bg-background pl-[env(safe-area-inset-left,0px)] pr-[env(safe-area-inset-right,0px)]"
        style={themeBackgroundStyle}
      >
        <Sidebar open={sidebarOpen} onOpenChange={setSidebarOpen} />
        {/* Diagnostic: PullToRefresh temporarily disabled — restore after device test.
        <PullToRefresh>
          <Outlet />
        </PullToRefresh>
        */}
        <div
          className="min-h-0 min-w-0 flex-1 overflow-y-auto bg-background pb-[env(safe-area-inset-bottom,0px)]"
          style={themeBackgroundStyle}
        >
          <Outlet />
        </div>
      </div>
    </div>
  )
}
