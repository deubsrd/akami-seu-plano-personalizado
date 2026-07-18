import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useState } from "react";
import { CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/treino")({
  head: () => ({ meta: [{ title: "Treino — Akami" }] }),
  component: TrainingPage,
});

function TrainingPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [openLog, setOpenLog] = useState<number | null>(null);
  const [rpe, setRpe] = useState("7");
  const [pain, setPain] = useState("");

  const { data: planRow, isLoading } = useQuery({
    queryKey: ["training-plan", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("generated_plans")
        .select("id,training_plan").eq("user_id", user!.id).eq("is_active", true)
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      return data;
    },
  });
  const plan = planRow?.training_plan as any;

  const today = new Date().toISOString().slice(0, 10);
  const { data: todaysSessions = [] } = useQuery({
    queryKey: ["workout-sessions-today", user?.id, today],
    enabled: !!user,
    queryFn: async () =>
      (await supabase.from("workout_sessions").select("workout_key").eq("user_id", user!.id).eq("performed_on", today)).data ?? [],
  });

  const { data: history = [] } = useQuery({
    queryKey: ["workout-sessions-history", user?.id],
    enabled: !!user,
    queryFn: async () =>
      (await supabase.from("workout_sessions").select("performed_on,workout_key,overall_rpe").eq("user_id", user!.id).order("performed_on", { ascending: false }).limit(10)).data ?? [],
  });

  const logDone = useMutation({
    mutationFn: async ({ day, dayIndex }: { day: any; dayIndex: number }) => {
      await supabase.from("workout_sessions").insert({
        user_id: user!.id,
        plan_id: planRow!.id,
        workout_key: day.day,
        performed_on: today,
        exercises: day.exercises,
        overall_rpe: Number(rpe) || null,
        pain_notes: pain || null,
      });
      return dayIndex;
    },
    onSuccess: () => {
      toast.success("Treino registrado!");
      setOpenLog(null);
      setRpe("7");
      setPain("");
      qc.invalidateQueries({ queryKey: ["workout-sessions-today"] });
      qc.invalidateQueries({ queryKey: ["workout-sessions-history"] });
    },
  });

  if (isLoading) return <p className="text-muted-foreground">Carregando...</p>;
  if (!plan) return <EmptyState />;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Treino</h1>
      <p className="text-sm text-muted-foreground">{plan.summary}</p>
      <div className="space-y-3">
        {plan.weekly_split?.map((d: any, i: number) => {
          const doneToday = todaysSessions.some((s: any) => s.workout_key === d.day);
          return (
            <details key={i} className="rounded-xl border border-border bg-card p-4 shadow-card" open={i === 0}>
              <summary className="cursor-pointer font-semibold flex items-center gap-2">
                {d.day} — {d.focus}
                {doneToday && <CheckCircle2 className="h-4 w-4 text-primary" />}
              </summary>
              <div className="mt-3 space-y-2">
                {d.exercises?.map((ex: any, j: number) => (
                  <div key={j} className="flex items-start justify-between gap-2 rounded-lg border border-border p-3 text-sm">
                    <div>
                      <div className="font-medium">{ex.name}</div>
                      {ex.notes && <div className="text-xs text-muted-foreground">{ex.notes}</div>}
                    </div>
                    <div className="shrink-0 text-right text-xs text-muted-foreground">
                      <div>{ex.sets}×{ex.reps}</div>
                      <div>{ex.rest_seconds}s desc.</div>
                    </div>
                  </div>
                ))}
              </div>

              {doneToday ? (
                <p className="mt-3 text-xs text-muted-foreground">Já registrado hoje ✅</p>
              ) : openLog === i ? (
                <div className="mt-3 space-y-2 rounded-lg border border-border p-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label className="text-xs">RPE (1-10)</Label><Input value={rpe} onChange={(e) => setRpe(e.target.value)} type="number" min={1} max={10} /></div>
                    <div><Label className="text-xs">Dor (opcional)</Label><Input value={pain} onChange={(e) => setPain(e.target.value)} placeholder="Ex.: joelho" /></div>
                  </div>
                  <Button size="sm" className="w-full" onClick={() => logDone.mutate({ day: d, dayIndex: i })} disabled={logDone.isPending}>
                    Confirmar treino concluído
                  </Button>
                </div>
              ) : (
                <Button size="sm" variant="outline" className="mt-3 w-full" onClick={() => setOpenLog(i)}>
                  Marcar como concluído
                </Button>
              )}
            </details>
          );
        })}
      </div>
      {plan.progression && (
        <div className="rounded-xl border border-border bg-secondary/50 p-4 text-sm">
          <p className="font-semibold">Progressão</p>
          <p className="mt-1 text-muted-foreground">{plan.progression}</p>
        </div>
      )}

      {history.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4 shadow-card">
          <p className="font-semibold text-sm">Histórico recente</p>
          <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
            {history.map((h: any, i: number) => (
              <li key={i}>{new Date(h.performed_on).toLocaleDateString("pt-BR")} — {h.workout_key} {h.overall_rpe ? `(RPE ${h.overall_rpe})` : ""}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 text-center">
      <p>Nenhum plano ativo.</p>
      <Link to="/onboarding" className="text-primary underline">Gerar meu plano</Link>
    </div>
  );
}
