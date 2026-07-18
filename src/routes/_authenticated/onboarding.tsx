import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { generatePlan } from "@/lib/plan-generation.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({ meta: [{ title: "Questionário — Akami" }] }),
  component: OnboardingPage,
});

const STEPS = ["Você", "Objetivo", "Saúde", "Treino", "Alimentação", "Estilo de vida"] as const;

type FormData = Record<string, any>;

function OnboardingPage() {
  const nav = useNavigate();
  const runGenerate = useServerFn(generatePlan);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>({
    sex: "masculino", age: 30, height_cm: 175, weight_kg: 80,
    target_weight_kg: 75, timeframe_weeks: 12, goal: "emagrecer",
    activity: "moderado", training_experience: "iniciante",
    days_per_week: 4, minutes_per_session: 60, training_location: "academia",
    meals_per_day: 4, budget_amount_brl: 400, budget_period: "weekly",
  });
  const [loading, setLoading] = useState(false);

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));
  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const prev = () => setStep((s) => Math.max(s - 1, 0));

  async function submit() {
    setLoading(true);
    try {
      const payload = {
        ...form,
        age: Number(form.age),
        height_cm: Number(form.height_cm),
        weight_kg: Number(form.weight_kg),
        target_weight_kg: Number(form.target_weight_kg),
        timeframe_weeks: Number(form.timeframe_weeks),
        days_per_week: Number(form.days_per_week),
        minutes_per_session: Number(form.minutes_per_session),
        meals_per_day: Number(form.meals_per_day),
        budget_amount_brl: Number(form.budget_amount_brl),
        waist_cm: form.waist_cm ? Number(form.waist_cm) : undefined,
        hip_cm: form.hip_cm ? Number(form.hip_cm) : undefined,
        body_fat_pct: form.body_fat_pct ? Number(form.body_fat_pct) : undefined,
        sleep_hours: form.sleep_hours ? Number(form.sleep_hours) : undefined,
        stress_level: form.stress_level ? Number(form.stress_level) : undefined,
      };
      await runGenerate({ data: payload });
      toast.success("Seu plano está pronto!");
      nav({ to: "/dashboard" });
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao gerar plano");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-2 text-sm text-muted-foreground">Passo {step + 1} de {STEPS.length} — {STEPS[step]}</div>
        <Progress value={((step + 1) / STEPS.length) * 100} />
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-card space-y-4">
        {step === 0 && (
          <>
            <Field label="Sexo biológico">
              <Select value={form.sex} onValueChange={(v) => set("sex", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="masculino">Masculino</SelectItem>
                  <SelectItem value="feminino">Feminino</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Idade"><Input type="number" value={form.age} onChange={(e) => set("age", e.target.value)} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Altura (cm)"><Input type="number" value={form.height_cm} onChange={(e) => set("height_cm", e.target.value)} /></Field>
              <Field label="Peso atual (kg)"><Input type="number" step="0.1" value={form.weight_kg} onChange={(e) => set("weight_kg", e.target.value)} /></Field>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Cintura (cm) opc."><Input type="number" value={form.waist_cm ?? ""} onChange={(e) => set("waist_cm", e.target.value)} /></Field>
              <Field label="Quadril (cm) opc."><Input type="number" value={form.hip_cm ?? ""} onChange={(e) => set("hip_cm", e.target.value)} /></Field>
              <Field label="% Gordura opc."><Input type="number" value={form.body_fat_pct ?? ""} onChange={(e) => set("body_fat_pct", e.target.value)} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Cidade"><Input value={form.city ?? ""} onChange={(e) => set("city", e.target.value)} /></Field>
              <Field label="CEP"><Input value={form.postal_code ?? ""} onChange={(e) => set("postal_code", e.target.value)} /></Field>
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <Field label="Objetivo principal">
              <Select value={form.goal} onValueChange={(v) => set("goal", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="emagrecer">Emagrecer</SelectItem>
                  <SelectItem value="ganhar_massa">Ganhar massa</SelectItem>
                  <SelectItem value="recomposicao">Recomposição (ambos)</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Meta de peso (kg)"><Input type="number" step="0.1" value={form.target_weight_kg} onChange={(e) => set("target_weight_kg", e.target.value)} /></Field>
              <Field label="Prazo (semanas)"><Input type="number" value={form.timeframe_weeks} onChange={(e) => set("timeframe_weeks", e.target.value)} /></Field>
            </div>
            <Field label="Nível de atividade cotidiana">
              <Select value={form.activity} onValueChange={(v) => set("activity", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sedentario">Sedentário</SelectItem>
                  <SelectItem value="leve">Leve</SelectItem>
                  <SelectItem value="moderado">Moderado</SelectItem>
                  <SelectItem value="intenso">Intenso</SelectItem>
                  <SelectItem value="muito_intenso">Muito intenso</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </>
        )}

        {step === 2 && (
          <>
            <Field label="Lesões ou dores"><Textarea value={form.injuries ?? ""} onChange={(e) => set("injuries", e.target.value)} placeholder="Nenhuma" /></Field>
            <Field label="Condições médicas"><Textarea value={form.medical_conditions ?? ""} onChange={(e) => set("medical_conditions", e.target.value)} placeholder="Nenhuma" /></Field>
            <Field label="Medicações em uso"><Textarea value={form.medications ?? ""} onChange={(e) => set("medications", e.target.value)} placeholder="Nenhuma" /></Field>
          </>
        )}

        {step === 3 && (
          <>
            <Field label="Experiência com treino">
              <Select value={form.training_experience} onValueChange={(v) => set("training_experience", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="iniciante">Iniciante</SelectItem>
                  <SelectItem value="intermediario">Intermediário</SelectItem>
                  <SelectItem value="avancado">Avançado</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Dias disponíveis/semana"><Input type="number" min={1} max={7} value={form.days_per_week} onChange={(e) => set("days_per_week", e.target.value)} /></Field>
              <Field label="Minutos por sessão"><Input type="number" value={form.minutes_per_session} onChange={(e) => set("minutes_per_session", e.target.value)} /></Field>
            </div>
            <Field label="Local do treino">
              <Select value={form.training_location} onValueChange={(v) => set("training_location", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="academia">Academia</SelectItem>
                  <SelectItem value="casa">Casa</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Equipamentos disponíveis"><Textarea value={form.equipment ?? ""} onChange={(e) => set("equipment", e.target.value)} placeholder="Ex.: halteres, barra, elásticos..." /></Field>
          </>
        )}

        {step === 4 && (
          <>
            <Field label="Refeições por dia"><Input type="number" min={2} max={7} value={form.meals_per_day} onChange={(e) => set("meals_per_day", e.target.value)} /></Field>
            <Field label="Restrições ou alergias"><Textarea value={form.restrictions ?? ""} onChange={(e) => set("restrictions", e.target.value)} placeholder="Ex.: lactose, glúten..." /></Field>
            <Field label="Alimentos que não gosta"><Textarea value={form.disliked_foods ?? ""} onChange={(e) => set("disliked_foods", e.target.value)} /></Field>
            <Field label="Histórico de dietas"><Textarea value={form.diet_history ?? ""} onChange={(e) => set("diet_history", e.target.value)} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Orçamento (R$)"><Input type="number" value={form.budget_amount_brl} onChange={(e) => set("budget_amount_brl", e.target.value)} /></Field>
              <Field label="Período">
                <Select value={form.budget_period} onValueChange={(v) => set("budget_period", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Semanal</SelectItem>
                    <SelectItem value="monthly">Mensal</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </>
        )}

        {step === 5 && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Horas de sono"><Input type="number" step="0.5" value={form.sleep_hours ?? ""} onChange={(e) => set("sleep_hours", e.target.value)} /></Field>
              <Field label="Nível de estresse (1-5)"><Input type="number" min={1} max={5} value={form.stress_level ?? ""} onChange={(e) => set("stress_level", e.target.value)} /></Field>
            </div>
            <Field label="Álcool"><Input value={form.alcohol ?? ""} onChange={(e) => set("alcohol", e.target.value)} placeholder="Ex.: fim de semana" /></Field>
            <Field label="Fumo"><Input value={form.smoking ?? ""} onChange={(e) => set("smoking", e.target.value)} placeholder="Ex.: não fumo" /></Field>
            <Field label="Ciclo menstrual (opcional)"><Input value={form.cycle_notes ?? ""} onChange={(e) => set("cycle_notes", e.target.value)} placeholder="Regular / irregular / N/A" /></Field>
          </>
        )}
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={prev} disabled={step === 0}>Voltar</Button>
        {step < STEPS.length - 1 ? (
          <Button onClick={next} className="flex-1">Continuar</Button>
        ) : (
          <Button onClick={submit} disabled={loading} className="flex-1">
            {loading ? "Gerando seu plano..." : "Gerar meu plano com IA"}
          </Button>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="mb-1.5 block text-sm">{label}</Label>
      {children}
    </div>
  );
}
