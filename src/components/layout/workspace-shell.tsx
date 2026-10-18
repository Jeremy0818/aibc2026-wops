"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useMockMode } from "@/hooks/use-meetings";
import { useAuth } from "@/hooks/use-auth";

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
    href: "/prepare",
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
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M10 3.5a3 3 0 00-3 3v3a3 3 0 006 0v-3a3 3 0 00-3-3z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M5.5 9.5a4.5 4.5 0 009 0M10 14v2.5M7.5 16.5h5"
        />
      </svg>
    ),
  },
  {
    label: "Proposals",
    href: "/proposals",
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
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4.5 3.5h11a1 1 0 011 1v11a1 1 0 01-1 1h-11a1 1 0 01-1-1v-11a1 1 0 011-1z"
        />
        <path strokeLinecap="round" d="M7.5 7.5h5M7.5 10.5h5M7.5 13.5h3" />
      </svg>
    ),
  },
];

export function WorkspaceShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { mockMode, toggleMockMode } = useMockMode();
  const {
    user,
    profile,
    loading: authLoading,
    error: authError,
    isConfigured: authConfigured,
    signInWithGoogle,
    signOut,
    clearError,
  } = useAuth();

  const isNavActive = (href: string, matchExact: boolean) => {
    if (matchExact) return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
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

          {/* Top Actions: Mode Switch & Google Auth */}
          <div className="flex items-center gap-2">
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

            {/* Google Authentication Control */}
            {authConfigured &&
              (authLoading ? (
                <div className="h-8 w-8 animate-pulse rounded-full bg-[#f4f1ea] border border-[#ebe6dd]" />
              ) : user ? (
                <div className="flex items-center gap-1.5">
                  <div
                    title={profile?.displayName || user.displayName || user.email || "Authenticated user"}
                    className="flex items-center gap-1.5 rounded-full border border-[#ebe6dd] bg-white py-1 pr-2.5 pl-1 text-xs text-[#1f1e1c]"
                  >
                    {user.photoURL ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={user.photoURL}
                        alt=""
                        className="h-5 w-5 rounded-full object-cover"
                      />
                    ) : (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#fdf1ec] text-[10px] font-bold text-[#d95d39]">
                        {(user.displayName || user.email || "U")[0].toUpperCase()}
                      </span>
                    )}
                    <span className="hidden max-w-[100px] truncate text-xs font-medium sm:inline">
                      {profile?.displayName || user.displayName || user.email?.split("@")[0]}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => void signOut()}
                    title="Sign out of Google"
                    className="rounded-full border border-[#ebe6dd] bg-white px-2.5 py-1 text-xs font-medium text-[#5c5852] transition hover:bg-[#f4f1ea] hover:text-[#1f1e1c]"
                  >
                    Sign out
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => void signInWithGoogle()}
                  className="inline-flex min-h-[34px] shrink-0 items-center gap-1.5 rounded-full border border-[#dcd4c6] bg-white px-3 py-1 text-xs font-medium text-[#1f1e1c] shadow-2xs transition hover:border-[#f5d5c8] hover:bg-[#fdf1ec]"
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Sign in</span>
                </button>
              ))}
          </div>
        </div>
      </header>

      {/* Dismissible Auth Error Banner */}
      {authError && (
        <div className="border-b border-red-200 bg-red-50 px-4 py-2 text-center text-xs text-red-800 flex items-center justify-center gap-2">
          <span>{authError}</span>
          <button
            type="button"
            onClick={clearError}
            className="text-[11px] font-bold text-red-900 underline ml-2"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Content Container — Sensible max-width for mobile & desktop */}
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-5 pb-28 sm:px-6 sm:pt-8 sm:pb-16">
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      <nav
        aria-label="Mobile navigation"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-[#ebe6dd] bg-white/95 px-3 py-1.5 backdrop-blur-md sm:hidden"
      >
        <div className="mx-auto grid max-w-md grid-cols-4 gap-1">
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
