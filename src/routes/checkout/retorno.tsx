import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";

type Search = { session_id?: string };

export const Route = createFileRoute("/checkout/retorno")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    session_id: typeof s.session_id === "string" ? s.session_id : undefined,
  }),
  head: () => ({ meta: [{ title: "Pagamento concluído — Akami" }] }),
  component: ReturnPage,
});

function ReturnPage() {
  const { session_id } = Route.useSearch();
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4 text-center">
      <CheckCircle2 className="h-14 w-14 text-primary" />
      <h1 className="mt-4 text-2xl font-bold">Tudo certo!</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {session_id ? "Sua assinatura está ativa. Aproveite seus 7 dias grátis." : "Sem informação da sessão."}
      </p>
      <Link to="/dashboard" className="mt-6 inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
        Ir para o app
      </Link>
    </div>
  );
}
