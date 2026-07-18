import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

export const coachReply = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { message: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const [{ data: plan }, { data: recentWorkouts }, { data: recentNutrition }, { data: history }] = await Promise.all([
      supabase.from("generated_plans").select("metrics, training_plan, nutrition_plan").eq("user_id", userId).eq("is_active", true).maybeSingle(),
      supabase.from("workout_sessions").select("performed_on, pain_notes, overall_rpe").eq("user_id", userId).order("performed_on", { ascending: false }).limit(5),
      supabase.from("nutrition_log").select("logged_on, description, followed_plan").eq("user_id", userId).order("logged_on", { ascending: false }).limit(5),
      supabase.from("coach_messages").select("role, content").eq("user_id", userId).order("created_at", { ascending: true }).limit(20),
    ]);

    await supabase.from("coach_messages").insert({ user_id: userId, role: "user", content: data.message });

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY não configurado");
    const gateway = createLovableAiGatewayProvider(apiKey);
    const model = gateway("google/gemini-3.5-flash");

    const systemPrompt = `Você é o Coach do Akami: um assistente de treino e nutrição, em português (Brasil), acolhedor e direto.
NUNCA diagnostique condições médicas. Quando o assunto for clínico (dor persistente, condição de saúde, medicação), sempre reforce que isso não substitui um profissional de saúde e sugira procurar um.
Responda dúvidas do dia a dia: substituição de refeição, ajuste de treino por dor/cansaço leve, dúvidas sobre o plano atual.

PLANO ATUAL: ${plan ? JSON.stringify(plan) : "a pessoa ainda não gerou um plano"}
ÚLTIMOS TREINOS: ${JSON.stringify(recentWorkouts ?? [])}
ÚLTIMOS REGISTROS DE ALIMENTAÇÃO: ${JSON.stringify(recentNutrition ?? [])}`;

    const messages = [
      { role: "system" as const, content: systemPrompt },
      ...(history ?? []).map((h) => ({ role: h.role as "user" | "assistant", content: h.content })),
      { role: "user" as const, content: data.message },
    ];

    const { text } = await generateText({ model, messages });

    await supabase.from("coach_messages").insert({ user_id: userId, role: "assistant", content: text });

    return { reply: text };
  });
