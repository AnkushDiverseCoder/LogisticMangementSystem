"use client";

import * as React from "react";
import { VersionSwitcher } from "@/components/ui/version-switcher";
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
} from "@/components/ui/sidebar";
import Link from "next/link";
import {
  Home,
  Calendar,
  Truck,
  Fuel,
  MapPin,
  Users,
  FileText,
  DollarSign,
  UserPlus,
  UploadCloud,
  DownloadCloud,
} from "lucide-react"; // <-- icons

// Menu data with icons
const data = {
  navMain: [
    {
      title: "Admin",
      items: [
        { title: "Dashboard", url: "/", icon: <Home className="w-4 h-4 mr-2" /> },
        { title: "Daily Entry", url: "/dailyentry", icon: <Calendar className="w-4 h-4 mr-2" /> },
        { title: "Trip Count", url: "/tripcount", icon: <Truck className="w-4 h-4 mr-2" /> },
        { title: "Disel Count", url: "/diselcount", icon: <Fuel className="w-4 h-4 mr-2" /> },
        { title: "Vehicle Entry", url: "/vehicleentry", icon: <Truck className="w-4 h-4 mr-2" /> },
        { title: "Site Entry", url: "/siteentry", icon: <MapPin className="w-4 h-4 mr-2" /> },
        { title: "Client Complaint", url: "/clientcomplaint", icon: <Users className="w-4 h-4 mr-2" /> },
        { title: "Create Daily Entry", url: "/createdailyentry", icon: <FileText className="w-4 h-4 mr-2" /> },
        { title: "Validity", url: "/validity", icon: <FileText className="w-4 h-4 mr-2" /> },
        { title: "Advance Entry", url: "/advance-entry", icon: <DollarSign className="w-4 h-4 mr-2" /> },
        { title: "Sign Up", url: "/signup", icon: <UserPlus className="w-4 h-4 mr-2" /> },
        { title: "Vechicle Management", url: "/management", icon: <Truck className="w-4 h-4 mr-2" /> },
        { title: "File Upload", url: "/fileupload", icon: <UploadCloud className="w-4 h-4 mr-2" /> },
        { title: "Download", url: "/download", icon: <DownloadCloud className="w-4 h-4 mr-2" /> },
        { title: "Driver Details", url: "/driver-detail", icon: <Truck className="w-4 h-4 mr-2" /> },
      ],
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <VersionSwitcher />
      </SidebarHeader>
      <SidebarContent>
        {data.navMain.map((group) => (
          <SidebarGroup key={group.title}>
            <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <Link href={item.url} className="flex items-center">
                        {item.icon}
                        {item.title}
                      </Link>
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
  );
}
