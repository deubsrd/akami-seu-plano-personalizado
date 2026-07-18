import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useEffect, useRef } from "react";
import { Share2, Download } from "lucide-react";

export const Route = createFileRoute("/_authenticated/compartilhar")({
  head: () => ({ meta: [{ title: "Compartilhar — Akami" }] }),
  component: SharePage,
});

function SharePage() {
  const { user } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const { data: measurements = [] } = useQuery({
    queryKey: ["share-measurements", user?.id],
    enabled: !!user,
    queryFn: async () =>
      (await supabase.from("measurements_log").select("weight_kg, measured_on").eq("user_id", user!.id).order("measured_on", { ascending: true })).data ?? [],
  });

  const { data: workoutCount = 0 } = useQuery({
    queryKey: ["share-workout-count", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { count } = await supabase.from("workout_sessions").select("id", { count: "exact", head: true }).eq("user_id", user!.id);
      return count ?? 0;
    },
  });

  const first = measurements.find((m: any) => m.weight_kg != null);
  const last = [...measurements].reverse().find((m: any) => m.weight_kg != null);
  const weightChange = first && last ? Number(last.weight_kg) - Number(first.weight_kg) : null;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = 1080;
    canvas.height = 1350;

    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, "#0A2120");
    grad.addColorStop(1, "#123433");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#D9A08C";
    ctx.font = "600 40px sans-serif";
    ctx.fillText("AKAMI", 60, 120);

    ctx.fillStyle = "#F3EEE6";
    ctx.font = "700 72px sans-serif";
    ctx.fillText("Minha evolução", 60, 240);

    ctx.font = "500 34px sans-serif";
    ctx.fillStyle = "#F3EEE6";
    let y = 380;
    if (weightChange != null) {
      ctx.fillText(`${weightChange <= 0 ? "" : "+"}${weightChange.toFixed(1)} kg desde o início`, 60, y);
      y += 70;
    }
    ctx.fillText(`${workoutCount} treinos concluídos`, 60, y);
    y += 70;

    ctx.strokeStyle = "#1F5654";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(canvas.width / 2, 900, 160, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#F3EEE6";
    ctx.font = "700 46px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`${workoutCount}`, canvas.width / 2, 890);
    ctx.font = "400 26px sans-serif";
    ctx.fillText("treinos", canvas.width / 2, 935);
    ctx.textAlign = "left";
  }, [weightChange, workoutCount]);

  function download() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = "akami-evolucao.png";
    a.click();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Share2 className="h-5 w-5 text-primary" />
        <h1 className="text-2xl font-bold">Compartilhar</h1>
      </div>
      <Button asChild variant="ghost" size="sm" className="-mt-3"><Link to="/perfil">← Voltar ao perfil</Link></Button>

      <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
        <canvas ref={canvasRef} className="w-full rounded-xl" style={{ aspectRatio: "4/5" }} />
      </div>

      <Button className="w-full" onClick={download}><Download className="mr-2 h-4 w-4" /> Baixar card para compartilhar</Button>
    </div>
  );
}
