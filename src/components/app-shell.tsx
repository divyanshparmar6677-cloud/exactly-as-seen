import { Link } from "@tanstack/react-router";
import { Leaf, Menu, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";

const NAV = [
  { to: "/", label: "Dashboard" },
  { to: "/electricity", label: "Electricity" },
  { to: "/water", label: "Water" },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b bg-card/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground"><Leaf className="size-5" /></span>
            <span className="leading-tight">
              <span className="block font-display text-base font-semibold">SVVV Smart Campus</span>
              <span className="block text-[11px] text-muted-foreground">Powered by EcoTrack AI</span>
            </span>
          </Link>
          <nav className="ml-auto hidden gap-1 lg:flex">
            {NAV.map((n) => (
              <Link key={n.to} to={n.to} activeOptions={{ exact: n.to === "/" }}
                className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                activeProps={{ className: "bg-secondary text-secondary-foreground font-semibold" }}>
                {n.label}
              </Link>
            ))}
          </nav>
          <button className="ml-auto rounded-lg p-2 lg:hidden" onClick={() => setOpen(!open)} aria-label="Menu">
            {open ? <X /> : <Menu />}
          </button>
        </div>
        {open && (
          <nav className="grid gap-1 border-t px-4 py-2 lg:hidden">
            {NAV.map((n) => (
              <Link key={n.to} to={n.to} onClick={() => setOpen(false)} activeOptions={{ exact: n.to === "/" }}
                className="rounded-lg px-3 py-2 text-sm" activeProps={{ className: "bg-secondary font-semibold" }}>{n.label}</Link>
            ))}
          </nav>
        )}
      </header>
      <div className="border-b bg-warning/25 px-4 py-1.5 text-center text-xs text-warning-foreground">
        Demo mode: records tagged <Badge variant="outline" className="mx-1 px-1.5 py-0 text-[10px]">Simulated</Badge> are sample values, not real SVVV measurements. No live sensors are connected.
      </div>
      <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        KAUSHAL 8.0 · Technologies Beyond Boundaries · PS-04 Sustainable Tech Without Limits · Shri Vaishnav Vidyapeeth Vishwavidyalaya, Indore
      </footer>
    </div>
  );
}
