import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { generateSharedWorkout } from "@/lib/shared-workout.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useState } from "react";
import { Users, Check, X, Dumbbell } from "lucide-react";

export const Route = createFileRoute("/_authenticated/amigo")({
  head: () => ({ meta: [{ title: "Treino com amigo — Akami" }] }),
  component: AmigoPage,
});

type Connection = {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: "pending" | "accepted" | "declined";
  scheduled_for: string | null;
  score_requester: number | null;
  score_addressee: number | null;
};

function AmigoPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [scheduleDrafts, setScheduleDrafts] = useState<Record<string, string>>({});

  const { data: connections, isLoading } = useQuery({
    queryKey: ["friend-connections", user?.id],
    enabled: !!user,
    queryFn: async () =>
      (
        await supabase
          .from("friend_connections")
          .select("*")
          .or(`requester_id.eq.${user!.id},addressee_id.eq.${user!.id}`)
          .order("created_at", { ascending: false })
      ).data as Connection[],
  });

  const { data: sharedWorkoutsByConnection } = useQuery({
    queryKey: ["shared-workouts", connections?.map((c) => c.id)],
    enabled: !!connections?.length,
    queryFn: async () => {
      const ids = connections!.filter((c) => c.status === "accepted").map((c) => c.id);
      if (!ids.length) return {} as Record<string, any[]>;
      const { data } = await supabase.from("shared_workouts").select("*").in("connection_id", ids).order("created_at", { ascending: false });
      const grouped: Record<string, any[]> = {};
      (data ?? []).forEach((w) => {
        grouped[w.connection_id] = grouped[w.connection_id] ?? [];
        grouped[w.connection_id].push(w);
      });
      return grouped;
    },
  });

  const sendInvite = useMutation({
    mutationFn: async () => {
      const { data: found, error: findErr } = await supabase.rpc("find_user_by_email", { p_email: email.trim() });
      if (findErr) throw findErr;
      const target = Array.isArray(found) ? found[0] : found;
      if (!target?.id) throw new Error("Não encontramos ninguém com esse e-mail no Akami.");
      const { error } = await supabase.from("friend_connections").insert({
        requester_id: user!.id,
        addressee_id: target.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Convite enviado!");
      setEmail("");
      qc.invalidateQueries({ queryKey: ["friend-connections", user?.id] });
    },
    onError: (e: any) => toast.error(e?.message || "Não foi possível enviar o convite."),
  });

  const respondInvite = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "accepted" | "declined" }) => {
      await supabase.from("friend_connections").update({ status, responded_at: new Date().toISOString() }).eq("id", id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["friend-connections", user?.id] }),
  });

  const setSchedule = useMutation({
    mutationFn: async ({ id, when }: { id: string; when: string }) => {
      await supabase.from("friend_connections").update({ scheduled_for: when }).eq("id", id);
    },
    onSuccess: () => {
      toast.success("Horário combinado salvo");
      qc.invalidateQueries({ queryKey: ["friend-connections", user?.id] });
    },
  });

  const genWorkout = useMutation({
    mutationFn: async (connection: Connection) =>
      generateSharedWorkout({
        data: { connection_id: connection.id, scheduled_for: connection.scheduled_for },
      }),
    onSuccess: () => {
      toast.success("Treino combinado gerado!");
      qc.invalidateQueries({ queryKey: ["shared-workouts"] });
    },
    onError: (e: any) => toast.error(e?.message || "Não foi possível gerar o treino combinado."),
  });

  if (isLoading) return <div className="text-sm text-muted-foreground">Carregando…</div>;

  const pendingReceived = connections?.filter((c) => c.status === "pending" && c.addressee_id === user?.id) ?? [];
  const pendingSent = connections?.filter((c) => c.status === "pending" && c.requester_id === user?.id) ?? [];
  const accepted = connections?.filter((c) => c.status === "accepted") ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Users className="h-5 w-5 text-primary" />
        <h1 className="text-2xl font-bold">Treino com amigo</h1>
      </div>
      <Button asChild variant="ghost" size="sm" className="-mt-4"><Link to="/perfil">← Voltar ao perfil</Link></Button>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-card space-y-3">
        <Label>Conectar por e-mail</Label>
        <div className="flex gap-2">
          <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemplo.com" />
          <Button onClick={() => sendInvite.mutate()} disabled={!email || sendInvite.isPending}>Convidar</Button>
        </div>
      </div>

      {pendingReceived.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card space-y-3">
          <h3 className="font-semibold">Convites recebidos</h3>
          {pendingReceived.map((c) => (
            <div key={c.id} className="flex items-center justify-between rounded-xl bg-muted px-4 py-3">
              <span className="text-sm">Alguém quer treinar com você</span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => respondInvite.mutate({ id: c.id, status: "accepted" })}><Check className="h-4 w-4" /></Button>
                <Button size="sm" variant="ghost" onClick={() => respondInvite.mutate({ id: c.id, status: "declined" })}><X className="h-4 w-4" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {pendingSent.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card space-y-2">
          <h3 className="font-semibold">Convites enviados</h3>
          <p className="text-sm text-muted-foreground">{pendingSent.length} aguardando resposta.</p>
        </div>
      )}

      {accepted.length === 0 && !pendingReceived.length && !pendingSent.length && (
        <p className="text-sm text-muted-foreground">Convide alguém pelo e-mail pra treinarem juntos.</p>
      )}

      {accepted.map((c) => {
        const workouts = sharedWorkoutsByConnection?.[c.id] ?? [];
        const myScore = c.requester_id === user?.id ? c.score_requester : c.score_addressee;
        const theirScore = c.requester_id === user?.id ? c.score_addressee : c.score_requester;
        return (
          <div key={c.id} className="rounded-2xl border border-border bg-card p-5 shadow-card space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Conexão ativa</h3>
              {(myScore != null || theirScore != null) && (
                <span className="text-xs text-muted-foreground">Placar: você {myScore ?? 0} × {theirScore ?? 0} ele(a)</span>
              )}
            </div>

            <div>
              <Label>Dia e horário combinado</Label>
              <div className="mt-2 flex gap-2">
                <Input
                  type="datetime-local"
                  value={scheduleDrafts[c.id] ?? (c.scheduled_for ? c.scheduled_for.slice(0, 16) : "")}
                  onChange={(e) => setScheduleDrafts((s) => ({ ...s, [c.id]: e.target.value }))}
                />
                <Button
                  size="sm"
                  onClick={() => setSchedule.mutate({ id: c.id, when: new Date(scheduleDrafts[c.id]).toISOString() })}
                  disabled={!scheduleDrafts[c.id]}
                >
                  Salvar
                </Button>
              </div>
              {c.scheduled_for && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Combinado para {new Date(c.scheduled_for).toLocaleString("pt-BR")}
                </p>
              )}
            </div>

            <Button className="w-full" onClick={() => genWorkout.mutate(c)} disabled={genWorkout.isPending}>
              <Dumbbell className="mr-2 h-4 w-4" /> Gerar treino combinado
            </Button>

            {workouts.length > 0 && (
              <div className="space-y-2 border-t border-border pt-3">
                <p className="text-sm font-medium">Último treino combinado</p>
                <p className="text-sm text-muted-foreground">{workouts[0].workout_plan?.shared_notes}</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
