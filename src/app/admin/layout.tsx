import React from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { isAdminRole } from "@/lib/permissions";
import { DashboardShell } from "@/components/DashboardShell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const hdrs = await headers();
  const pathname = hdrs.get("x-pathname") || "";
  if (pathname === "/admin/login" || pathname === "/admin/setup") {
    return <>{children}</>;
  }

  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  if (!isAdminRole(user.role)) redirect("/dashboard");

  return (
    <DashboardShell
      user={{
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      }}
      mode="admin"
    >
      {children}
    </DashboardShell>
  );
}
