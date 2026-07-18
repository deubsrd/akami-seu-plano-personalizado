import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

type Search = { mode?: "login" | "signup"; ref?: string };

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    mode: s.mode === "signup" ? "signup" : "login",
    ref: typeof s.ref === "string" ? s.ref : undefined,
  }),
  head: () => ({ meta: [{ title: "Entrar — Akami" }] }),
  component: AuthPage,
});

function AuthPage() {
  const nav = useNavigate();
  const { mode, ref } = Route.useSearch();
  const isSignup = mode === "signup";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [terms, setTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) nav({ to: "/dashboard" });
    });
  }, [nav]);

  function ageFrom(dateStr: string): number {
    const d = new Date(dateStr);
    const diff = Date.now() - d.getTime();
    return Math.floor(diff / (365.25 * 24 * 3600 * 1000));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (isSignup) {
        if (!terms) return toast.error("Você precisa aceitar os termos e a privacidade.");
        if (!birthDate) return toast.error("Informe sua data de nascimento.");
        if (ageFrom(birthDate) < 18) return toast.error("É necessário ter 18 anos ou mais.");
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) return toast.error(error.message);
        const { data: userData } = await supabase.auth.getUser();
        if (userData.user) {
          await supabase.from("profiles").update({
            birth_date: birthDate,
            accepted_terms_at: new Date().toISOString(),
          }).eq("id", userData.user.id);
          if (ref) {
            await supabase.rpc("claim_referral", { p_code: ref });
          }
        }
        toast.success("Conta criada! Vamos começar.");
        nav({ to: "/onboarding" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) return toast.error(error.message);
        nav({ to: "/dashboard" });
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    if (isSignup && !terms) return toast.error("Aceite os termos para continuar.");
    const res = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (res.error) toast.error(res.error.message ?? "Erro no login com Google");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-primary-soft/40 to-background px-4 py-8">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-card">
        <Link to="/" className="text-sm text-muted-foreground">← Voltar</Link>
        <h1 className="mt-3 text-2xl font-semibold">
          {isSignup ? "Criar sua conta" : "Entrar no Akami"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isSignup ? "7 dias grátis. Sem compromisso." : "Bem-vindo de volta."}
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="password">Senha</Label>
            <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {isSignup && (
            <>
              <div>
                <Label htmlFor="birth">Data de nascimento</Label>
                <Input id="birth" type="date" required value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
                <p className="mt-1 text-xs text-muted-foreground">Idade mínima: 18 anos.</p>
              </div>
              <label className="flex items-start gap-2 text-sm">
                <Checkbox checked={terms} onCheckedChange={(v) => setTerms(!!v)} className="mt-0.5" />
                <span>
                  Aceito os{" "}
                  <Link to="/termos" className="text-primary underline">Termos de uso</Link> e a{" "}
                  <Link to="/privacidade" className="text-primary underline">Política de privacidade</Link>.
                </span>
              </label>
            </>
          )}
          <Button type="submit" disabled={loading} className="w-full" size="lg">
            {loading ? "Aguarde..." : isSignup ? "Criar conta" : "Entrar"}
          </Button>
        </form>

        <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
          <div className="h-px flex-1 bg-border" /> ou <div className="h-px flex-1 bg-border" />
        </div>

        <Button type="button" variant="outline" className="w-full" onClick={handleGoogle}>
          Continuar com Google
        </Button>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {isSignup ? "Já tem conta?" : "Novo por aqui?"}{" "}
          <Link to="/auth" search={{ mode: isSignup ? "login" : "signup" }} className="text-primary">
            {isSignup ? "Entrar" : "Criar conta"}
          </Link>
        </p>
      </div>
    </div>
  );
}
