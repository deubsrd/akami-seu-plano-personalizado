import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Droplet, Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/alimentacao")({
  head: () => ({ meta: [{ title: "Alimentação — Akami" }] }),
  component: NutritionPage,
});

function NutritionPage() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: plan } = useQuery({
    queryKey: ["nutrition-plan", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("generated_plans")
        .select("nutrition_plan,metrics").eq("user_id", user!.id).eq("is_active", true)
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      return data;
    },
  });

  const today = new Date().toISOString().slice(0, 10);
  const { data: waterMl = 0 } = useQuery({
    queryKey: ["water-today", user?.id, today],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("water_log").select("amount_ml").eq("user_id", user!.id).eq("logged_on", today);
      return data?.reduce((s, r) => s + (r.amount_ml || 0), 0) ?? 0;
    },
  });

  const addWater = useMutation({
    mutationFn: async (ml: number) => {
      await supabase.from("water_log").insert({ user_id: user!.id, amount_ml: ml });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["water-today"] }),
  });

  const nutrition = plan?.nutrition_plan as any;
  const metrics = plan?.metrics as any;

  if (!nutrition) return (
    <div className="rounded-2xl border border-border bg-card p-6 text-center">
      <p>Sem cardápio ativo.</p>
      <Link to="/onboarding" className="text-primary underline">Gerar plano</Link>
    </div>
  );

  const goalMl = 2500;
  const pct = Math.min(100, (waterMl / goalMl) * 100);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Alimentação</h1>
      <p className="text-sm text-muted-foreground">Meta: {metrics?.meta_kcal} kcal · P {metrics?.proteina_g}g / C {metrics?.carbo_g}g / G {metrics?.gordura_g}g</p>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><Droplet className="h-4 w-4 text-primary" /> Água</div>
            <div className="mt-1 text-2xl font-bold">{(waterMl / 1000).toFixed(1)} / {(goalMl / 1000).toFixed(1)} L</div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => addWater.mutate(250)}><Plus className="mr-1 h-3 w-3" />250ml</Button>
            <Button size="sm" variant="outline" onClick={() => addWater.mutate(500)}><Plus className="mr-1 h-3 w-3" />500ml</Button>
          </div>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary">
          <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <p className="text-sm text-muted-foreground">{nutrition.summary}</p>

      <div className="space-y-3">
        {nutrition.daily_meals?.map((m: any, i: number) => (
          <div key={i} className="rounded-xl border border-border bg-card p-4 shadow-card">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">{m.meal}</h3>
              <span className="text-xs text-muted-foreground">{m.time_hint}</span>
            </div>
            <ul className="mt-2 space-y-1 text-sm">
              {m.items?.map((it: any, j: number) => (
                <li key={j} className="flex items-center justify-between">
                  <span>{it.food} — {it.quantity_g}g</span>
                  <span className="text-xs text-muted-foreground">{it.approx_kcal} kcal</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
