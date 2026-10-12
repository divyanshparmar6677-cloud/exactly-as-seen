import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChartCard, MiniBar, MiniLine, SectionSelect, SimBadge } from "@/components/kit";
import { bySection, dailySeries, fmt, weeklySeries, within, type Section } from "@/lib/campus";
import type { z } from "zod";

type Row = { id: string; section_id: string; record_date: string; notes: string | null; is_simulated: boolean } & Record<string, unknown>;

export function ResourceTracker<R extends Row>({
  rows, sections, field, unit, schema, onSubmit, pending, color, tips, extra,
}: {
  rows: R[]; sections: Section[]; field: string; unit: string;
  schema: z.ZodTypeAny; onSubmit: (v: Record<string, unknown>) => Promise<void>; pending: boolean;
  color: string; tips: ReactNode; extra?: ReactNode;
}) {
  const [form, setForm] = useState({ section_id: "", record_date: new Date().toISOString().slice(0, 10), amount: "", notes: "" });
  const val = (r: R) => Number(r[field]);
  const name = (id: string) => sections.find((s) => s.id === id)?.name ?? "—";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ ...form, [field]: form.amount === "" ? undefined : form.amount });
    if (!parsed.success) { toast.error(parsed.error.issues[0]?.message ?? "Invalid input"); return; }
    try {
      await onSubmit(parsed.data);
      toast.success("Record saved — dashboard updated");
      setForm((f) => ({ ...f, amount: "", notes: "" }));
    } catch (err) { toast.error(err instanceof Error ? err.message : "Could not save"); }
  };

  return (
    <div className="grid gap-6">
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle className="font-display text-lg">Add a record</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={submit} className="grid gap-4">
              <SectionSelect sections={sections} value={form.section_id} onChange={(v) => setForm({ ...form, section_id: v })} />
              <div className="grid gap-1.5"><Label>Date</Label>
                <Input type="date" value={form.record_date} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setForm({ ...form, record_date: e.target.value })} /></div>
              <div className="grid gap-1.5"><Label>Consumption ({unit})</Label>
                <Input type="number" min={0} step="any" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder={`e.g. 250`} required /></div>
              <div className="grid gap-1.5"><Label>Notes (optional)</Label>
                <Input value={form.notes} maxLength={300} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Meter reading, source…" /></div>
              <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save record"}</Button>
            </form>
          </CardContent>
        </Card>
        <div className="grid gap-6 lg:col-span-2">{tips}</div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <ChartCard title={`Daily usage — last 14 days (${unit})`}><MiniLine data={dailySeries(rows, val)} x="date" color={color} unit={unit} /></ChartCard>
        <ChartCard title={`Weekly usage (${unit})`}><MiniBar data={weeklySeries(rows, val)} x="week" color={color} unit={unit} /></ChartCard>
        <div className="md:col-span-2"><ChartCard title={`By campus section — last 14 days (${unit})`}><MiniBar data={bySection(within(rows, 14), sections, val)} x="name" color={color} unit={unit} /></ChartCard></div>
      </div>
      {extra}
      <Card>
        <CardHeader><CardTitle className="font-display text-lg">Recent records</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Section</TableHead><TableHead className="text-right">{unit}</TableHead><TableHead>Source</TableHead><TableHead>Notes</TableHead></TableRow></TableHeader>
            <TableBody>
              {[...rows].sort((a, b) => (a.is_simulated === b.is_simulated ? 0 : a.is_simulated ? 1 : -1)).slice(0, 15).map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.record_date}</TableCell><TableCell>{name(r.section_id)}</TableCell>
                  <TableCell className="text-right font-medium">{fmt(val(r), 1)}</TableCell>
                  <TableCell><SimBadge sim={r.is_simulated} /></TableCell>
                  <TableCell className="max-w-xs truncate text-muted-foreground">{r.notes}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export function TipList({ title, items }: { title: string; items: string[] }) {
  return (
    <Card>
      <CardHeader><CardTitle className="font-display text-lg">{title}</CardTitle></CardHeader>
      <CardContent><ul className="grid gap-2 text-sm">{items.map((t) => <li key={t} className="flex gap-2"><span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />{t}</li>)}</ul></CardContent>
    </Card>
  );
}
