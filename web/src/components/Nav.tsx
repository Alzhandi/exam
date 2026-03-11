"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function NavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active = pathname === href;
  return (
    <Link
      href={href}
      className={
        "rounded-xl px-3 py-2 text-sm transition " +
        (active ? "bg-zinc-900 text-white" : "text-zinc-700 hover:bg-zinc-100")
      }
    >
      {label}
    </Link>
  );
}

export function Nav() {
  return (
    <div className="sticky top-0 z-10 border-b border-zinc-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="font-semibold tracking-tight">
          ИГА Prep
        </Link>
        <div className="flex items-center gap-1">
          <NavLink href="/question-bank" label="Банк" />
          <NavLink href="/practice" label="Практика" />
          <NavLink href="/mock" label="Экзамен" />
          <NavLink href="/stats" label="Прогресс" />
        </div>
      </div>
    </div>
  );
}

