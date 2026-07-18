import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useState } from "react";
import { Copy, Heart } from "lucide-react";

export const Route = createFileRoute("/_authenticated/casal")({
  head: () => ({ meta: [{ title: "Modo casal — Akami" }] }),
  component: CasalPage,
});

type Household = {
  id: string;
  name: string;
  created_by: string;
  invite_code: string;
  shared_budget: boolean;
};

type HouseholdMember = {
  id: string;
  household_id: string;
  user_id: string | null;
  invited_email: string | null;
  status: "pending" | "accepted" | "left";
  visibility: Record<string, boolean>;
};

const VISIBILITY_LABELS: Record<string, string> = {
  plano: "Meu plano gerado",
  treino: "Meu treino e cargas",
  cardapio: "Meu cardápio do dia",
  medidas: "Minhas medidas e evolução",
  bem_estar: "Sono, estresse e ciclo",
};

function CasalPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [inviteCode, setInviteCode] = useState("");

  // Household onde o usuário é criador OU membro aceito
  const { data: membership, isLoading } = useQuery({
    queryKey: ["household-membership", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: memberRow } = await supabase
        .from("household_members")
        .select("*, households(*)")
        .eq("user_id", user!.id)
        .eq("status", "accepted")
        .maybeSingle();
      if (memberRow) return memberRow as any;

      // Ainda não é membro de nada — verifica se já criou um lar (aguardando parceiro aceitar)
      const { data: created } = await supabase
        .from("households")
        .select("*")
        .eq("created_by", user!.id)
        .maybeSingle();
      if (created) return { households: created, visibility: null, id: null } as any;
      return null;
    },
  });

  const household: Household | null = membership?.households ?? null;

  const { data: allMembers } = useQuery({
    queryKey: ["household-members", household?.id],
    enabled: !!household?.id,
    queryFn: async () =>
      (await supabase.from("household_members").select("*").eq("household_id", household!.id)).data as HouseholdMember[],
  });

  const myMemberRow = allMembers?.find((m) => m.user_id === user?.id);

  const createHousehold = useMutation({
    mutationFn: async () => {
      const { data: h, error } = await supabase
        .from("households")
        .insert({ created_by: user!.id, name: "Nosso lar" })
        .select()
        .single();
      if (error) throw error;
      await supabase.from("household_members").insert({
        household_id: h.id,
        user_id: user!.id,
        status: "accepted",
        joined_at: new Date().toISOString(),
      });
      return h;
    },
    onSuccess: () => {
      toast.success("Lar criado! Compartilhe o código com seu parceiro(a).");
      qc.invalidateQueries({ queryKey: ["household-membership", user?.id] });
    },
    onError: () => toast.error("Não foi possível criar o modo casal agora."),
  });

  const acceptInvite = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("accept_household_invite", { p_invite_code: inviteCode.trim() });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Conectado! Vocês agora estão no modo casal.");
      setInviteCode("");
      qc.invalidateQueries({ queryKey: ["household-membership", user?.id] });
    },
    onError: (e: any) => toast.error(e?.message || "Código de convite inválido."),
  });

  const updateVisibility = useMutation({
    mutationFn: async (visibility: Record<string, boolean>) => {
      if (!myMemberRow) return;
      await supabase.from("household_members").update({ visibility }).eq("id", myMemberRow.id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["household-members", household?.id] }),
  });

  const toggleSharedBudget = useMutation({
    mutationFn: async (shared: boolean) => {
      if (!household) return;
      await supabase.from("households").update({ shared_budget: shared }).eq("id", household.id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["household-membership", user?.id] }),
  });

  const leaveHousehold = useMutation({
    mutationFn: async () => {
      if (!myMemberRow) return;
      await supabase.from("household_members").update({ status: "left" }).eq("id", myMemberRow.id);
    },
    onSuccess: () => {
      toast.success("Você saiu do modo casal.");
      qc.invalidateQueries({ queryKey: ["household-membership", user?.id] });
    },
  });

  function copyCode() {
    if (!household) return;
    navigator.clipboard.writeText(household.invite_code);
    toast.success("Código copiado");
  }

  if (isLoading) return <div className="text-sm text-muted-foreground">Carregando…</div>;

  const partnerConnected = (allMembers?.filter((m) => m.status === "accepted").length ?? 0) >= 2;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Heart className="h-5 w-5 text-primary" />
        <h1 className="text-2xl font-bold">Modo casal</h1>
      </div>
      <Button asChild variant="ghost" size="sm" className="-mt-4"><Link to="/perfil">← Voltar ao perfil</Link></Button>

      {!household && (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card space-y-3">
          <p className="text-sm text-muted-foreground">
            Conecte sua conta com a do seu parceiro(a): cada um mantém seu próprio questionário e cardápio,
            mas a lista de compras e o orçamento podem virar um só.
          </p>
          <Button className="w-full" onClick={() => createHousehold.mutate()} disabled={createHousehold.isPending}>
            Criar nosso lar
          </Button>
          <div className="pt-2 border-t border-border">
            <Label>Já tenho um código de convite</Label>
            <div className="mt-2 flex gap-2">
              <Input value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} placeholder="ex: a1b2c3d4" />
              <Button onClick={() => acceptInvite.mutate()} disabled={!inviteCode || acceptInvite.isPending}>Entrar</Button>
            </div>
          </div>
        </div>
      )}

      {household && !partnerConnected && (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card space-y-3">
          <h3 className="font-semibold">Convide seu parceiro(a)</h3>
          <p className="text-sm text-muted-foreground">Compartilhe este código para conectar as contas:</p>
          <div className="flex items-center justify-between rounded-xl bg-muted px-4 py-3 font-mono text-lg tracking-wider">
            {household.invite_code}
            <Button size="sm" variant="ghost" onClick={copyCode}><Copy className="h-4 w-4" /></Button>
          </div>
        </div>
      )}

      {household && partnerConnected && (
        <>
          <div className="rounded-2xl border border-border bg-card p-5 shadow-card space-y-4">
            <h3 className="font-semibold">Orçamento compartilhado</h3>
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground max-w-[70%]">
                Quando ativado, a lista de compras e o orçamento de alimentação viram um só para o casal.
              </div>
              <Switch checked={household.shared_budget} onCheckedChange={(v) => toggleSharedBudget.mutate(v)} />
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-card space-y-4">
            <h3 className="font-semibold">O que seu parceiro(a) enxerga</h3>
            <div className="space-y-3">
              {Object.entries(VISIBILITY_LABELS).map(([key, label]) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-sm">{label}</span>
                  <Switch
                    checked={!!myMemberRow?.visibility?.[key]}
                    onCheckedChange={(v) =>
                      updateVisibility.mutate({ ...(myMemberRow?.visibility ?? {}), [key]: v })
                    }
                  />
                </div>
              ))}
            </div>
          </div>

          <Button variant="destructive" className="w-full" onClick={() => leaveHousehold.mutate()}>
            Sair do modo casal
          </Button>
        </>
      )}
    </div>
  );
}
