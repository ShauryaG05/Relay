"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Laptop, PlusCircle, History, Settings } from "lucide-react";
import { clsx } from "clsx";

export function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    { label: "Devices", href: "/devices", icon: Laptop },
    { label: "Pair", href: "/pair", icon: PlusCircle },
    { label: "Audit", href: "/audit", icon: History },
    { label: "Settings", href: "/settings", icon: Settings },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border sm:hidden pb-safe">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href || (item.href === "/devices" && pathname.startsWith("/devices"));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex flex-col items-center justify-center flex-1 h-full py-1 text-xs font-medium transition-colors",
                isActive
                  ? "text-blue-600 dark:text-blue-400 font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className={clsx("w-5 h-5 mb-1", isActive ? "stroke-[2.5]" : "stroke-2")} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
