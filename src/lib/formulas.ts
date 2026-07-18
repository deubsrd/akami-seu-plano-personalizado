// Cálculos determinísticos (não IA) de composição corporal e energia.

export type Sex = "masculino" | "feminino";
export type Goal = "emagrecer" | "ganhar_massa" | "recomposicao";
export type ActivityLevel = "sedentario" | "leve" | "moderado" | "intenso" | "muito_intenso";

export interface MetricsInput {
  sex: Sex;
  age: number;
  height_cm: number;
  weight_kg: number;
  waist_cm?: number;
  hip_cm?: number;
  activity: ActivityLevel;
  goal: Goal;
}

export interface Metrics {
  imc: number;
  imc_classificacao: string;
  rcq: number | null;
  rce: number | null;
  tmb_kcal: number;
  get_kcal: number;
  meta_kcal: number;
  proteina_g: number;
  gordura_g: number;
  carbo_g: number;
}

const FACTORS: Record<ActivityLevel, number> = {
  sedentario: 1.2,
  leve: 1.375,
  moderado: 1.55,
  intenso: 1.725,
  muito_intenso: 1.9,
};

function classifyIMC(imc: number): string {
  if (imc < 18.5) return "Abaixo do peso";
  if (imc < 25) return "Peso adequado";
  if (imc < 30) return "Sobrepeso";
  if (imc < 35) return "Obesidade grau 1";
  if (imc < 40) return "Obesidade grau 2";
  return "Obesidade grau 3";
}

export function calcMetrics(input: MetricsInput): Metrics {
  const { sex, age, height_cm, weight_kg, waist_cm, hip_cm, activity, goal } = input;
  const imc = weight_kg / Math.pow(height_cm / 100, 2);
  const rcq = waist_cm && hip_cm ? waist_cm / hip_cm : null;
  const rce = waist_cm ? waist_cm / height_cm : null;

  // Mifflin-St Jeor
  const s = sex === "masculino" ? 5 : -161;
  const tmb = 10 * weight_kg + 6.25 * height_cm - 5 * age + s;
  const get = tmb * FACTORS[activity];

  let meta = get;
  if (goal === "emagrecer") meta = get - 500;
  else if (goal === "ganhar_massa") meta = get + 300;

  // proteína priorizada
  const proteinaPerKg = goal === "ganhar_massa" ? 2.0 : goal === "emagrecer" ? 2.2 : 1.8;
  const proteina_g = Math.round(proteinaPerKg * weight_kg);
  const gordura_g = Math.round((meta * 0.27) / 9);
  const carbo_g = Math.max(50, Math.round((meta - proteina_g * 4 - gordura_g * 9) / 4));

  return {
    imc: Math.round(imc * 10) / 10,
    imc_classificacao: classifyIMC(imc),
    rcq: rcq ? Math.round(rcq * 100) / 100 : null,
    rce: rce ? Math.round(rce * 100) / 100 : null,
    tmb_kcal: Math.round(tmb),
    get_kcal: Math.round(get),
    meta_kcal: Math.round(meta),
    proteina_g,
    gordura_g,
    carbo_g,
  };
}

export function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
