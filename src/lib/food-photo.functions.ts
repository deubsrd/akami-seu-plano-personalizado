import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText, Output, NoObjectGeneratedError, NoOutputGeneratedError } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

const FoodEstimateSchema = z.object({
  description: z.string(),
  calories: z.number(),
  protein_g: z.number(),
  carbs_g: z.number(),
  fat_g: z.number(),
  confidence_note: z.string(),
});

export const analyzeFoodPhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { image_base64: string; media_type: string }) => data)
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY não configurado");
    const gateway = createLovableAiGatewayProvider(apiKey);
    const model = gateway("google/gemini-2.5-flash");

    let estimate;
    try {
      const { output } = await generateText({
        model,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Você é um assistente de nutrição. NUNCA diagnostique. Olhe a foto do prato e estime, em português (Brasil), a descrição da refeição e uma estimativa aproximada de calorias e macros (proteína, carboidrato, gordura em gramas). Deixe claro em confidence_note que é uma estimativa visual, não uma medição exata. Retorne SOMENTE o objeto conforme o schema.",
              },
              {
                type: "image",
                image: `data:${data.media_type};base64,${data.image_base64}`,
              },
            ],
          },
        ],
        output: Output.object({ schema: FoodEstimateSchema }),
        maxOutputTokens: 1000,
        providerOptions: { lovable: { reasoningEffort: "low" } },
      });
      estimate = output;
    } catch (e) {
      if (NoObjectGeneratedError.isInstance(e)) {
        console.error("[analyzeFoodPhoto] NoObjectGeneratedError:", { cause: e.cause, text: e.text?.slice(0, 1000), finishReason: (e as any).finishReason });
        throw new Error("Não conseguimos identificar o prato nessa foto. Tente outra foto ou registre manualmente.");
      }
      if (NoOutputGeneratedError.isInstance(e)) {
        console.error("[analyzeFoodPhoto] NoOutputGeneratedError:", { finishReason: (e as any).finishReason, message: e.message });
        throw new Error("Não conseguimos analisar essa foto. Tente outra foto ou registre manualmente.");
      }
      console.error("[analyzeFoodPhoto] erro inesperado:", e);
      throw e;
    }

    return estimate;
  });
