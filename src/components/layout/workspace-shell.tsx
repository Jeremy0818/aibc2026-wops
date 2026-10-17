"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useMockMode } from "@/hooks/use-meetings";

const DESTINATIONS = [
  {
    label: "Home",
    href: "/",
    matchExact: true,
    icon: (
      <svg
        aria-hidden="true"
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        className="h-4 w-4"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3.5 8.5L10 3l6.5 5.5v7a1.5 1.5 0 01-1.5 1.5h-10A1.5 1.5 0 013.5 15.5v-7z"
        />
      </svg>
    ),
  },
  {
    label: "Meetings",
    href: "/meetings",
    matchExact: false,
    icon: (
      <svg
        aria-hidden="true"
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        className="h-4 w-4"
      >
        <rect x="3.5" y="4.5" width="13" height="12" rx="2" />
        <path strokeLinecap="round" d="M7 3v3M13 3v3M3.5 8.5h13" />
      </svg>
    ),
  },
  {
    label: "Prepare",
    href: "/meetings/new",
    matchExact: true,
    icon: (
      <svg
        aria-hidden="true"
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        className="h-4 w-4"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 4.5v11M4.5 10h11" />
      </svg>
    ),
  },
];

export function WorkspaceShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { mockMode, toggleMockMode } = useMockMode();

  const isNavActive = (href: string, matchExact: boolean) => {
    if (matchExact) return pathname === href;
    if (href === "/meetings" && pathname === "/meetings/new") return false;
    return pathname.startsWith(href);
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#faf9f6] text-[#1f1e1c]">
      {/* Clean Top Header */}
      <header className="sticky top-0 z-20 border-b border-[#ebe6dd]/80 bg-[#faf9f6]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-2 px-4 py-3 sm:px-6">
          {/* Brand Identity */}
          <Link
            href="/"
            className="group flex min-w-0 items-center gap-2.5 rounded-full py-1 pr-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d95d39]"
          >
            <span
              aria-hidden="true"
              className="wops-assistant-orb flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white shadow-xs transition group-hover:scale-105"
            >
              ✦
            </span>
            <div className="min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="text-base font-semibold tracking-tight text-[#1f1e1c]">
                  WOPS!
                </span>
                <span className="hidden text-xs text-[#8a847c] sm:inline">
                  Less Chit. More Chat.
                </span>
              </div>
            </div>
          </Link>

          {/* Desktop Restrained Navigation */}
          <nav
            aria-label="Primary navigation"
            className="hidden items-center gap-1 rounded-full border border-[#ebe6dd] bg-white p-1 sm:flex"
          >
            {DESTINATIONS.map((item) => {
              const active = isNavActive(item.href, item.matchExact);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d95d39] ${
                    active
                      ? "bg-[#1f1e1c] text-white"
                      : "text-[#5c5852] hover:bg-[#f4f1ea] hover:text-[#1f1e1c]"
                  }`}
                >
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Subtle Mode Switch (Preserves Mock / Live toggle) */}
          <button
            type="button"
            onClick={() => toggleMockMode()}
            aria-pressed={mockMode}
            title="Switch between KOVA demo mode and Live backend API"
            className={`inline-flex min-h-[34px] shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d95d39] ${
              mockMode
                ? "border-[#f5d5c8] bg-[#fdf1ec] text-[#b44322] hover:bg-[#fae5dc]"
                : "border-[#ebe6dd] bg-white text-[#5c5852] hover:bg-[#f4f1ea]"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                mockMode ? "bg-[#d95d39]" : "bg-emerald-600"
              }`}
            />
            <span>{mockMode ? "Demo mode" : "Live API"}</span>
          </button>
        </div>
      </header>

      {/* Main Content Container — Sensible max-width for mobile & desktop */}
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-5 pb-28 sm:px-6 sm:pt-8 sm:pb-16">
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      <nav
        aria-label="Mobile navigation"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-[#ebe6dd] bg-white/95 px-3 py-1.5 backdrop-blur-md sm:hidden"
      >
        <div className="mx-auto grid max-w-md grid-cols-3 gap-1">
          {DESTINATIONS.map((item) => {
            const active = isNavActive(item.href, item.matchExact);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex min-h-[48px] flex-col items-center justify-center gap-1 rounded-2xl px-2 py-1 text-[11px] font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d95d39] ${
                  active
                    ? "bg-[#fdf1ec] text-[#d95d39]"
                    : "text-[#5c5852] hover:bg-[#faf9f6] hover:text-[#1f1e1c]"
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
