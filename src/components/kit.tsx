import type { ReactNode } from "react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import type { Section } from "@/lib/campus";

export function PageHeader({ eyebrow, title, desc, children }: { eyebrow: string; title: string; desc?: string; children?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">{eyebrow}</p>
        <h1 className="mt-1 text-3xl font-semibold md:text-4xl">{title}</h1>
        {desc && <p className="mt-2 max-w-2xl text-muted-foreground">{desc}</p>}
      </div>
      {children}
    </div>
  );
}

export function Stat({ label, value, unit, icon, hint }: { label: string; value: string; unit?: string; icon: ReactNode; hint?: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="text-sm">{label}</span>
          <span className="grid size-8 place-items-center rounded-lg bg-secondary text-primary">{icon}</span>
        </div>
        <p className="mt-3 font-display text-3xl font-semibold">
          {value} {unit && <span className="font-sans text-sm font-medium text-muted-foreground">{unit}</span>}
        </p>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

export const SimBadge = ({ sim }: { sim: boolean }) =>
  sim ? <Badge variant="outline" className="border-warning bg-warning/20 text-[10px] text-warning-foreground">Simulated</Badge>
      : <Badge className="text-[10px]">Recorded</Badge>;

export function ChartCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="font-display text-lg">{title}</CardTitle></CardHeader>
      <CardContent className="h-64">{children}</CardContent>
    </Card>
  );
}

const axis = { stroke: "var(--color-muted-foreground)", fontSize: 11 };
const tip = { contentStyle: { background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 10, fontSize: 12 } };

export function MiniBar({ data, x, color = "var(--color-chart-1)", unit }: { data: Record<string, unknown>[]; x: string; color?: string; unit?: string }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        <CartesianGrid vertical={false} stroke="var(--color-border)" />
        <XAxis dataKey={x} tick={axis} tickLine={false} axisLine={false} interval={0} angle={data.length > 7 ? -30 : 0} textAnchor={data.length > 7 ? "end" : "middle"} height={data.length > 7 ? 50 : 30} />
        <YAxis tick={axis} tickLine={false} axisLine={false} width={50} />
        <Tooltip {...tip} formatter={(v: number) => [`${v.toLocaleString("en-IN")} ${unit ?? ""}`, "Value"]} />
        <Bar dataKey="value" fill={color} radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function MiniLine({ data, x, color = "var(--color-chart-1)", unit }: { data: Record<string, unknown>[]; x: string; color?: string; unit?: string }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        <CartesianGrid vertical={false} stroke="var(--color-border)" />
        <XAxis dataKey={x} tick={axis} tickLine={false} axisLine={false} />
        <YAxis tick={axis} tickLine={false} axisLine={false} width={50} />
        <Tooltip {...tip} formatter={(v: number) => [`${v.toLocaleString("en-IN")} ${unit ?? ""}`, "Value"]} />
        <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function SectionSelect({ sections, value, onChange, allowNone }: { sections: Section[]; value: string; onChange: (v: string) => void; allowNone?: boolean }) {
  return (
    <div className="grid gap-1.5">
      <Label>Campus section</Label>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="h-9 rounded-md border border-input bg-card px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <option value="">{allowNone ? "Not specific" : "Select…"}</option>
        {sections.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
    </div>
  );
}

export const NativeSelect = ({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) => (
  <div className="grid gap-1.5">
    <Label>{label}</Label>
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="h-9 rounded-md border border-input bg-card px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </div>
);
