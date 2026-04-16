import Link from "next/link";
import { UserButton } from "@clerk/nextjs";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-56 border-r border-[#23252A] flex flex-col">
        <div className="h-[52px] flex items-center px-4 border-b border-[#23252A]">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-[#5E6AD2] flex items-center justify-center text-xs font-bold">
              S
            </div>
            <span className="text-sm font-semibold">StyleScan</span>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {[
            { href: "/dashboard", label: "Scans", icon: "scan" },
            { href: "/dashboard/settings", label: "Settings", icon: "settings" },
          ].map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2 px-3 py-2 text-sm text-[#8A8F98] hover:text-[#F7F8F8] hover:bg-[#1A1B1E] rounded-md transition-colors"
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="p-3 border-t border-[#23252A]">
          <div className="flex items-center gap-2 px-2">
            <UserButton afterSignOutUrl="/" />
            <span className="text-xs text-[#62666D]">Account</span>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
