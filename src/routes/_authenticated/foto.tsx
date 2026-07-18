import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { analyzeFoodPhoto } from "@/lib/food-photo.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useRef, useState } from "react";
import { Camera } from "lucide-react";

export const Route = createFileRoute("/_authenticated/foto")({
  head: () => ({ meta: [{ title: "Registrar por foto — Akami" }] }),
  component: FoodPhotoPage,
});

function FoodPhotoPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [estimate, setEstimate] = useState<{ description: string; calories: number; protein_g: number; carbs_g: number; fat_g: number; confidence_note: string } | null>(null);
  const [photoPath, setPhotoPath] = useState<string | null>(null);

  const analyze = useMutation({
    mutationFn: async (file: File) => {
      const base64 = await fileToBase64(file);
      const path = `${user!.id}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("food-photos").upload(path, file, { contentType: file.type });
      if (upErr) throw upErr;
      setPhotoPath(path);
      const result = await analyzeFoodPhoto({ data: { image_base64: base64, media_type: file.type } });
      return result;
    },
    onSuccess: (result) => setEstimate(result),
    onError: (e: any) => toast.error(e?.message || "Não foi possível analisar a foto."),
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!estimate || !photoPath) return;
      const { data: nlog, error: nErr } = await supabase
        .from("nutrition_log")
        .insert({
          user_id: user!.id,
          description: estimate.description,
          calories: estimate.calories,
          protein_g: estimate.protein_g,
          carbs_g: estimate.carbs_g,
          fat_g: estimate.fat_g,
          followed_plan: false,
        })
        .select("id")
        .single();
      if (nErr) throw nErr;
      await supabase.from("food_photo_logs").insert({
        user_id: user!.id,
        photo_path: photoPath,
        estimated_description: estimate.description,
        estimated_calories: estimate.calories,
        estimated_protein_g: estimate.protein_g,
        estimated_carbs_g: estimate.carbs_g,
        estimated_fat_g: estimate.fat_g,
        confirmed: true,
        nutrition_log_id: nlog.id,
      });
    },
    onSuccess: () => {
      toast.success("Refeição registrada!");
      setPreview(null);
      setEstimate(null);
      setPhotoPath(null);
      qc.invalidateQueries({ queryKey: ["nutrition-plan"] });
    },
  });

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    setEstimate(null);
    analyze.mutate(file);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Camera className="h-5 w-5 text-primary" />
        <h1 className="text-2xl font-bold">Registrar por foto</h1>
      </div>
      <Button asChild variant="ghost" size="sm" className="-mt-4"><Link to="/alimentacao">← Voltar à alimentação</Link></Button>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-card space-y-4">
        <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onPick} />
        <Button className="w-full" variant="outline" onClick={() => fileRef.current?.click()}>
          <Camera className="mr-2 h-4 w-4" /> Tirar ou escolher foto do prato
        </Button>

        {preview && <img src={preview} alt="Prato" className="w-full rounded-xl object-cover max-h-64" />}

        {analyze.isPending && <p className="text-sm text-muted-foreground">Analisando a foto…</p>}

        {estimate && (
          <div className="space-y-3 border-t border-border pt-4">
            <p className="text-xs text-muted-foreground">{estimate.confidence_note}</p>
            <div>
              <Label>Descrição</Label>
              <Input value={estimate.description} onChange={(e) => setEstimate({ ...estimate, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-4 gap-2">
              <div><Label>Kcal</Label><Input type="number" value={estimate.calories} onChange={(e) => setEstimate({ ...estimate, calories: Number(e.target.value) })} /></div>
              <div><Label>Prot.</Label><Input type="number" value={estimate.protein_g} onChange={(e) => setEstimate({ ...estimate, protein_g: Number(e.target.value) })} /></div>
              <div><Label>Carb.</Label><Input type="number" value={estimate.carbs_g} onChange={(e) => setEstimate({ ...estimate, carbs_g: Number(e.target.value) })} /></div>
              <div><Label>Gord.</Label><Input type="number" value={estimate.fat_g} onChange={(e) => setEstimate({ ...estimate, fat_g: Number(e.target.value) })} /></div>
            </div>
            <Button className="w-full" onClick={() => save.mutate()} disabled={save.isPending}>Confirmar e salvar</Button>
          </div>
        )}
      </div>
    </div>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
