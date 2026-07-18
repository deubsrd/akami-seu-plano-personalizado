import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { formatBRL } from "@/lib/formulas";
import { AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/compras")({
  head: () => ({ meta: [{ title: "Compras — Akami" }] }),
  component: ShoppingPage,
});

function ShoppingPage() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: budget } = useQuery({
    queryKey: ["budget", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("budget_settings").select("*").eq("user_id", user!.id).maybeSingle();
      return data;
    },
  });

  const { data: items = [] } = useQuery({
    queryKey: ["shopping-items", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("shopping_list_items").select("*").eq("user_id", user!.id).order("category");
      return data ?? [];
    },
  });

  const toggle = useMutation({
    mutationFn: async ({ id, is_purchased }: { id: string; is_purchased: boolean }) => {
      await supabase.from("shopping_list_items").update({ is_purchased }).eq("id", id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shopping-items"] }),
  });

  const updatePrice = useMutation({
    mutationFn: async ({ id, price }: { id: string; price: number }) => {
      await supabase.from("shopping_list_items").update({ estimated_price_brl: price }).eq("id", id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shopping-items"] }),
  });

  if (!items.length) return (
    <div className="rounded-2xl border border-border bg-card p-6 text-center">
      <p>Sem lista de compras ainda.</p>
      <Link to="/onboarding" className="text-primary underline">Gerar plano</Link>
    </div>
  );

  const total = items.reduce((s, it: any) => s + Number(it.estimated_price_brl) * Number(it.quantity), 0);
  const budgetAmount = Number(budget?.amount_brl ?? 0);
  const weeklyBudget = budget?.period === "monthly" ? budgetAmount / 4.33 : budgetAmount;
  const overBudget = weeklyBudget > 0 && total > weeklyBudget;

  const grouped: Record<string, any[]> = {};
  for (const it of items) (grouped[it.category] ??= []).push(it);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Lista de compras</h1>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-muted-foreground">Total estimado (semanal)</div>
            <div className="text-2xl font-bold">{formatBRL(total)}</div>
          </div>
          <div className="text-right text-sm">
            <div className="text-muted-foreground">Seu orçamento</div>
            <div className="font-semibold">{formatBRL(weeklyBudget)}</div>
          </div>
        </div>
        {overBudget && (
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-xs">
            <AlertTriangle className="h-4 w-4 shrink-0 text-warning" />
            <span>Estourou o orçamento em {formatBRL(total - weeklyBudget)}. Considere substituir proteínas caras por ovos, frango ou lentilha.</span>
          </div>
        )}
        <p className="mt-2 text-xs text-muted-foreground">Preços são estimativas de referência, não valores em tempo real.</p>
      </div>

      {Object.entries(grouped).map(([cat, list]) => (
        <div key={cat} className="rounded-xl border border-border bg-card p-4 shadow-card">
          <h3 className="mb-2 font-semibold capitalize">{cat}</h3>
          <ul className="space-y-2">
            {list.map((it: any) => (
              <li key={it.id} className="flex items-center gap-3">
                <Checkbox checked={it.is_purchased} onCheckedChange={(v) => toggle.mutate({ id: it.id, is_purchased: !!v })} />
                <div className={`flex-1 text-sm ${it.is_purchased ? "line-through text-muted-foreground" : ""}`}>
                  {it.name} <span className="text-xs text-muted-foreground">— {it.quantity} {it.unit}</span>
                </div>
                <Input
                  type="number" step="0.01"
                  className="w-24 text-right"
                  defaultValue={it.estimated_price_brl}
                  onBlur={(e) => {
                    const p = Number(e.target.value);
                    if (!isNaN(p) && p !== Number(it.estimated_price_brl)) updatePrice.mutate({ id: it.id, price: p });
                  }}
                />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
