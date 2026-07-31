import { useState } from "react"
import { Outlet } from "react-router"

import { Header } from "@/components/layout/Header"
import { Sidebar } from "@/components/layout/Sidebar"
import { PullToRefresh } from "@/components/PullToRefresh"

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-background">
      <Header onOpenSidebar={() => setSidebarOpen(true)} />
      <div className="relative min-h-0 flex-1 bg-background pl-[env(safe-area-inset-left,0px)] pr-[env(safe-area-inset-right,0px)]">
        <div className="flex h-full min-h-0">
          <Sidebar open={sidebarOpen} onOpenChange={setSidebarOpen} />
          <div className="relative min-h-0 min-w-0 flex-1">
            <PullToRefresh className="app-content bg-background pb-[env(safe-area-inset-bottom,0px)]">
              <Outlet />
            </PullToRefresh>
          </div>
        </div>
      </div>
    </div>
  )
}
