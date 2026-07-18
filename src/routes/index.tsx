import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Check, Sparkles, ShoppingCart, Dumbbell, Salad } from "lucide-react";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2 text-lg font-semibold">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg gradient-hero text-primary-foreground">A</span>
            Akami
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/auth" className="text-sm text-muted-foreground hover:text-foreground">Entrar</Link>
            <Button asChild size="sm"><Link to="/auth" search={{ mode: "signup" }}>Começar grátis</Link></Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,var(--primary-soft),transparent_60%)]" />
        <div className="mx-auto max-w-6xl px-4 pt-12 pb-16 md:pt-20 md:pb-24">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" /> Inteligência artificial para saúde e treino
            </div>
            <h1 className="text-4xl font-bold tracking-tight md:text-6xl">
              Seu treino e sua dieta,{" "}
              <span className="bg-clip-text text-transparent gradient-hero">prontos</span>,
              com a lista de compras já calculada.
            </h1>
            <p className="mt-5 text-lg text-muted-foreground md:text-xl">
              Responda um questionário, receba um plano personalizado por IA e vá para o mercado sabendo exatamente o que comprar — dentro do seu orçamento.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" className="w-full sm:w-auto">
                <Link to="/auth" search={{ mode: "signup" }}>Começar teste grátis de 7 dias</Link>
              </Button>
              <span className="text-xs text-muted-foreground">Depois R$ 49,90/mês. Cancele quando quiser.</span>
            </div>
          </div>
        </div>
      </section>

      {/* Como funciona */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-center text-3xl font-semibold">Como funciona em 3 passos</h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {[
            { icon: Sparkles, title: "Responda o questionário", desc: "Objetivos, saúde, rotina, alimentação e orçamento — em minutos." },
            { icon: Dumbbell, title: "Receba seu plano por IA", desc: "Treino adaptado ao seu nível e cardápio dentro das suas metas." },
            { icon: ShoppingCart, title: "Vá ao mercado tranquilo", desc: "Lista de compras consolidada, com preços estimados e alerta se estourar o orçamento." },
          ].map((s, i) => (
            <div key={i} className="rounded-2xl border border-border bg-card p-6 shadow-card">
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary-soft text-primary">
                <s.icon className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold">{i + 1}. {s.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Recursos */}
      <section className="border-y border-border bg-secondary/30 py-16">
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid gap-8 md:grid-cols-2">
            <div>
              <h2 className="text-3xl font-semibold">Tudo o que você precisa em um app leve</h2>
              <p className="mt-3 text-muted-foreground">Feito para ser rápido no celular. Marcar refeição, beber água ou concluir um treino é um toque só.</p>
            </div>
            <ul className="space-y-3">
              {[
                "Ficha de treino com timer e histórico de cargas",
                "Cardápio diário, macros e registro em segundos",
                "Meta de água com anel de progresso",
                "Reavaliação de medidas e ajuste automático do plano",
                "Modo escuro, PWA instalável, notificações",
                "Seus dados só seus (LGPD)",
              ].map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Preço */}
      <section className="mx-auto max-w-3xl px-4 py-16">
        <div className="rounded-3xl border border-border bg-card p-8 shadow-lg-teal">
          <div className="flex items-center gap-2 text-primary"><Salad className="h-5 w-5" /> Plano único</div>
          <h3 className="mt-2 text-2xl font-semibold">Akami Pro</h3>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-5xl font-bold">R$ 49,90</span>
            <span className="text-muted-foreground">/mês</span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">7 dias grátis. Cancele a qualquer momento.</p>
          <ul className="mt-6 space-y-2 text-sm">
            {["Planos ilimitados gerados por IA","Lista de compras com orçamento","Todo o acompanhamento diário","Histórico e gráficos completos"].map(x => (
              <li key={x} className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> {x}</li>
            ))}
          </ul>
          <Button asChild size="lg" className="mt-6 w-full">
            <Link to="/auth" search={{ mode: "signup" }}>Começar teste grátis</Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card">
        <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-muted-foreground">
          <p className="rounded-lg border border-warning/30 bg-warning/10 p-4 text-warning-foreground">
            <strong>Aviso importante:</strong> Ferramenta de orientação esportiva e nutricional gerada por IA. Não substitui diagnóstico ou acompanhamento médico.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
            <span>© {new Date().getFullYear()} Akami</span>
            <div className="flex gap-4">
              <Link to="/termos" className="hover:text-foreground">Termos de uso</Link>
              <Link to="/privacidade" className="hover:text-foreground">Privacidade</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
