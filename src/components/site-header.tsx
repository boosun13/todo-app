import { CheckSquareIcon } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { NavLinks } from "./nav-links";
import { ThemeToggle } from "./theme-toggle";

export function SiteHeader() {
  return (
    <header className="border-b">
      <div className="mx-auto flex h-14 max-w-3xl items-center gap-6 px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <CheckSquareIcon className="size-5" />
          TODO
        </Link>
        <Suspense fallback={null}>
          <NavLinks />
        </Suspense>
        <div className="ml-auto">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
