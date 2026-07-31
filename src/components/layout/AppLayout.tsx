import { useState } from "react"
import { Outlet } from "react-router"

import { Header } from "@/components/layout/Header"
import { Sidebar } from "@/components/layout/Sidebar"
import { PullToRefresh } from "@/components/PullToRefresh"

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
        <PullToRefresh>
          <Outlet />
        </PullToRefresh>
      </div>

      {/*
        Standalone iOS: paint the physical home-indicator band explicitly so
        rubber-band / swipe gestures never reveal a default browser strip.
      */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[70] bg-background"
        style={{
          height: "env(safe-area-inset-bottom, 0px)",
          ...themeBackgroundStyle,
        }}
      />
    </div>
  )
}
