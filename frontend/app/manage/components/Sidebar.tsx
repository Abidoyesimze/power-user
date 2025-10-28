"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Sidebar() {
  const pathname = usePathname();

  const navItems = [
    { href: "/manage", label: "My Domains", icon: "📋" },
    { href: "/manage/register", label: "Register", icon: "✨" },
    { href: "/manage/renew", label: "Renew", icon: "🔄" },
    { href: "/manage/update", label: "Update", icon: "⚙️" },
  ];

  return (
    <aside className="w-64 bg-gray-900 border-r border-gray-800 min-h-screen">
      <div className="sticky top-20">
        <nav className="p-4 space-y-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? "bg-purple-600/20 text-purple-400 border-l-4 border-purple-500"
                    : "text-gray-400 hover:text-white hover:bg-gray-800"
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}

