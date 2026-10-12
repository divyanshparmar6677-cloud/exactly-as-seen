import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

/* ---------- Transparent assumptions (editable, clearly labelled) ---------- */
export const ASSUMPTIONS = {
  gridEmissionKgPerKwh: 0.71, // approx. India grid emission factor (CEA baseline, indicative)
  waterEmissionKgPerLitre: 0.0003, // pumping + treatment, indicative
  wasteEmissionKgPerKg: 0.5, // mixed waste to landfill, indicative
  electricityTariffInrPerKwh: 8, // indicative institutional tariff
  waterCostInrPerLitre: 0.05, // indicative supply + pumping cost
  avoidableElectricityShare: 0.12, // share of usage typically avoidable via behaviour/controls
  avoidableWaterShare: 0.15,
  avoidableWasteShare: 0.2,
} as const;

export type Section = { id: string; name: string; description: string | null; sort_order: number };
export type ElecRec = { id: string; section_id: string; record_date: string; kwh: number; notes: string | null; is_simulated: boolean };
export type WaterRec = { id: string; section_id: string; record_date: string; litres: number; notes: string | null; is_simulated: boolean };
export type WasteRec = { id: string; section_id: string; record_date: string; category: WasteCategory; kg: number; notes: string | null; is_simulated: boolean };
export type WasteCategory = "paper" | "plastic" | "food" | "other";
export type Report = {
  id: string; kind: "suggestion" | "wastage"; resource: Resource; section_id: string | null;
  title: string; description: string; submitter_name: string | null; status: ReportStatus;
  is_simulated: boolean; created_at: string;
};
export type Resource = "electricity" | "water" | "waste" | "other";
export type ReportStatus = "submitted" | "under_review" | "actioned" | "resolved";
export type Action = { id: string; title: string; resource: Resource; completed: boolean; is_simulated: boolean };

export const WASTE_CATEGORIES: WasteCategory[] = ["paper", "plastic", "food", "other"];
export const REPORT_STATUSES: ReportStatus[] = ["submitted", "under_review", "actioned", "resolved"];

/* ---------- Validation ---------- */
const today = () => new Date().toISOString().slice(0, 10);
const dateField = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date").refine((d) => d <= today(), "Date can't be in the future");
const notes = z.string().trim().max(300).optional().transform((v) => v || null);

export const elecSchema = z.object({ section_id: z.string().uuid("Choose a section"), record_date: dateField, kwh: z.coerce.number().min(0).max(100000), notes });
export const waterSchema = z.object({ section_id: z.string().uuid("Choose a section"), record_date: dateField, litres: z.coerce.number().min(0).max(10000000), notes });
export const wasteSchema = z.object({ section_id: z.string().uuid("Choose a section"), record_date: dateField, category: z.enum(["paper", "plastic", "food", "other"]), kg: z.coerce.number().min(0).max(100000), notes });
export const reportSchema = z.object({
  kind: z.enum(["suggestion", "wastage"]),
  resource: z.enum(["electricity", "water", "waste", "other"]),
  section_id: z.string().uuid().nullable(),
  title: z.string().trim().min(3, "At least 3 characters").max(120),
  description: z.string().trim().min(5, "At least 5 characters").max(1000),
  submitter_name: z.string().trim().max(80).optional().transform((v) => v || null),
});
export const sectionSchema = z.object({ name: z.string().trim().min(2).max(80), description: z.string().trim().max(300).optional().transform((v) => v || null) });

/* ---------- Data hooks ---------- */
async function q<T>(p: PromiseLike<{ data: unknown; error: { message: string } | null }>): Promise<T> {
  const { data, error } = await p;
  if (error) throw new Error(error.message);
  return data as T;
}

export const useSections = () =>
  useQuery({ queryKey: ["sections"], queryFn: () => q<Section[]>(supabase.from("campus_sections").select("*").order("sort_order")) });
export const useElectricity = () =>
  useQuery({ queryKey: ["electricity"], queryFn: () => q<ElecRec[]>(supabase.from("electricity_records").select("*").order("record_date", { ascending: false }).limit(2000)) });
export const useWater = () =>
  useQuery({ queryKey: ["water"], queryFn: () => q<WaterRec[]>(supabase.from("water_records").select("*").order("record_date", { ascending: false }).limit(2000)) });
export const useWaste = () =>
  useQuery({ queryKey: ["waste"], queryFn: () => q<WasteRec[]>(supabase.from("waste_records").select("*").order("record_date", { ascending: false }).limit(2000)) });
