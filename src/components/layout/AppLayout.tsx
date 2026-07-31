import { useState } from "react"
import { Outlet } from "react-router"

import { Header } from "@/components/layout/Header"
import { Sidebar } from "@/components/layout/Sidebar"
import { PullToRefresh } from "@/components/PullToRefresh"

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-dvh min-h-dvh flex-col bg-background">
      <Header onOpenSidebar={() => setSidebarOpen(true)} />
      <div className="flex min-h-0 flex-1 bg-background pl-[env(safe-area-inset-left,0px)] pr-[env(safe-area-inset-right,0px)]">
        <Sidebar open={sidebarOpen} onOpenChange={setSidebarOpen} />
        <PullToRefresh>
          <Outlet />
        </PullToRefresh>
      </div>
    </div>
  )
}
