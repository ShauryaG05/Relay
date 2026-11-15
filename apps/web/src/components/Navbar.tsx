"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Laptop, Moon, Sun, LogOut, Radio } from "lucide-react";
import { api } from "@/lib/api";

export function Navbar() {
  const [isDark, setIsDark] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    // Theme initialization
    const savedTheme = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (savedTheme === "dark" || (!savedTheme && prefersDark)) {
      document.documentElement.classList.add("dark");
      setIsDark(true);
    }

    // User info
    api
      .getMe()
      .then((res) => setUserName(res.user.name || res.user.email))
      .catch(() => {});
  }, []);

  const toggleTheme = () => {
    if (isDark) {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
      setIsDark(false);
    } else {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
      setIsDark(true);
    }
  };

  const handleLogout = () => {
    api.clearToken();
    window.location.href = "/login";
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-card/80 backdrop-blur-md">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/devices" className="flex items-center gap-2 font-bold text-lg tracking-tight">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm">
            <Radio className="w-5 h-5" />
          </div>
          <span>Relay</span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-4">
          {userName && (
            <span className="hidden sm:inline-block text-xs font-medium text-muted-foreground">
              {userName}
            </span>
          )}

          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-muted-foreground hover:bg-muted transition-colors"
            title="Toggle theme"
            aria-label="Toggle theme"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {userName && (
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
