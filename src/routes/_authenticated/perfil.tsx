import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/perfil")({
  head: () => ({ meta: [{ title: "Perfil — Akami" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { subscription, isActive } = useSubscription();

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle()).data,
  });

  const [weight, setWeight] = useState("");
  const [waist, setWaist] = useState("");

  const addMeasurement = useMutation({
    mutationFn: async () => {
      await supabase.from("measurements_log").insert({
        user_id: user!.id,
        weight_kg: weight ? Number(weight) : null,
        waist_cm: waist ? Number(waist) : null,
      });
    },
    onSuccess: () => {
      toast.success("Medida registrada");
      setWeight(""); setWaist("");
      qc.invalidateQueries({ queryKey: ["last-measurement"] });
    },
  });

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    nav({ to: "/auth", replace: true });
  }

  async function exportData() {
    if (!user) return;
    const tables = ["profiles", "intake_forms", "generated_plans", "shopping_list_items", "measurements_log", "workout_sessions", "nutrition_log", "water_log", "wellness_log"];
    const bundle: Record<string, any> = {};
    for (const t of tables) {
      const { data } = await supabase.from(t as any).select("*").eq("user_id", user.id);
      bundle[t] = data;
    }
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `akami-dados-${user.id}.json`; a.click();
    URL.revokeObjectURL(url);
  }

  async function deleteAccount() {
    if (!confirm("Excluir sua conta e todos os dados? Esta ação não pode ser desfeita.")) return;
    await supabase.from("profiles").delete().eq("id", user!.id);
    await supabase.auth.signOut();
    toast.success("Conta apagada");
    nav({ to: "/" });
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Perfil</h1>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <div className="text-sm text-muted-foreground">{user?.email}</div>
        <div className="mt-1 font-semibold">{profile?.full_name || "Sem nome"}</div>

        <div className="mt-4 space-y-1 text-sm">
          <div>Status: <span className="font-medium capitalize">{subscription?.status ?? "—"}</span></div>
          {subscription?.trial_ends_at && subscription.status === "trialing" && (
            <div>Trial termina em {new Date(subscription.trial_ends_at).toLocaleDateString("pt-BR")}</div>
          )}
        </div>
        <Button asChild className="mt-3" size="sm"><Link to="/assinatura">Minha assinatura</Link></Button>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <h3 className="font-semibold">Modo casal</h3>
        <p className="mt-1 text-sm text-muted-foreground">Conecte sua conta com a do seu parceiro(a) e compartilhem a lista de compras e o orçamento.</p>
        <Button asChild className="mt-3 w-full" variant="outline"><Link to="/casal">Configurar modo casal</Link></Button>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <h3 className="font-semibold">Treino com amigo</h3>
        <p className="mt-1 text-sm text-muted-foreground">Conecte-se com alguém e gerem um treino combinado, com carga individualizada pra cada um.</p>
        <Button asChild className="mt-3 w-full" variant="outline"><Link to="/amigo">Conectar com um amigo</Link></Button>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <h3 className="font-semibold">Registrar medida</h3>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div><Label>Peso (kg)</Label><Input type="number" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} /></div>
          <div><Label>Cintura (cm)</Label><Input type="number" value={waist} onChange={(e) => setWaist(e.target.value)} /></div>
        </div>
        <Button className="mt-3 w-full" onClick={() => addMeasurement.mutate()} disabled={!weight && !waist}>Salvar</Button>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-card space-y-2">
        <h3 className="font-semibold">Ações</h3>
        <Button asChild variant="outline" className="w-full justify-start"><Link to="/onboarding">Gerar novo plano</Link></Button>
        <Button variant="outline" className="w-full justify-start" onClick={exportData}>Exportar meus dados (LGPD)</Button>
        <Button variant="outline" className="w-full justify-start" onClick={signOut}>Sair</Button>
        <Button variant="destructive" className="w-full justify-start" onClick={deleteAccount}>Excluir conta e dados</Button>
      </div>
    </div>
  );
}
