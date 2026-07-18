import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/termos")({
  head: () => ({ meta: [{ title: "Termos de Uso — Akami" }, { name: "description", content: "Termos de uso do Akami." }] }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 prose prose-neutral">
      <Link to="/" className="text-sm text-primary">← Voltar</Link>
      <h1 className="mt-4 text-3xl font-bold">Termos de Uso</h1>
      <p className="text-muted-foreground">Última atualização: {new Date().toLocaleDateString("pt-BR")}</p>
      <div className="mt-6 space-y-4 text-sm leading-relaxed text-foreground/90">
        <p>O Akami é uma ferramenta de orientação esportiva e nutricional gerada por inteligência artificial. Ao criar sua conta, você declara ter pelo menos 18 anos e aceita estes termos.</p>
        <h2 className="text-lg font-semibold mt-6">1. Natureza do serviço</h2>
        <p>Os planos de treino, cardápio e listas de compras são sugestões automatizadas com base nas informações que você fornece. <strong>O Akami não substitui avaliação, diagnóstico ou acompanhamento por profissionais de saúde qualificados</strong>. Consulte médico e/ou nutricionista antes de iniciar qualquer programa.</p>
        <h2 className="text-lg font-semibold mt-6">2. Uso adequado</h2>
        <p>Você é responsável pela veracidade das informações que fornece e pelas decisões que toma com base nas orientações do app. Sintomas atípicos, dor persistente ou qualquer emergência devem ser tratados com um profissional de saúde.</p>
        <h2 className="text-lg font-semibold mt-6">3. Assinatura</h2>
        <p>Oferecemos 7 dias grátis. Após esse período, o valor mensal informado será cobrado automaticamente. Você pode cancelar a qualquer momento na tela "Minha assinatura"; o acesso permanece até o fim do período pago.</p>
        <h2 className="text-lg font-semibold mt-6">4. Preços</h2>
        <p>Os preços de referência da lista de compras são estimativas internas, não uma integração em tempo real com supermercados. Podem divergir do valor real na sua região.</p>
        <h2 className="text-lg font-semibold mt-6">5. Limitação de responsabilidade</h2>
        <p>Na máxima extensão permitida por lei, o Akami não se responsabiliza por danos decorrentes do uso ou incapacidade de uso do serviço.</p>
      </div>
    </div>
  );
}
