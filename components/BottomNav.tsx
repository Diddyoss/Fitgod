"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Shirt, Sparkles, Heart, User } from "lucide-react";

const TABS = [
  { href: "/", label: "Today", Icon: Sparkles },
  { href: "/wardrobe", label: "Wardrobe", Icon: Shirt },
  { href: "/saved", label: "Saved", Icon: Heart },
  { href: "/profile", label: "You", Icon: User },
] as const;

export default function BottomNav() {
  const pathname = usePathname();
  if (pathname?.startsWith("/onboarding")) return null;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-hairline bg-base/90 backdrop-blur">
      <ul className="mx-auto flex w-full max-w-md items-stretch justify-around px-2 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:max-w-lg">
        {TABS.map(({ href, label, Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname?.startsWith(href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-[44px] flex-col items-center justify-center gap-1 rounded-xl py-1 text-[11px] tracking-wide transition-colors ${
                  active ? "text-accent" : "text-ink-2 hover:text-ink"
                }`}
              >
                <Icon size={20} strokeWidth={active ? 2.2 : 1.8} aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
