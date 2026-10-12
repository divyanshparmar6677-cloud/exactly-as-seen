import { createFileRoute, Link } from "@tanstack/react-router";
import { Droplets, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader, Stat } from "@/components/kit";
import { ResourceTracker, TipList } from "@/components/resource-tracker";
import { ASSUMPTIONS, fmt, sum, useInsert, useReports, useSections, useWater, waterSchema, within } from "@/lib/campus";

export const Route = createFileRoute("/water")({
  head: () => ({
    meta: [
      { title: "Water Tracker — SVVV Smart Campus" },
      { name: "description", content: "Record water consumption by campus section, report wastage and view trends." },
      { property: "og:title", content: "Water Tracker — SVVV Smart Campus" },
      { property: "og:description", content: "Water trends, wastage reports and water-saving suggestions." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

function Page() {
  const sections = useSections().data ?? [];
  const rows = useWater().data ?? [];
  const reports = useReports().data ?? [];
  const insert = useInsert("water_records");
  const l7 = sum(within(rows, 7).map((r) => r.litres));
  const open = reports.filter((r) => r.resource === "water" && r.kind === "wastage" && r.status !== "resolved").length;
  return (
    <>
      <PageHeader eyebrow="Feature 2" title="Water Tracker" desc="Record water consumption and flag leaks or wastage.">
        <Button asChild><Link to="/participate">Submit a wastage report</Link></Button>
      </PageHeader>
      <ResourceTracker rows={rows} sections={sections} field="litres" unit="litres" schema={waterSchema} color="var(--color-chart-3)"
        pending={insert.isPending} onSubmit={(v) => insert.mutateAsync(v)}
        tips={<>
          <div className="grid gap-4 sm:grid-cols-2">
            <Stat label="Last 7 days" value={fmt(l7)} unit="litres" icon={<Droplets className="size-4" />}
              hint={`Potential saving ${fmt(l7 * ASSUMPTIONS.avoidableWaterShare)} L/week (${ASSUMPTIONS.avoidableWaterShare * 100}% assumed)`} />
            <Stat label="Open wastage reports" value={String(open)} icon={<AlertTriangle className="size-4" />} />
          </div>
          <TipList title="Water-saving suggestions" items={[
            "Fit low-flow aerators on washroom and canteen taps (30–50% flow reduction).",
            "Fix dripping taps quickly — one drip/second wastes ~15 L/day.",
            "Water gardens early morning or evening; reuse RO reject water for cleaning.",
            "Check overhead tank float valves to stop overflow.",
          ]} />
        </>} />
    </>
  );
}
