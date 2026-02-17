"use client";
import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import React from "react";
import { Sidebar } from "./sidebar";

type Props = {
  children: React.ReactNode;
};

const AuthGate = ({ children }: Props): React.ReactNode => {
  const router = useRouter();
  const pathname = usePathname();
  const { status } = useSession();

  // Let login page render without auth check
  if (pathname === "/login") {
    return <>{children}</>;
  }

  if (status === "loading") {
    return null;
  }

  if (status === "unauthenticated") {
    router.push("/login");
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
};

export default AuthGate;