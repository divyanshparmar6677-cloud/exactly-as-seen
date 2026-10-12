import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Stat } from "@/components/kit";
import { ResourceTracker, TipList } from "@/components/resource-tracker";
import { Zap, IndianRupee } from "lucide-react";
import { ASSUMPTIONS, elecSchema, fmt, sum, useElectricity, useInsert, useSections, within } from "@/lib/campus";

export const Route = createFileRoute("/electricity")({
  head: () => ({
    meta: [
      { title: "Electricity Tracker — SVVV Smart Campus" },
      { name: "description", content: "Record and analyse electricity use by campus section, with savings estimates." },
      { property: "og:title", content: "Electricity Tracker — SVVV Smart Campus" },
      { property: "og:description", content: "Daily and weekly kWh charts with energy-saving recommendations." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

function Page() {
  const sections = useSections().data ?? [];
  const rows = useElectricity().data ?? [];
  const insert = useInsert("electricity_records");
  const kwh7 = sum(within(rows, 7).map((r) => r.kwh));
  const save = kwh7 * ASSUMPTIONS.avoidableElectricityShare;
  return (
    <>
      <PageHeader eyebrow="Feature 1" title="Electricity Tracker" desc="Record electricity consumption by campus section and see where energy can be saved." />
      <ResourceTracker rows={rows} sections={sections} field="kwh" unit="kWh" schema={elecSchema} color="var(--color-chart-1)"
        pending={insert.isPending} onSubmit={(v) => insert.mutateAsync(v)}
        tips={<>
          <div className="grid gap-4 sm:grid-cols-2">
            <Stat label="Last 7 days" value={fmt(kwh7)} unit="kWh" icon={<Zap className="size-4" />} />
            <Stat label="Potential weekly saving" value={`${fmt(save)} kWh`} icon={<IndianRupee className="size-4" />}
              hint={`≈ ₹${fmt(save * ASSUMPTIONS.electricityTariffInrPerKwh)} at ₹${ASSUMPTIONS.electricityTariffInrPerKwh}/kWh, assuming ${ASSUMPTIONS.avoidableElectricityShare * 100}% avoidable`} />
          </div>
          <TipList title="Energy-saving actions" items={[
            "Set ACs to 24–26°C and switch off 15 min before classes end.",
            "Enable auto sleep / shutdown on computer lab PCs after hours.",
            "Replace remaining tube lights with LEDs; add occupancy sensors in corridors.",
            "Assign a ‘last person out’ switch-off duty per classroom.",
          ]} />
        </>} />
    </>
  );
}
