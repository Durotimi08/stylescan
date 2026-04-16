import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

export const metadata: Metadata = {
  title: "StyleScan — Design DNA for AI Agents",
  description:
    "Extract the design language of any webpage into a design.md file that AI coding agents can use.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en" className="dark">
        <body className="bg-[#08090A] text-[#F7F8F8] antialiased">
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
