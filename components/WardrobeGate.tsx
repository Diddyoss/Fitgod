"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useWardrobe } from "@/store/wardrobe";

/**
 * Sends first-time users to onboarding — but only after zustand has rehydrated,
 * otherwise every reload flashes the onboarding screen before localStorage is read.
 * (Aura's ProfileGate, same idea.)
 */
export default function WardrobeGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const hydrated = useWardrobe((s) => s.hydrated);
  const count = useWardrobe((s) => s.garments.length);

  const onboarding = pathname?.startsWith("/onboarding") ?? false;

  useEffect(() => {
    if (!hydrated) return;
    if (count === 0 && !onboarding) router.replace("/onboarding");
  }, [hydrated, count, onboarding, router]);

  if (!hydrated) {
    return (
      <div className="mx-auto min-h-dvh w-full max-w-md px-5 pt-24">
        <div className="skeleton mb-3 h-8 w-40" />
        <div className="skeleton h-[420px] w-full rounded-2xl" />
      </div>
    );
  }

  return <>{children}</>;
}
