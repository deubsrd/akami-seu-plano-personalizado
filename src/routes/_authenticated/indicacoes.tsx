import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Gift, Copy } from "lucide-react";

export const Route = createFileRoute("/_authenticated/indicacoes")({
  head: () => ({ meta: [{ title: "Indicações — Akami" }] }),
  component: ReferralsPage,
});

function ReferralsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: referrals = [] } = useQuery({
    queryKey: ["referrals", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("referrals").select("*").eq("referrer_id", user!.id).order("created_at", { ascending: false })).data ?? [],
  });

  const createCode = useMutation({
    mutationFn: async () => {
      await supabase.from("referrals").insert({ referrer_id: user!.id });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["referrals", user?.id] }),
  });

  const activeCode = referrals.find((r: any) => r.status === "pending")?.code ?? referrals[0]?.code;
  const monthsEarned = referrals.reduce((s: number, r: any) => s + (r.reward_months_credited || 0), 0);
  const signedUp = referrals.filter((r: any) => r.status !== "pending").length;

  function copyLink() {
    if (!activeCode) return;
    navigator.clipboard.writeText(`https://akami.app/auth?ref=${activeCode}`);
    toast.success("Link copiado");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Gift className="h-5 w-5 text-primary" />
        <h1 className="text-2xl font-bold">Indicações</h1>
      </div>
      <Button asChild variant="ghost" size="sm" className="-mt-3"><Link to="/perfil">← Voltar ao perfil</Link></Button>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-card space-y-3">
        <p className="text-sm text-muted-foreground">Cada pessoa que assinar após o trial usando seu link te dá 1 mês grátis.</p>
        {activeCode ? (
          <div className="flex items-center justify-between rounded-xl bg-muted px-4 py-3">
            <span className="font-mono text-sm">akami.app/auth?ref={activeCode}</span>
            <Button size="sm" variant="ghost" onClick={copyLink}><Copy className="h-4 w-4" /></Button>
          </div>
        ) : (
          <Button onClick={() => createCode.mutate()} disabled={createCode.isPending}>Gerar meu link de indicação</Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-card text-center">
          <div className="text-2xl font-bold">{signedUp}</div>
          <div className="text-xs text-muted-foreground">convites aceitos</div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-card text-center">
          <div className="text-2xl font-bold">{monthsEarned}</div>
          <div className="text-xs text-muted-foreground">meses grátis ganhos</div>
        </div>
      </div>
    </div>
  );
}
