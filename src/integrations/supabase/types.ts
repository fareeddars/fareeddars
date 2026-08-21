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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      expense_categories: {
        Row: {
          amount: number
          created_at: string
          created_by: string
          id: string
          month: string
          name: string
          season_id: string | null
        }
        Insert: {
          amount?: number
          created_at?: string
          created_by: string
          id?: string
          month: string
          name: string
          season_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string
          id?: string
          month?: string
          name?: string
          season_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expense_categories_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      farmer_seasons: {
        Row: {
          created_at: string
          created_by: string
          farmer_id: string
          id: string
          opening_balance: number
          season_id: string
          status: Database["public"]["Enums"]["farmer_season_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          farmer_id: string
          id?: string
          opening_balance?: number
          season_id: string
          status?: Database["public"]["Enums"]["farmer_season_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          farmer_id?: string
          id?: string
          opening_balance?: number
          season_id?: string
          status?: Database["public"]["Enums"]["farmer_season_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "farmer_seasons_farmer_id_fkey"
            columns: ["farmer_id"]
            isOneToOne: false
            referencedRelation: "farmers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "farmer_seasons_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      farmers: {
        Row: {
          address: string | null
          cnic: string | null
          created_at: string
          created_by: string
          farm_details: string | null
          id: string
          initial_balance: number
          landlord: string | null
          name: string
          notes: string | null
          phone: string | null
          photo_url: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          cnic?: string | null
          created_at?: string
          created_by: string
          farm_details?: string | null
          id?: string
          initial_balance?: number
          landlord?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          photo_url?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          cnic?: string | null
          created_at?: string
          created_by?: string
          farm_details?: string | null
          id?: string
          initial_balance?: number
          landlord?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          photo_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      inventory: {
        Row: {
          created_at: string
          created_by: string
          current_stock: number
          id: string
          item_name: string
          low_stock_threshold: number
          price_per_unit: number
          unit: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          current_stock?: number
          id?: string
          item_name: string
          low_stock_threshold?: number
          price_per_unit?: number
          unit?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          current_stock?: number
          id?: string
          item_name?: string
          low_stock_threshold?: number
          price_per_unit?: number
          unit?: string
          updated_at?: string
        }
        Relationships: []
      }
      ledger_entries: {
        Row: {
          amount: number
          area_unit: string | null
          buyer: string | null
          category: string | null
          commission_cost: number
          created_at: string
          created_by: string
          crop_type: string | null
          crop_weight: number | null
          deductions: number | null
          description: string
          entry_date: string | null
          entry_type: string
          farmer_id: string
          farmer_season_id: string | null
          field_name: string | null
          gross_weight: number | null
          id: string
          inventory_item_id: string | null
          is_shared: boolean
          labour_cost: number
          net_weight: number | null
          notes: string | null
          other_costs: number
          paid_amount: number
          payment_method: string | null
          payment_status: string | null
          quantity: number | null
          rate: number | null
          rate_unit: string | null
          season_id: string | null
          shared_amount: number | null
          total_area: number | null
          total_yield: number | null
          transport_cost: number
          updated_at: string
          weight_unit: string | null
          yield_unit: string | null
        }
        Insert: {
          amount?: number
          area_unit?: string | null
          buyer?: string | null
          category?: string | null
          commission_cost?: number
          created_at?: string
          created_by: string
          crop_type?: string | null
          crop_weight?: number | null
          deductions?: number | null
          description?: string
          entry_date?: string | null
          entry_type: string
          farmer_id: string
          farmer_season_id?: string | null
          field_name?: string | null
          gross_weight?: number | null
          id?: string
          inventory_item_id?: string | null
          is_shared?: boolean
          labour_cost?: number
          net_weight?: number | null
          notes?: string | null
          other_costs?: number
          paid_amount?: number
          payment_method?: string | null
          payment_status?: string | null
          quantity?: number | null
          rate?: number | null
          rate_unit?: string | null
          season_id?: string | null
          shared_amount?: number | null
          total_area?: number | null
          total_yield?: number | null
          transport_cost?: number
          updated_at?: string
          weight_unit?: string | null
          yield_unit?: string | null
        }
        Update: {
          amount?: number
          area_unit?: string | null
          buyer?: string | null
          category?: string | null
          commission_cost?: number
          created_at?: string
          created_by?: string
          crop_type?: string | null
          crop_weight?: number | null
          deductions?: number | null
          description?: string
          entry_date?: string | null
          entry_type?: string
          farmer_id?: string
          farmer_season_id?: string | null
          field_name?: string | null
          gross_weight?: number | null
          id?: string
          inventory_item_id?: string | null
          is_shared?: boolean
          labour_cost?: number
          net_weight?: number | null
          notes?: string | null
          other_costs?: number
          paid_amount?: number
          payment_method?: string | null
          payment_status?: string | null
          quantity?: number | null
          rate?: number | null
          rate_unit?: string | null
          season_id?: string | null
          shared_amount?: number | null
          total_area?: number | null
          total_yield?: number | null
          transport_cost?: number
          updated_at?: string
          weight_unit?: string | null
          yield_unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ledger_entries_farmer_id_fkey"
            columns: ["farmer_id"]
            isOneToOne: false
            referencedRelation: "farmers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_farmer_season_id_fkey"
            columns: ["farmer_season_id"]
            isOneToOne: false
            referencedRelation: "farmer_seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      seasons: {
        Row: {
          created_at: string
          created_by: string
          end_date: string | null
          id: string
          name: string
          start_date: string
          status: Database["public"]["Enums"]["season_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          end_date?: string | null
          id?: string
          name: string
          start_date: string
          status?: Database["public"]["Enums"]["season_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          end_date?: string | null
          id?: string
          name?: string
          start_date?: string
          status?: Database["public"]["Enums"]["season_status"]
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          can_create: boolean
          can_delete: boolean
          can_edit: boolean
          created_at: string
          id: string
          is_active: boolean
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          can_create?: boolean
          can_delete?: boolean
          can_edit?: boolean
          created_at?: string
          id?: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          can_create?: boolean
          can_delete?: boolean
          can_edit?: boolean
          created_at?: string
          id?: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_user_create: { Args: { _user_id: string }; Returns: boolean }
      can_user_delete: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_manager_or_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "manager" | "staff"
      farmer_season_status: "active" | "left" | "completed"
      season_status: "active" | "closed"
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
    Enums: {
      app_role: ["admin", "manager", "staff"],
      farmer_season_status: ["active", "left", "completed"],
      season_status: ["active", "closed"],
    },
  },
} as const