export const useReports = () =>
  useQuery({ queryKey: ["reports"], queryFn: () => q<Report[]>(supabase.from("reports").select("*").order("created_at", { ascending: false })) });
export const useActions = () =>
  useQuery({ queryKey: ["actions"], queryFn: () => q<Action[]>(supabase.from("sustainability_actions").select("*").order("created_at")) });

type Table = "campus_sections" | "electricity_records" | "water_records" | "waste_records" | "reports" | "sustainability_actions";
const keyFor: Record<Table, string> = {
  campus_sections: "sections", electricity_records: "electricity", water_records: "water",
  waste_records: "waste", reports: "reports", sustainability_actions: "actions",
};

export function useInsert(table: Table) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: Record<string, unknown>) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await supabase.from(table).insert(row as any);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [keyFor[table]] }),
  });
}
export function useUpdate(table: Table) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Record<string, unknown> }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await supabase.from(table).update(patch as any).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [keyFor[table]] }),
  });
}
export function useDelete(table: Table) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries(),
  });
}

/* ---------- Calculations ---------- */
export const sum = (xs: number[]) => xs.reduce((a, b) => a + Number(b), 0);
export const fmt = (n: number, d = 0) => n.toLocaleString("en-IN", { maximumFractionDigits: d });

export function lastNDays(n: number) {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

export function dailySeries<T extends { record_date: string }>(rows: T[], val: (r: T) => number, days = 14) {
  return lastNDays(days).map((date) => ({
    date: date.slice(5),
    value: Math.round(sum(rows.filter((r) => r.record_date === date).map(val)) * 10) / 10,
  }));
}

export function weeklySeries<T extends { record_date: string }>(rows: T[], val: (r: T) => number, weeks = 4) {
  const now = new Date();
  return Array.from({ length: weeks }, (_, i) => {
    const w = weeks - 1 - i;
    const end = new Date(now); end.setDate(now.getDate() - w * 7);
    const start = new Date(end); start.setDate(end.getDate() - 6);
    const s = start.toISOString().slice(0, 10), e = end.toISOString().slice(0, 10);
    return { week: w === 0 ? "This wk" : `${w} wk ago`, value: Math.round(sum(rows.filter((r) => r.record_date >= s && r.record_date <= e).map(val))) };
  });
}

export function bySection<T extends { section_id: string }>(rows: T[], sections: Section[], val: (r: T) => number) {
  return sections.map((s) => ({ name: s.name, value: Math.round(sum(rows.filter((r) => r.section_id === s.id).map(val)) * 10) / 10 }));
}

export function within<T extends { record_date: string }>(rows: T[], days: number) {
  const since = lastNDays(days)[0] ?? "";
  return rows.filter((r) => r.record_date >= since);
}

export function totals(e: ElecRec[], w: WaterRec[], ws: WasteRec[]) {
  const kwh = sum(e.map((r) => r.kwh));
  const litres = sum(w.map((r) => r.litres));
  const kg = sum(ws.map((r) => r.kg));
  const co2 = kwh * ASSUMPTIONS.gridEmissionKgPerKwh + litres * ASSUMPTIONS.waterEmissionKgPerLitre + kg * ASSUMPTIONS.wasteEmissionKgPerKg;
  const savingKwh = kwh * ASSUMPTIONS.avoidableElectricityShare;
  const savingL = litres * ASSUMPTIONS.avoidableWaterShare;
  const savingInr = savingKwh * ASSUMPTIONS.electricityTariffInrPerKwh + savingL * ASSUMPTIONS.waterCostInrPerLitre;
  return { kwh, litres, kg, co2, savingKwh, savingL, savingInr };
}

/* ---------- Rule-based advisor ---------- */
export type Recommendation = { priority: "High" | "Medium" | "Low"; resource: Resource; title: string; detail: string; source: "Rule-based" };

export function ruleBasedAdvice(sections: Section[], e: ElecRec[], w: WaterRec[], ws: WasteRec[], reports: Report[]): Recommendation[] {
  const recs: Recommendation[] = [];
  const e14 = within(e, 14), w14 = within(w, 14), ws14 = within(ws, 14);
  const name = (id: string) => sections.find((s) => s.id === id)?.name ?? "Unknown";

  const elecBy = bySection(e14, sections, (r) => r.kwh).sort((a, b) => b.value - a.value);
  const totalE = sum(elecBy.map((x) => x.value));
  if (elecBy[0] && totalE > 0) {
    const share = elecBy[0].value / totalE;
    recs.push({
      priority: share > 0.3 ? "High" : "Medium", resource: "electricity",
      title: `Audit electricity in ${elecBy[0].name}`,
      detail: `${elecBy[0].name} used ${fmt(share * 100)}% of recorded electricity in the last 14 days (${fmt(elecBy[0].value)} kWh). Check idle equipment, AC set-points (24°C+) and after-hours shutdown. A ${fmt(ASSUMPTIONS.avoidableElectricityShare * 100)}% cut would save ~${fmt(elecBy[0].value * ASSUMPTIONS.avoidableElectricityShare)} kWh per fortnight.`,
      source: "Rule-based",
    });
  }

  // Week-over-week trend
  const wk = weeklySeries(e, (r) => r.kwh, 2);
  if (wk[0]!.value > 0 && wk[1]!.value > wk[0]!.value * 1.1) {
    recs.push({ priority: "High", resource: "electricity", title: "Electricity rose more than 10% this week",
      detail: `This week: ${fmt(wk[1]!.value)} kWh vs ${fmt(wk[0]!.value)} kWh last week. Review new equipment, events or lights left on.`, source: "Rule-based" });
  }

  // Weekend baseload
  const weekend = e14.filter((r) => new Date(r.record_date).getDay() === 0);
  const weekday = e14.filter((r) => ![0, 6].includes(new Date(r.record_date).getDay()));
  if (weekend.length && weekday.length) {
    const ratio = (sum(weekend.map((r) => r.kwh)) / weekend.length) / (sum(weekday.map((r) => r.kwh)) / weekday.length);
    if (ratio > 0.35) recs.push({ priority: "Medium", resource: "electricity", title: "High Sunday baseload",
      detail: `Sunday usage is ${fmt(ratio * 100)}% of a typical weekday. Schedule automatic shutdown of labs, ACs and lighting when buildings are closed.`, source: "Rule-based" });
  }

  const waterBy = bySection(w14, sections, (r) => r.litres).sort((a, b) => b.value - a.value);
  if (waterBy[0] && waterBy[0].value > 0) {
    recs.push({ priority: "Medium", resource: "water", title: `Reduce water use in ${waterBy[0].name}`,
      detail: `Highest recorded water use: ${fmt(waterBy[0].value)} L in 14 days. Install tap aerators, fix leaks and add sensor taps. A ${fmt(ASSUMPTIONS.avoidableWaterShare * 100)}% cut saves ~${fmt(waterBy[0].value * ASSUMPTIONS.avoidableWaterShare)} L.`, source: "Rule-based" });
  }

  const leaks = reports.filter((r) => r.resource === "water" && r.kind === "wastage" && r.status !== "resolved");
  if (leaks.length) recs.push({ priority: "High", resource: "water", title: `${leaks.length} open water wastage report(s)`,
    detail: `Unresolved: ${leaks.map((l) => `"${l.title}"${l.section_id ? ` (${name(l.section_id)})` : ""}`).join(", ")}. A dripping tap can waste 15+ litres per day.`, source: "Rule-based" });

  const cat = WASTE_CATEGORIES.map((c) => ({ c, kg: sum(ws14.filter((r) => r.category === c).map((r) => r.kg)) })).sort((a, b) => b.kg - a.kg);
  const totalW = sum(cat.map((x) => x.kg));
  if (cat[0] && totalW > 0) {
    const tips: Record<WasteCategory, string> = {
      food: "Start a composting pit, track plate waste and adjust canteen batch sizes.",
      plastic: "Ban single-use plastic in the canteen, install refill stations and separate plastic bins.",
      paper: "Default to double-sided printing, digital submissions and paper recycling bins.",
      other: "Audit mixed waste and set up clear dry/wet/e-waste segregation.",
    };
    recs.push({ priority: cat[0]!.kg / totalW > 0.4 ? "High" : "Medium", resource: "waste", title: `${cat[0]!.c[0].toUpperCase() + cat[0]!.c.slice(1)} is the largest waste stream`,
      detail: `${fmt(cat[0].kg, 1)} kg (${fmt((cat[0].kg / totalW) * 100)}%) of recorded waste in 14 days. ${tips[cat[0].c]}`, source: "Rule-based" });
  }
  recs.push({ priority: "Low", resource: "other", title: "Run a student sustainability week",
    detail: "Use the Participate page to collect suggestions and recognise the most impactful ones.", source: "Rule-based" });

  const order = { High: 0, Medium: 1, Low: 2 };
  return recs.sort((a, b) => order[a.priority] - order[b.priority]);
}
