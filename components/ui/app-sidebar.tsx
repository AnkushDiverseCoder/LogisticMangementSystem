import * as React from "react"
import { VersionSwitcher } from "@/components/ui/version-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"

// This is sample data.
const data = {
  versions: ["1.0.1", "1.1.0-alpha", "2.0.0-beta1"],
  navMain: [
    {
      title: "Admin",
      url: "#",
      items: [
        {
          title: "Dashboard",
          url: "/",
        },
        {
          title: "Daily Entry",
          url: "/dailyentry",
        },
        // {
        //   title: "Trip Count",
        //   url: "/tripcount",
        // },
        // {
        //   title: "Disel Count",
        //   url: "/diselcount",
        // },
        {
          title: "Vehicle Entry",
          url: "/vehicleentry",
        },
        {
          title: "Site Entry",
          url: "/siteentry",
        },
        {
          title: "client Complaint",
          url: "/clientcomplaint",
        },
        // {
        //   title: "Create Transaction",
        //   url: "/createtransaction",
        // },
        {
          title: "Sign Up",
          url: "/signup",
        },
        {
          title: "Download",
          url: "/download",
        },

      ],
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <VersionSwitcher />
      </SidebarHeader>
      <SidebarContent>
        {/* We create a SidebarGroup for each parent. */}
        {data.navMain.map((item) => (
          <SidebarGroup key={item.title}>
            <SidebarGroupLabel>{item.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {item.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <a href={item.url}>{item.title}</a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
