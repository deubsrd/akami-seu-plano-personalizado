import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export function useSubscription() {
  const { user } = useAuth();
  const q = useQuery({
    queryKey: ["subscription", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  const now = Date.now();
  const sub = q.data;
  const trialActive = sub?.status === "trialing" && sub.trial_ends_at && new Date(sub.trial_ends_at).getTime() > now;
  const periodActive = (sub?.status === "active" || sub?.status === "past_due") &&
    (!sub.current_period_end || new Date(sub.current_period_end).getTime() > now);
  const canceledGrace = sub?.status === "canceled" && sub.current_period_end && new Date(sub.current_period_end).getTime() > now;
  const isActive = Boolean(trialActive || periodActive || canceledGrace);

  return { ...q, subscription: sub, isActive };
}
