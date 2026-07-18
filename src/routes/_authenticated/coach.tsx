import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { coachReply } from "@/lib/coach.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { MessageCircle, Send } from "lucide-react";

export const Route = createFileRoute("/_authenticated/coach")({
  head: () => ({ meta: [{ title: "Coach — Akami" }] }),
  component: CoachPage,
});

function CoachPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [message, setMessage] = useState("");

  const { data: history = [] } = useQuery({
    queryKey: ["coach-messages", user?.id],
    enabled: !!user,
    queryFn: async () =>
      (await supabase.from("coach_messages").select("*").eq("user_id", user!.id).order("created_at", { ascending: true })).data ?? [],
  });

  const send = useMutation({
    mutationFn: async (msg: string) => coachReply({ data: { message: msg } }),
    onSuccess: () => {
      setMessage("");
      qc.invalidateQueries({ queryKey: ["coach-messages", user?.id] });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <MessageCircle className="h-5 w-5 text-primary" />
        <h1 className="text-2xl font-bold">Coach</h1>
      </div>
      <Button asChild variant="ghost" size="sm" className="-mt-3"><Link to="/perfil">← Voltar ao perfil</Link></Button>

      <div className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-card min-h-[300px]">
        {history.length === 0 && (
          <p className="text-sm text-muted-foreground">Pergunte sobre seu treino, cardápio, ou peça uma substituição de refeição.</p>
        )}
        {history.map((m: any) => (
          <div key={m.id} className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${m.role === "user" ? "ml-auto bg-primary text-primary-foreground" : "bg-muted"}`}>
            {m.content}
          </div>
        ))}
        {send.isPending && <div className="max-w-[85%] rounded-xl bg-muted px-3 py-2 text-sm text-muted-foreground">Digitando…</div>}
      </div>

      <div className="flex gap-2">
        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Escreva sua dúvida…"
          onKeyDown={(e) => { if (e.key === "Enter" && message.trim()) send.mutate(message); }}
        />
        <Button onClick={() => message.trim() && send.mutate(message)} disabled={send.isPending || !message.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
