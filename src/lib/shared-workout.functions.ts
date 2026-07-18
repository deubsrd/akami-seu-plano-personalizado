import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText, Output, NoObjectGeneratedError, NoOutputGeneratedError } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

const SharedWorkoutSchema = z.object({
  shared_notes: z.string(),
  per_user: z.record(
    z.string(),
    z.object({
      focus: z.string(),
      exercises: z.array(
        z.object({
          name: z.string(),
          sets: z.number(),
          reps: z.string(),
          load_hint: z.string(),
          notes: z.string().nullable(),
        }),
      ),
    }),
  ),
});

export const generateSharedWorkout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { connection_id: string; scheduled_for: string | null }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: connection, error: connErr } = await supabase
      .from("friend_connections")
      .select("*")
      .eq("id", data.connection_id)
      .eq("status", "accepted")
      .single();
    if (connErr || !connection) throw new Error("Conexão não encontrada ou ainda não aceita.");

    const otherUserId = connection.requester_id === userId ? connection.addressee_id : connection.requester_id;
    if (connection.requester_id !== userId && connection.addressee_id !== userId) {
      throw new Error("Você não faz parte dessa conexão.");
    }

    // Busca o plano ativo mais recente de cada pessoa
    const [{ data: myPlan }, { data: otherPlan }] = await Promise.all([
      supabase.from("generated_plans").select("metrics, training_plan").eq("user_id", userId).eq("is_active", true).maybeSingle(),
      supabase.from("generated_plans").select("metrics, training_plan").eq("user_id", otherUserId).eq("is_active", true).maybeSingle(),
    ]);

    if (!myPlan || !otherPlan) {
      throw new Error("Os dois precisam ter gerado um plano de treino antes de montar o treino combinado.");
    }

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY não configurado");
    const gateway = createLovableAiGatewayProvider(apiKey);
    const model = gateway("google/gemini-3.5-flash");

    const prompt = `Você é um assistente de treino. NUNCA diagnostique; apenas oriente com base nos planos individuais. Responda em português (Brasil).

Monte UM treino combinado para duas pessoas treinarem juntas no mesmo horário, adaptando a carga/exercícios de cada uma individualmente ao nível e ao plano que cada uma já tem.

PLANO DA PESSOA A (chave "${userId}"):
${JSON.stringify(myPlan.training_plan, null, 2)}

PLANO DA PESSOA B (chave "${otherUserId}"):
${JSON.stringify(otherPlan.training_plan, null, 2)}

REGRAS:
1. Escolha um foco de treino compatível entre as duas (ex: se uma treina perna e outra treina costas hoje, sugira um foco que funcione pros dois, como full body ou o foco mais frequente entre os dois planos).
2. Para cada pessoa, gere exercícios com séries, repetições e uma dica de carga relativa (ex: "leve", "moderada para você", "seu 1RM atual"), nunca invente número de carga absoluto.
3. "shared_notes" deve motivar o treino em dupla e mencionar como sincronizar os descansos.
4. As chaves do objeto "per_user" DEVEM ser exatamente "${userId}" e "${otherUserId}".
5. Retorne SOMENTE o objeto conforme o schema.`;

    let plan;
    try {
      const { output } = await generateText({
        model,
        prompt,
        maxOutputTokens: 3000,
        output: Output.object({ schema: SharedWorkoutSchema }),
      });
      plan = output;
    } catch (e) {
      if (NoObjectGeneratedError.isInstance(e)) {
        console.error("[generateSharedWorkout] NoObjectGeneratedError:", { cause: e.cause, text: e.text?.slice(0, 1000), finishReason: (e as any).finishReason });
        throw new Error("A IA não conseguiu gerar o treino combinado. Tente novamente.");
      }
      if (NoOutputGeneratedError.isInstance(e)) {
        console.error("[generateSharedWorkout] NoOutputGeneratedError:", { finishReason: (e as any).finishReason, message: e.message });
        throw new Error("A IA não retornou conteúdo para o treino combinado. Tente novamente.");
      }
      console.error("[generateSharedWorkout] erro inesperado:", e);
      throw e;
    }

    const { data: saved, error: saveErr } = await supabase
      .from("shared_workouts")
      .insert({
        connection_id: data.connection_id,
        created_by: userId,
        scheduled_for: data.scheduled_for,
        workout_plan: plan as any,
        status: "scheduled",
      })
      .select("id")
      .single();
    if (saveErr) throw saveErr;

    return { shared_workout_id: saved.id };
  });
