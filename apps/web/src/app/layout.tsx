import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { BottomNav } from "@/components/BottomNav";
import type { Viewport, Metadata } from "next";
import { GraphHelpers } from "next/dist/compiled/webpack/webpack";

export const metadata: Metadata = {
  title: "Relay - Secure Mac Remote Control",
  description: "Secure remote control and telemetry for macOS from any browser",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="flex flex-col min-h-screen pb-16 sm:pb-0">
        <Navbar />
        <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6">{children}</main>
        <BottomNav />
      </body>
    </html>
  );
}



// upload paper repo 

// answer based on that 


// 2. RAG -> Document (knowledge Graph)

