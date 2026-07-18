export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      achievements: {
        Row: {
          earned_at: string
          id: string
          key: string
          title: string
          user_id: string
        }
        Insert: {
          earned_at?: string
          id?: string
          key: string
          title: string
          user_id: string
        }
        Update: {
          earned_at?: string
          id?: string
          key?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      budget_settings: {
        Row: {
          amount_brl: number
          period: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_brl?: number
          period?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_brl?: number
          period?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      generated_plans: {
        Row: {
          created_at: string
          id: string
          intake_form_id: string | null
          is_active: boolean
          metrics: Json
          nutrition_plan: Json
          training_plan: Json
          user_id: string
          version: number
          warnings: string[] | null
        }
        Insert: {
          created_at?: string
          id?: string
          intake_form_id?: string | null
          is_active?: boolean
          metrics: Json
          nutrition_plan: Json
          training_plan: Json
          user_id: string
          version?: number
          warnings?: string[] | null
        }
        Update: {
          created_at?: string
          id?: string
          intake_form_id?: string | null
          is_active?: boolean
          metrics?: Json
          nutrition_plan?: Json
          training_plan?: Json
          user_id?: string
          version?: number
          warnings?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "generated_plans_intake_form_id_fkey"
            columns: ["intake_form_id"]
            isOneToOne: false
            referencedRelation: "intake_forms"
            referencedColumns: ["id"]
          },
        ]
      }
      intake_forms: {
        Row: {
          created_at: string
          data: Json
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data: Json
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      measurements_log: {
        Row: {
          arm_cm: number | null
          body_fat_pct: number | null
          chest_cm: number | null
          created_at: string
          hip_cm: number | null
          id: string
          measured_on: string
          notes: string | null
          thigh_cm: number | null
          user_id: string
          waist_cm: number | null
          weight_kg: number | null
        }
        Insert: {
          arm_cm?: number | null
          body_fat_pct?: number | null
          chest_cm?: number | null
          created_at?: string
          hip_cm?: number | null
          id?: string
          measured_on?: string
          notes?: string | null
          thigh_cm?: number | null
          user_id: string
          waist_cm?: number | null
          weight_kg?: number | null
        }
        Update: {
          arm_cm?: number | null
          body_fat_pct?: number | null
          chest_cm?: number | null
          created_at?: string
          hip_cm?: number | null
          id?: string
          measured_on?: string
          notes?: string | null
          thigh_cm?: number | null
          user_id?: string
          waist_cm?: number | null
          weight_kg?: number | null
        }
        Relationships: []
      }
      nutrition_log: {
        Row: {
          calories: number | null
          carbs_g: number | null
          created_at: string
          description: string | null
          fat_g: number | null
          followed_plan: boolean
          id: string
          logged_on: string
          meal_key: string | null
          protein_g: number | null
          user_id: string
        }
        Insert: {
          calories?: number | null
          carbs_g?: number | null
          created_at?: string
          description?: string | null
          fat_g?: number | null
          followed_plan?: boolean
          id?: string
          logged_on?: string
          meal_key?: string | null
          protein_g?: number | null
          user_id: string
        }
        Update: {
          calories?: number | null
          carbs_g?: number | null
          created_at?: string
          description?: string | null
          fat_g?: number | null
          followed_plan?: boolean
          id?: string
          logged_on?: string
          meal_key?: string | null
          protein_g?: number | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          accepted_terms_at: string | null
          birth_date: string | null
          city: string | null
          created_at: string
          dark_mode: boolean
          full_name: string | null
          id: string
          postal_code: string | null
          updated_at: string
        }
        Insert: {
          accepted_terms_at?: string | null
          birth_date?: string | null
          city?: string | null
          created_at?: string
          dark_mode?: boolean
          full_name?: string | null
          id: string
          postal_code?: string | null
          updated_at?: string
        }
        Update: {
          accepted_terms_at?: string | null
          birth_date?: string | null
          city?: string | null
          created_at?: string
          dark_mode?: boolean
          full_name?: string | null
          id?: string
          postal_code?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      progress_photos: {
        Row: {
          created_at: string
          id: string
          photo_path: string
          taken_on: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          photo_path: string
          taken_on?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          photo_path?: string
          taken_on?: string
          user_id?: string
        }
        Relationships: []
      }
      shopping_list_items: {
        Row: {
          category: string
          created_at: string
          estimated_price_brl: number
          id: string
          is_purchased: boolean
          name: string
          plan_id: string | null
          quantity: number
          unit: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string
          estimated_price_brl?: number
          id?: string
          is_purchased?: boolean
          name: string
          plan_id?: string | null
          quantity?: number
          unit?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          estimated_price_brl?: number
          id?: string
          is_purchased?: boolean
          name?: string
          plan_id?: string | null
          quantity?: number
          unit?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shopping_list_items_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "generated_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string | null
          id: string
          provider: string | null
          provider_customer_id: string | null
          provider_subscription_id: string | null
          status: string
          trial_ends_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          id?: string
          provider?: string | null
          provider_customer_id?: string | null
          provider_subscription_id?: string | null
          status?: string
          trial_ends_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          id?: string
          provider?: string | null
          provider_customer_id?: string | null
          provider_subscription_id?: string | null
          status?: string
          trial_ends_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      water_log: {
        Row: {
          amount_ml: number
          created_at: string
          id: string
          logged_on: string
          user_id: string
        }
        Insert: {
          amount_ml: number
          created_at?: string
          id?: string
          logged_on?: string
          user_id: string
        }
        Update: {
          amount_ml?: number
          created_at?: string
          id?: string
          logged_on?: string
          user_id?: string
        }
        Relationships: []
      }
      wellness_log: {
        Row: {
          created_at: string
          cycle_status: string | null
          id: string
          logged_on: string
          notes: string | null
          sleep_hours: number | null
          stress_level: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          cycle_status?: string | null
          id?: string
          logged_on?: string
          notes?: string | null
          sleep_hours?: number | null
          stress_level?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          cycle_status?: string | null
          id?: string
          logged_on?: string
          notes?: string | null
          sleep_hours?: number | null
          stress_level?: number | null
          user_id?: string
        }
        Relationships: []
      }
      workout_sessions: {
        Row: {
          created_at: string
          duration_min: number | null
          exercises: Json
          id: string
          overall_rpe: number | null
          pain_notes: string | null
          performed_on: string
          plan_id: string | null
          user_id: string
          workout_key: string | null
        }
        Insert: {
          created_at?: string
          duration_min?: number | null
          exercises: Json
          id?: string
          overall_rpe?: number | null
          pain_notes?: string | null
          performed_on?: string
          plan_id?: string | null
          user_id: string
          workout_key?: string | null
        }
        Update: {
          created_at?: string
          duration_min?: number | null
          exercises?: Json
          id?: string
          overall_rpe?: number | null
          pain_notes?: string | null
          performed_on?: string
          plan_id?: string | null
          user_id?: string
          workout_key?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workout_sessions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "generated_plans"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
