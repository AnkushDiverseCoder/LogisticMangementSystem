"use client"

import * as React from "react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Cookies from "js-cookie"
import { LogOut, User, ChevronsUpDown } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export function VersionSwitcher() {
  const [user, setUser] = useState<any>(null)
  const router = useRouter()

  useEffect(() => {
    const authUser = Cookies.get("authUser")
    if (authUser) {
      setUser(JSON.parse(authUser))
    }
  }, [])

  const handleLogout = () => {
    Cookies.remove("authUser")
    setUser(null)
    router.push("/sign-in")
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                <User className="size-4" />
              </div>
              <div className="flex flex-col gap-0.5 leading-none">
                <span className="font-medium">
                  {user ? user.email : "Guest"}
                </span>
                <span className="text-xs text-muted-foreground">
                  {user ? "Account" : "Not signed in"}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width)"
            align="start"
          >
            {user ? (
              <DropdownMenuItem onSelect={handleLogout}>
                <LogOut className="mr-2 size-4" />
                Logout
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onSelect={() => router.push("/sign-in")}>
                Sign In
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
