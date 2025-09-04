"use client";

import { useRouter, usePathname } from "next/navigation";
import React, { useEffect, useState } from "react";
import Cookies from "js-cookie";
import { AppSidebar } from "@/components/ui/app-sidebar";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [checked, setChecked] = useState(false);

    useEffect(() => {
        const authUser = Cookies.get("authUser");
        if (!authUser) {
            router.replace("/sign-in"); // 🔐 protect dashboard
        } else {
            setChecked(true);
        }
    }, [router]);

    if (!checked) {
        return (
            <div className="flex h-screen items-center justify-center">Loading...</div>
        );
    }

    return (
        <SidebarProvider>
            <AppSidebar />
            <div className="flex flex-col flex-1">
                {/* Header with dynamic breadcrumbs */}
                <header className="flex h-16 shrink-0 items-center justify-between border-b px-4">
                    <div className="flex items-center gap-2">
                        <SidebarTrigger className="-ml-1" />
                        {/* <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
                        <Breadcrumb>
                            <BreadcrumbList>
                                {segments.map((seg, idx) => {
                                    const isLast = idx === segments.length - 1;
                                    const href = "/" + segments.slice(0, idx + 1).join("/");
                                    return (
                                        <React.Fragment key={href}>
                                            <BreadcrumbItem className={isLast ? "font-semibold" : "hidden md:block"}>
                                                {isLast ? (
                                                    <BreadcrumbPage>{formatSegment(seg)}</BreadcrumbPage>
                                                ) : (
                                                    <BreadcrumbLink href={href}>{formatSegment(seg)}</BreadcrumbLink>
                                                )}
                                            </BreadcrumbItem>
                                            {!isLast && <BreadcrumbSeparator className="hidden md:block" />}
                                        </React.Fragment>
                                    );
                                })}
                            </BreadcrumbList>
                        </Breadcrumb> */}
                    </div>
                </header>

                {/* Page content */}
                <SidebarInset>{children}</SidebarInset>
            </div>
        </SidebarProvider>
    );
}
