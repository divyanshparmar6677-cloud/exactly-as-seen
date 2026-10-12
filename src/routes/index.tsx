import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Cloud, Droplets, IndianRupee, Trash2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartCard, MiniBar, MiniLine, Stat } from "@/components/kit";
import heroImg from "@/assets/campus-hero.jpg";
import {
  ASSUMPTIONS, bySection, dailySeries, fmt, ruleBasedAdvice, totals, within, WASTE_CATEGORIES, sum,
  useActions, useElectricity, useReports, useSections, useUpdate, useWaste, useWater,
} from "@/lib/campus";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — SVVV Smart Campus | EcoTrack AI" },
      { name: "description", content: "Campus-wide electricity, water, waste and carbon dashboard for SVVV Indore's sustainability project." },
      { property: "og:title", content: "SVVV Smart Campus Sustainability Dashboard" },
      { property: "og:description", content: "Track resource use, spot wastage and take measurable action across campus." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const sections = useSections().data ?? [];
  const e = useElectricity().data ?? [];
  const w = useWater().data ?? [];
  const ws = useWaste().data ?? [];
  const reports = useReports().data ?? [];
  const actions = useActions().data ?? [];
  const toggle = useUpdate("sustainability_actions");

  const e30 = within(e, 30), w30 = within(w, 30), ws30 = within(ws, 30);
  const t = totals(e30, w30, ws30);
  const done = actions.filter((a) => a.completed).length;
  const top = ruleBasedAdvice(sections, e, w, ws, reports).slice(0, 3);
  const wasteCat = WASTE_CATEGORIES.map((c) => ({ name: c, value: Math.round(sum(ws30.filter((r) => r.category === c).map((r) => r.kg))) }));

  return (
    <div className="grid gap-8">
      <section className="relative overflow-hidden rounded-3xl bg-hero-gradient text-hero-foreground">
        <img src={heroImg} alt="Illustration of a green university campus" className="absolute inset-0 h-full w-full object-cover opacity-25 mix-blend-luminosity" />
        <div className="leaf-grid absolute inset-0" />
        <div className="relative grid gap-6 p-8 md:p-12">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] opacity-80">KAUSHAL 8.0 · PS-04 Sustainable Tech Without Limits</p>
          <h1 className="max-w-3xl text-4xl font-semibold leading-tight md:text-6xl">SVVV Smart Campus</h1>
          <p className="-mt-3 text-lg opacity-90">Powered by EcoTrack AI</p>
          <p className="max-w-2xl opacity-90">Helping administrators and students at Shri Vaishnav Vidyapeeth Vishwavidyalaya, Indore track resource consumption, spot wastage and take measurable action.</p>
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="secondary"><Link to="/electricity">Add a record</Link></Button>
            <Button asChild variant="outline" className="border-hero-foreground/40 bg-transparent text-hero-foreground hover:bg-hero-foreground/10 hover:text-hero-foreground"><Link to="/water">Water tracker</Link></Button>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-baseline justify-between"><h2 className="text-2xl font-semibold">Last 30 days</h2><span className="text-xs text-muted-foreground">Includes simulated sample data</span></div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Stat label="Electricity" value={fmt(t.kwh)} unit="kWh" icon={<Zap className="size-4" />} />
          <Stat label="Water" value={fmt(t.litres)} unit="litres" icon={<Droplets className="size-4" />} />
          <Stat label="Waste generated" value={fmt(t.kg)} unit="kg" icon={<Trash2 className="size-4" />} />
          <Stat label="Estimated emissions" value={fmt(t.co2 / 1000, 2)} unit="t CO₂e" icon={<Cloud className="size-4" />} hint={`${ASSUMPTIONS.gridEmissionKgPerKwh} kg/kWh · ${ASSUMPTIONS.wasteEmissionKgPerKg} kg/kg waste`} />
          <Stat label="Potential savings" value={`₹${fmt(t.savingInr)}`} icon={<IndianRupee className="size-4" />} hint={`${fmt(t.savingKwh)} kWh + ${fmt(t.savingL)} L avoidable (assumed)`} />
          <Stat label="Completed actions" value={`${done}/${actions.length}`} icon={<CheckCircle2 className="size-4" />} />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Electricity — daily (kWh)"><MiniLine data={dailySeries(e, (r) => r.kwh)} x="date" unit="kWh" /></ChartCard>
        <ChartCard title="Water — daily (litres)"><MiniLine data={dailySeries(w, (r) => r.litres)} x="date" color="var(--color-chart-3)" unit="L" /></ChartCard>
        <ChartCard title="Waste by category — 30 days (kg)"><MiniBar data={wasteCat} x="name" color="var(--color-chart-5)" unit="kg" /></ChartCard>
        <ChartCard title="Electricity by section — 30 days (kWh)"><MiniBar data={bySection(e30, sections, (r) => r.kwh)} x="name" color="var(--color-chart-2)" unit="kWh" /></ChartCard>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between"><CardTitle className="font-display text-lg">Top insights (rule-based)</CardTitle>
            <Button asChild size="sm" variant="ghost"><Link to="/electricity">Electricity →</Link></Button></CardHeader>
          <CardContent className="grid gap-3">
            {top.map((r) => (
              <div key={r.title} className="rounded-xl border bg-muted/40 p-4">
                <p className="text-xs font-semibold uppercase text-primary">{r.priority} · {r.resource}</p>
                <p className="font-semibold">{r.title}</p>
                <p className="text-sm text-muted-foreground">{r.detail}</p>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="font-display text-lg">Sustainability actions</CardTitle></CardHeader>
          <CardContent className="grid gap-2">
            {actions.map((a) => (
              <label key={a.id} className="flex cursor-pointer items-center gap-3 rounded-lg p-2 hover:bg-muted">
                <input type="checkbox" className="size-4 accent-primary" checked={a.completed} onChange={() => toggle.mutate({ id: a.id, patch: { completed: !a.completed } })} />
                <span className={a.completed ? "text-muted-foreground line-through" : ""}>{a.title}</span>
              </label>
            ))}
          </CardContent>
        </Card>
      </section>

      <section>
        <h2 className="mb-3 text-2xl font-semibold">Campus overview</h2>
        <p className="mb-4 text-sm text-muted-foreground">Configurable sections — not a verified list of SVVV facilities. Edit them on the Campus Sections page.</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sections.map((s) => {
            const k = sum(e30.filter((r) => r.section_id === s.id).map((r) => r.kwh));
            const l = sum(w30.filter((r) => r.section_id === s.id).map((r) => r.litres));
            const g = sum(ws30.filter((r) => r.section_id === s.id).map((r) => r.kg));
            return (
              <Card key={s.id}><CardContent className="p-5">
                <p className="font-display text-lg font-semibold">{s.name}</p>
                <p className="mb-3 text-xs text-muted-foreground">{s.description}</p>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div><p className="text-xs text-muted-foreground">kWh</p><p className="font-semibold">{fmt(k)}</p></div>
                  <div><p className="text-xs text-muted-foreground">Litres</p><p className="font-semibold">{fmt(l)}</p></div>
                  <div><p className="text-xs text-muted-foreground">Waste kg</p><p className="font-semibold">{fmt(g)}</p></div>
                </div>
              </CardContent></Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}
