"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "TODO" },
  { href: "/stats", label: "統計" },
] as const;

export function NavLinks() {
  const pathname = usePathname();
  return (
    <nav aria-label="メイン" className="flex gap-1">
      {LINKS.map(({ href, label }) => {
        const active = href === "/" ? pathname === "/" || pathname.startsWith("/todos") : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground",
              active && "bg-muted font-medium text-foreground",
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
