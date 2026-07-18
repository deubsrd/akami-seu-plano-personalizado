import { createFileRoute, Link } from "@tanstack/react-router";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { useServerFn } from "@tanstack/react-start";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { createCheckoutSession } from "@/lib/payments.functions";
import { useCallback } from "react";

type Search = { price?: string };

export const Route = createFileRoute("/checkout")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    price: typeof s.price === "string" ? s.price : undefined,
  }),
  head: () => ({ meta: [{ title: "Assinar Akami Pro" }] }),
  component: CheckoutPage,
});

function CheckoutPage() {
  const { price } = Route.useSearch();
  const runCreate = useServerFn(createCheckoutSession);

  const fetchClientSecret = useCallback(async () => {
    if (!price) throw new Error("Preço não informado");
    const res = await runCreate({
      data: {
        priceId: price,
        environment: getStripeEnvironment(),
        returnUrl: `${window.location.origin}/checkout/retorno?session_id={CHECKOUT_SESSION_ID}`,
      },
    });
    if ("error" in res) throw new Error(res.error);
    if (!res.clientSecret) throw new Error("Sessão inválida");
    return res.clientSecret;
  }, [price, runCreate]);

  const isTest = typeof window !== "undefined" && (import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN ?? "").startsWith("pk_test_");

  return (
    <div className="min-h-screen bg-background">
      {isTest && (
        <div className="bg-warning/20 px-4 py-2 text-center text-xs text-warning-foreground">
          Ambiente de testes — nenhum valor será cobrado. Use o cartão 4242 4242 4242 4242.
        </div>
      )}
      <div className="mx-auto max-w-2xl px-4 py-6">
        <Link to="/assinatura" className="text-sm text-muted-foreground">← Voltar</Link>
        <h1 className="mt-3 text-2xl font-bold">Assinar Akami Pro</h1>
        <p className="text-sm text-muted-foreground">7 dias grátis. Cancele quando quiser.</p>

        <div className="mt-6 rounded-2xl border border-border bg-card p-2 shadow-card">
          <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret }}>
            <EmbeddedCheckout />
          </EmbeddedCheckoutProvider>
        </div>
      </div>
    </div>
  );
}
