import { createFileRoute, Outlet, redirect, Link, useLocation } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { LayoutDashboard, Dumbbell, Salad, ShoppingCart, User } from "lucide-react";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    // Garante que exista uma linha de assinatura em trial ao entrar pela primeira vez
    const { data: sub } = await supabase.from("subscriptions").select("id").eq("user_id", data.user.id).maybeSingle();
    if (!sub) {
      const trialEnds = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
      await supabase.from("subscriptions").insert({
        user_id: data.user.id,
        status: "trialing",
        trial_ends_at: trialEnds,
      });
    }
    return { user: data.user };
  },
  component: AuthedLayout,
});

const NAV = [
  { to: "/dashboard", label: "Início", icon: LayoutDashboard },
  { to: "/treino", label: "Treino", icon: Dumbbell },
  { to: "/alimentacao", label: "Dieta", icon: Salad },
  { to: "/compras", label: "Compras", icon: ShoppingCart },
  { to: "/perfil", label: "Perfil", icon: User },
] as const;

function AuthedLayout() {
  const loc = useLocation();
  return (
    <div className="min-h-screen bg-background pb-20">
      <main className="mx-auto max-w-3xl px-4 py-6">
        <Outlet />
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-stretch justify-around">
          {NAV.map((item) => {
            const active = loc.pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link key={item.to} to={item.to} className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-xs ${active ? "text-primary" : "text-muted-foreground"}`}>
                <Icon className={`h-5 w-5 ${active ? "text-primary" : ""}`} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
