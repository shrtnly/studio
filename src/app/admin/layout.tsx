"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import AdminShell from "@/components/admin/AdminShell";
import PendingApprovalView from "@/components/admin/PendingApprovalView";
import { Loader2 } from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, isApproved, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground animate-pulse">Verifying security credentials & permissions...</p>
      </div>
    );
  }

  // Not authenticated -> redirected to /login by useEffect
  if (!user) {
    return null;
  }

  // Authenticated BUT manual approval is pending -> Render Access Restricted / Pending screen!
  if (!isApproved) {
    return <PendingApprovalView />;
  }

  // Fully authenticated and approved by Supabase -> Render Admin Portal!
  return <AdminShell>{children}</AdminShell>;
}
