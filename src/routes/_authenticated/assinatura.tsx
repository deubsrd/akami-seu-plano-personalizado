import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useSubscription } from "@/hooks/useSubscription";
import { Button } from "@/components/ui/button";
import { AKAMI_PRICE_ID, getStripeEnvironment } from "@/lib/stripe";
import { createPortalSession } from "@/lib/payments.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/assinatura")({
  head: () => ({ meta: [{ title: "Minha assinatura — Akami" }] }),
  component: SubscriptionPage,
});

function SubscriptionPage() {
  const nav = useNavigate();
  const { subscription, isActive } = useSubscription();
  const runPortal = useServerFn(createPortalSession);

  async function openPortal() {
    try {
      const res = await runPortal({ data: { returnUrl: window.location.href, environment: getStripeEnvironment() } });
      if ("error" in res) return toast.error(res.error);
      window.open(res.url, "_blank");
    } catch (e: any) {
      toast.error(e?.message ?? "Erro");
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Minha assinatura</h1>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-card space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">Plano</div>
          <div className="font-semibold">Akami Pro — R$ 49,90/mês</div>
        </div>
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">Status</div>
          <div className="font-medium capitalize">{subscription?.status ?? "—"}</div>
        </div>
        {subscription?.trial_ends_at && subscription.status === "trialing" && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">Trial termina</div>
            <div>{new Date(subscription.trial_ends_at).toLocaleDateString("pt-BR")}</div>
          </div>
        )}
        {subscription?.current_period_end && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">Próxima cobrança</div>
            <div>{new Date(subscription.current_period_end).toLocaleDateString("pt-BR")}</div>
          </div>
        )}
      </div>

      {!isActive || subscription?.status === "trialing" || subscription?.status === "canceled" || subscription?.status === "expired" ? (
        <Button
          size="lg" className="w-full"
          onClick={() => nav({ to: "/checkout", search: { price: AKAMI_PRICE_ID } })}
        >
          {subscription?.status === "trialing" ? "Adicionar cartão agora" : "Assinar Akami Pro"}
        </Button>
      ) : (
        <Button size="lg" variant="outline" className="w-full" onClick={openPortal}>
          Gerenciar assinatura (cancelar, trocar cartão)
        </Button>
      )}
    </div>
  );
}
