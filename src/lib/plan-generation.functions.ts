import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText, Output, NoObjectGeneratedError } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { calcMetrics, type MetricsInput } from "@/lib/formulas";

const IntakeSchema = z.object({
  sex: z.enum(["masculino", "feminino"]),
  age: z.number().int().min(18).max(90),
  height_cm: z.number().min(120).max(230),
  weight_kg: z.number().min(35).max(300),
  target_weight_kg: z.number().min(35).max(300),
  timeframe_weeks: z.number().int().min(2).max(104),
  goal: z.enum(["emagrecer", "ganhar_massa", "recomposicao"]),
  activity: z.enum(["sedentario", "leve", "moderado", "intenso", "muito_intenso"]),
  waist_cm: z.number().optional(),
  hip_cm: z.number().optional(),
  body_fat_pct: z.number().optional(),
  city: z.string().optional(),
  postal_code: z.string().optional(),
  injuries: z.string().optional(),
  medical_conditions: z.string().optional(),
  medications: z.string().optional(),
  training_experience: z.enum(["iniciante", "intermediario", "avancado"]),
  days_per_week: z.number().int().min(1).max(7),
  minutes_per_session: z.number().int().min(15).max(180),
  training_location: z.enum(["academia", "casa"]),
  equipment: z.string().optional(),
  meals_per_day: z.number().int().min(2).max(7),
  restrictions: z.string().optional(),
  disliked_foods: z.string().optional(),
  diet_history: z.string().optional(),
  budget_amount_brl: z.number().min(0),
  budget_period: z.enum(["weekly", "monthly"]),
  sleep_hours: z.number().optional(),
  stress_level: z.number().int().min(1).max(5).optional(),
  alcohol: z.string().optional(),
  smoking: z.string().optional(),
  cycle_notes: z.string().optional(),
});

const PlanSchema = z.object({
  training_plan: z.object({
    summary: z.string(),
    weekly_split: z.array(z.object({
      day: z.string(),
      focus: z.string(),
      exercises: z.array(z.object({
        name: z.string(),
        sets: z.number(),
        reps: z.string(),
        rest_seconds: z.number(),
        notes: z.string().nullable(),
      })),
    })),
    progression: z.string(),
  }),
  nutrition_plan: z.object({
    summary: z.string(),
    daily_meals: z.array(z.object({
      meal: z.string(),
      time_hint: z.string(),
      items: z.array(z.object({
        food: z.string(),
        quantity_g: z.number(),
        approx_kcal: z.number(),
      })),
    })),
    weekly_shopping_list: z.array(z.object({
      category: z.string(),
      name: z.string(),
      quantity: z.number(),
      unit: z.string(),
      estimated_price_brl: z.number(),
    })),
    budget_note: z.string(),
  }),
  warnings: z.array(z.string()),
});

export const generatePlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => IntakeSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const metricsInput: MetricsInput = {
      sex: data.sex, age: data.age, height_cm: data.height_cm, weight_kg: data.weight_kg,
      waist_cm: data.waist_cm, hip_cm: data.hip_cm, activity: data.activity, goal: data.goal,
    };
    const metrics = calcMetrics(metricsInput);

    // Salva intake
    const { data: intake, error: iErr } = await supabase.from("intake_forms").insert({
      user_id: userId,
      data,
    }).select("id").single();
    if (iErr) throw iErr;

    // Salva budget
    await supabase.from("budget_settings").upsert({
      user_id: userId,
      amount_brl: data.budget_amount_brl,
      period: data.budget_period,
    }, { onConflict: "user_id" });

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY não configurado");
    const gateway = createLovableAiGatewayProvider(apiKey);
    const model = gateway("google/gemini-3.5-flash");

    const budgetMonthly = data.budget_period === "monthly" ? data.budget_amount_brl : data.budget_amount_brl * 4.33;
    const budgetWeekly = data.budget_period === "weekly" ? data.budget_amount_brl : data.budget_amount_brl / 4.33;

    const prompt = `Você é um assistente de treino e nutrição. NUNCA diagnostique; apenas oriente com base nos números e responda em português (Brasil).

DADOS DA PESSOA:
${JSON.stringify(data, null, 2)}

MÉTRICAS CALCULADAS (use exatamente estas):
- IMC: ${metrics.imc} (${metrics.imc_classificacao})
- TMB: ${metrics.tmb_kcal} kcal, GET: ${metrics.get_kcal} kcal
- Meta calórica diária: ${metrics.meta_kcal} kcal
- Proteína: ${metrics.proteina_g} g, Gordura: ${metrics.gordura_g} g, Carbo: ${metrics.carbo_g} g

ORÇAMENTO PARA ALIMENTAÇÃO:
- Semanal: R$ ${budgetWeekly.toFixed(2)}
- Mensal: R$ ${budgetMonthly.toFixed(2)}

REGRAS:
1. Monte um treino em ${data.days_per_week} dias/semana, sessões de ~${data.minutes_per_session} min, adaptado a ${data.training_location} e nível ${data.training_experience}.
2. Respeite lesões (${data.injuries || "nenhuma"}) e condições (${data.medical_conditions || "nenhuma"}).
3. Cardápio com ${data.meals_per_day} refeições/dia respeitando kcal e macros acima, restrições (${data.restrictions || "nenhuma"}) e preferências.
4. Lista de compras SEMANAL consolidada por categoria (hortifrúti, proteínas, grãos, laticínios, outros) com preços médios de referência no Brasil em reais. Some tudo e compare com R$ ${budgetWeekly.toFixed(2)}. Se estourar, alerte em budget_note com sugestões de substituição.
5. Em "warnings", inclua avisos importantes com base nos dados (ex.: procurar médico se há condições, sinais de alerta, etc.).
6. Retorne SOMENTE o objeto conforme o schema.`;

    let plan;
    try {
      const { output } = await generateText({
        model,
        prompt,
        output: Output.object({ schema: PlanSchema }),
      });
      plan = output;
    } catch (e) {
      if (NoObjectGeneratedError.isInstance(e)) {
        throw new Error("A IA não conseguiu gerar um plano válido. Tente novamente.");
      }
      throw e;
    }

    // Desativa plano anterior e salva novo
    await supabase.from("generated_plans").update({ is_active: false }).eq("user_id", userId).eq("is_active", true);
    const { data: saved, error: pErr } = await supabase.from("generated_plans").insert({
      user_id: userId,
      intake_form_id: intake.id,
      metrics: metrics as any,
      training_plan: plan.training_plan as any,
      nutrition_plan: plan.nutrition_plan as any,
      warnings: plan.warnings,
      is_active: true,
    }).select("id").single();
    if (pErr) throw pErr;

    // Cria itens de lista de compras
    if (plan.nutrition_plan.weekly_shopping_list.length) {
      await supabase.from("shopping_list_items").delete().eq("user_id", userId).eq("plan_id", saved.id);
      const rows = plan.nutrition_plan.weekly_shopping_list.map((it) => ({
        user_id: userId,
        plan_id: saved.id,
        category: it.category,
        name: it.name,
        quantity: it.quantity,
        unit: it.unit,
        estimated_price_brl: it.estimated_price_brl,
      }));
      await supabase.from("shopping_list_items").insert(rows);
    }

    return { plan_id: saved.id, metrics };
  });
