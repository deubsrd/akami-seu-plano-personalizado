import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { Button } from "@/components/ui/button";
import { Sparkles, Droplet, Flame } from "lucide-react";
import { formatBRL } from "@/lib/formulas";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Início — Akami" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { user } = useAuth();
  const { subscription, isActive } = useSubscription();

  const { data: plan } = useQuery({
    queryKey: ["active-plan", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("generated_plans")
        .select("*").eq("user_id", user!.id).eq("is_active", true)
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      return data;
    },
  });

  const { data: waterToday } = useQuery({
    queryKey: ["water-today", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const { data } = await supabase.from("water_log").select("amount_ml").eq("user_id", user!.id).eq("logged_on", today);
      return data?.reduce((s, r) => s + (r.amount_ml || 0), 0) ?? 0;
    },
  });

  const { data: lastMeasurement } = useQuery({
    queryKey: ["last-measurement", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("measurements_log").select("*").eq("user_id", user!.id).order("measured_on", { ascending: false }).limit(1).maybeSingle();
      return data;
    },
  });

  const metrics = (plan?.metrics as any) ?? null;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Olá 👋</h1>
        <p className="text-sm text-muted-foreground">{new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}</p>
      </header>

      {!isActive && (
        <div className="rounded-xl border border-warning/30 bg-warning/10 p-4 text-sm">
          Seu acesso está bloqueado. <Link to="/assinatura" className="font-semibold text-primary underline">Reativar assinatura</Link>
        </div>
      )}

      {isActive && subscription?.status === "trialing" && subscription.trial_ends_at && (
        <div className="rounded-xl bg-primary-soft p-4 text-sm">
          <Sparkles className="mr-2 inline h-4 w-4 text-primary" />
          Você está no teste grátis. Termina em {new Date(subscription.trial_ends_at).toLocaleDateString("pt-BR")}.
        </div>
      )}

      {!plan ? (
        <div className="rounded-2xl border border-border bg-card p-6 text-center shadow-card">
          <h2 className="text-lg font-semibold">Vamos gerar seu primeiro plano?</h2>
          <p className="mt-1 text-sm text-muted-foreground">Responda o questionário para receber treino, dieta e lista de compras.</p>
          <Button asChild className="mt-4"><Link to="/onboarding">Começar questionário</Link></Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Card icon={<Flame className="h-4 w-4 text-primary" />} label="Meta calórica" value={`${metrics?.meta_kcal ?? "-"} kcal`} />
            <Card icon={<Droplet className="h-4 w-4 text-primary" />} label="Água hoje" value={`${((waterToday ?? 0) / 1000).toFixed(1)} L`} />
            <Card label="Proteína/dia" value={`${metrics?.proteina_g ?? "-"} g`} />
            <Card label="IMC" value={`${metrics?.imc ?? "-"}`} sub={metrics?.imc_classificacao} />
          </div>

          {plan.warnings && plan.warnings.length > 0 && (
            <div className="rounded-xl border border-warning/30 bg-warning/10 p-4 text-sm">
              <p className="font-semibold">Avisos importantes:</p>
              <ul className="mt-2 list-disc pl-5 text-xs">
                {plan.warnings.map((w: string, i: number) => <li key={i}>{w}</li>)}
              </ul>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-3">
            <Button asChild variant="outline"><Link to="/treino">Ver treino do dia</Link></Button>
            <Button asChild variant="outline"><Link to="/alimentacao">Cardápio de hoje</Link></Button>
            <Button asChild variant="outline"><Link to="/compras">Lista de compras</Link></Button>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <h3 className="font-semibold">Peso e medidas</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {lastMeasurement ? `Última medição: ${lastMeasurement.weight_kg ?? "-"} kg em ${new Date(lastMeasurement.measured_on).toLocaleDateString("pt-BR")}` : "Ainda sem registros."}
            </p>
            <Button asChild variant="outline" className="mt-3" size="sm"><Link to="/perfil">Registrar</Link></Button>
          </div>
        </>
      )}
    </div>
  );
}

function Card({ icon, label, value, sub }: { icon?: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-card">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">{icon}{label}</div>
      <div className="mt-1 text-2xl font-bold font-mono-data">{value}</div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}
