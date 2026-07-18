import { useState, type ReactNode } from "react";
import { clsx } from "clsx";
import { Sidebar } from "./Sidebar";
import { PlanUpgradeBadge } from "./PlanUpgradeBadge";
import { useVisualViewportHeight } from "@/hooks/useVisualViewportHeight";
import logoUrl from "@/assets/brand/horizontal-dark.svg";

interface ChatLayoutProps {
  children: ReactNode;
}

export function ChatLayout({ children }: ChatLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const viewportHeight = useVisualViewportHeight();

  return (
    <div
      className="flex overflow-hidden bg-slate-900"
      style={{ height: viewportHeight }}
    >
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-black/50 sm:hidden"
          aria-hidden="true"
        />
      )}

      <div
        className={clsx(
          "fixed inset-y-0 right-0 z-40 transition-transform duration-300 sm:static sm:z-auto sm:translate-x-0",
          sidebarOpen ? "translate-x-0" : "translate-x-full",
        )}
      >
        <Sidebar onNavigate={() => setSidebarOpen(false)} />
      </div>

      <main className="flex flex-1 flex-col overflow-hidden">
        <div className="flex items-center gap-3 border-b border-slate-700/50 px-4 py-3 sm:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="size-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-700/60 hover:text-emerald-400 transition-colors"
            aria-label="باز کردن منو"
          >
            <svg viewBox="0 0 24 24" fill="none" className="size-5">
              <path
                d="M4 6h16M4 12h16M4 18h16"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>
          <img
            src={logoUrl}
            alt="نیوو"
            className="w-28 h-auto"
          />
          <div className="ms-auto">
            <PlanUpgradeBadge />
          </div>
        </div>
        {children}
      </main>
    </div>
  );
}
