import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacidade")({
  head: () => ({ meta: [{ title: "Política de Privacidade — Akami" }, { name: "description", content: "Como o Akami trata seus dados." }] }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <Link to="/" className="text-sm text-primary">← Voltar</Link>
      <h1 className="mt-4 text-3xl font-bold">Política de Privacidade</h1>
      <p className="text-muted-foreground">Última atualização: {new Date().toLocaleDateString("pt-BR")}</p>
      <div className="mt-6 space-y-4 text-sm leading-relaxed text-foreground/90">
        <p>O Akami coleta dados que você fornece no questionário (idade, medidas, condições de saúde, hábitos alimentares, orçamento) para gerar seu plano personalizado. Esses dados são tratados como <strong>dados sensíveis de saúde</strong> nos termos da LGPD.</p>
        <h2 className="text-lg font-semibold mt-6">Como usamos</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Gerar e atualizar seu plano de treino e alimentação;</li>
          <li>Calcular a lista de compras dentro do seu orçamento;</li>
          <li>Mostrar seu histórico e progresso;</li>
          <li>Enviar lembretes que você habilitar.</li>
        </ul>
        <h2 className="text-lg font-semibold mt-6">Com quem compartilhamos</h2>
        <p>Provedor de infraestrutura (Lovable Cloud) e provedor de IA para gerar os planos, sob acordo de confidencialidade. Nunca vendemos seus dados.</p>
        <h2 className="text-lg font-semibold mt-6">Seus direitos</h2>
        <p>Você pode exportar ou excluir sua conta e todos os seus dados a qualquer momento, na tela de Perfil. Também pode revogar consentimentos e solicitar informações sobre o tratamento.</p>
        <h2 className="text-lg font-semibold mt-6">Contato</h2>
        <p>Dúvidas sobre privacidade: privacidade@akami.app</p>
      </div>
    </div>
  );
}
