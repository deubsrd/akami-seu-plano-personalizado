import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/treino")({
  head: () => ({ meta: [{ title: "Treino — Akami" }] }),
  component: TrainingPage,
});

function TrainingPage() {
  const { user } = useAuth();
  const { data: plan, isLoading } = useQuery({
    queryKey: ["training-plan", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("generated_plans")
        .select("training_plan").eq("user_id", user!.id).eq("is_active", true)
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      return data?.training_plan as any;
    },
  });

  if (isLoading) return <p className="text-muted-foreground">Carregando...</p>;
  if (!plan) return <EmptyState />;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Treino</h1>
      <p className="text-sm text-muted-foreground">{plan.summary}</p>
      <div className="space-y-3">
        {plan.weekly_split?.map((d: any, i: number) => (
          <details key={i} className="rounded-xl border border-border bg-card p-4 shadow-card" open={i === 0}>
            <summary className="cursor-pointer font-semibold">{d.day} — {d.focus}</summary>
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
          </details>
        ))}
      </div>
      {plan.progression && (
        <div className="rounded-xl border border-border bg-secondary/50 p-4 text-sm">
          <p className="font-semibold">Progressão</p>
          <p className="mt-1 text-muted-foreground">{plan.progression}</p>
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
