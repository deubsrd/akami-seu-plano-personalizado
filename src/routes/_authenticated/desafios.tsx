import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Trophy } from "lucide-react";

export const Route = createFileRoute("/_authenticated/desafios")({
  head: () => ({ meta: [{ title: "Desafios — Akami" }] }),
  component: ChallengesPage,
});

function ChallengesPage() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: challenges = [] } = useQuery({
    queryKey: ["group-challenges"],
    queryFn: async () =>
      (await supabase.from("group_challenges").select("*").gte("ends_on", new Date().toISOString().slice(0, 10)).order("starts_on")).data ?? [],
  });

  const { data: myParticipations = [] } = useQuery({
    queryKey: ["challenge-participants-mine", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("challenge_participants").select("*").eq("user_id", user!.id)).data ?? [],
  });

  const join = useMutation({
    mutationFn: async (challengeId: string) => {
      await supabase.from("challenge_participants").insert({ challenge_id: challengeId, user_id: user!.id });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["challenge-participants-mine"] }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Trophy className="h-5 w-5 text-primary" />
        <h1 className="text-2xl font-bold">Desafios</h1>
      </div>
      <Button asChild variant="ghost" size="sm" className="-mt-3"><Link to="/perfil">← Voltar ao perfil</Link></Button>

      {challenges.length === 0 && <p className="text-sm text-muted-foreground">Nenhum desafio ativo no momento.</p>}

      {challenges.map((c: any) => {
        const joined = myParticipations.some((p: any) => p.challenge_id === c.id);
        return (
          <div key={c.id} className="rounded-2xl border border-border bg-card p-5 shadow-card space-y-2">
            <h3 className="font-semibold">{c.title}</h3>
            <p className="text-sm text-muted-foreground">{c.description}</p>
            <p className="text-xs text-muted-foreground">
              {new Date(c.starts_on).toLocaleDateString("pt-BR")} até {new Date(c.ends_on).toLocaleDateString("pt-BR")}
            </p>
            {joined ? (
              <ChallengeRanking challengeId={c.id} myUserId={user?.id} />
            ) : (
              <Button size="sm" onClick={() => join.mutate(c.id)}>Participar</Button>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ChallengeRanking({ challengeId, myUserId }: { challengeId: string; myUserId?: string }) {
  const { data: ranking = [] } = useQuery({
    queryKey: ["challenge-ranking", challengeId],
    queryFn: async () =>
      (await supabase.from("challenge_participants").select("user_id, progress").eq("challenge_id", challengeId).order("progress", { ascending: false }).limit(10)).data ?? [],
  });

  return (
    <ol className="space-y-1 text-sm">
      {ranking.map((r: any, i: number) => (
        <li key={r.user_id} className={`flex justify-between ${r.user_id === myUserId ? "font-semibold text-primary" : ""}`}>
          <span>{i + 1}. {r.user_id === myUserId ? "Você" : "Participante"}</span>
          <span>{r.progress}</span>
        </li>
      ))}
    </ol>
  );
}
