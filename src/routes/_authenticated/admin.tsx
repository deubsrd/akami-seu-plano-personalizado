import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — Akami" }] }),
  component: AdminPage,
});

const LABELS: Record<string, string> = {
  active_users: "Usuárias ativas",
  trials_active: "Trials em andamento",
  subscriptions_active: "Assinaturas ativas",
  subscriptions_canceled: "Assinaturas canceladas",
  households_active: "Lares (modo casal)",
  friend_connections_accepted: "Conexões de treino",
  referrals_total: "Indicações enviadas",
  referrals_converted: "Indicações convertidas",
  active_challenges: "Desafios ativos",
};

function AdminPage() {
  const { data: metrics, error, isLoading } = useQuery({
    queryKey: ["admin-metrics"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_get_metrics");
      if (error) throw error;
      return data as Record<string, number>;
    },
    retry: false,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-primary" />
        <h1 className="text-2xl font-bold">Painel administrativo</h1>
      </div>
      <Button asChild variant="ghost" size="sm" className="-mt-3"><Link to="/perfil">← Voltar ao perfil</Link></Button>

      {isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}

      {error && (
        <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-5 text-sm">
          Acesso restrito a administradores. Esta tela não mostra dados de saúde individuais, apenas métricas agregadas de negócio.
        </div>
      )}

      {metrics && (
        <div className="grid grid-cols-2 gap-3">
          {Object.entries(LABELS).map(([key, label]) => (
            <div key={key} className="rounded-2xl border border-border bg-card p-4 shadow-card text-center">
              <div className="text-2xl font-bold">{metrics[key] ?? 0}</div>
              <div className="text-xs text-muted-foreground">{label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
