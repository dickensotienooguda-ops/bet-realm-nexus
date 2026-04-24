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
      bet_selections: {
        Row: {
          bet_id: string
          created_at: string
          id: string
          market_id: string
          match_id: string
          odds: number
          outcome_key: string
          outcome_label: string | null
          status: Database["public"]["Enums"]["selection_result"]
        }
        Insert: {
          bet_id: string
          created_at?: string
          id?: string
          market_id: string
          match_id: string
          odds: number
          outcome_key: string
          outcome_label?: string | null
          status?: Database["public"]["Enums"]["selection_result"]
        }
        Update: {
          bet_id?: string
          created_at?: string
          id?: string
          market_id?: string
          match_id?: string
          odds?: number
          outcome_key?: string
          outcome_label?: string | null
          status?: Database["public"]["Enums"]["selection_result"]
        }
        Relationships: [
          {
            foreignKeyName: "bet_selections_bet_id_fkey"
            columns: ["bet_id"]
            isOneToOne: false
            referencedRelation: "bets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bet_selections_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bet_selections_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      bets: {
        Row: {
          bet_type: Database["public"]["Enums"]["bet_type"]
          created_at: string
          id: string
          potential_payout: number
          settled_at: string | null
          stake: number
          status: Database["public"]["Enums"]["bet_status"]
          total_odds: number
          user_id: string
        }
        Insert: {
          bet_type?: Database["public"]["Enums"]["bet_type"]
          created_at?: string
          id?: string
          potential_payout: number
          settled_at?: string | null
          stake: number
          status?: Database["public"]["Enums"]["bet_status"]
          total_odds: number
          user_id: string
        }
        Update: {
          bet_type?: Database["public"]["Enums"]["bet_type"]
          created_at?: string
          id?: string
          potential_payout?: number
          settled_at?: string | null
          stake?: number
          status?: Database["public"]["Enums"]["bet_status"]
          total_odds?: number
          user_id?: string
        }
        Relationships: []
      }
      countries: {
        Row: {
          code: string
          created_at: string
          currency_code: string
          currency_symbol: string
          id: string
          is_active: boolean
          name: string
          phone_prefix: string
        }
        Insert: {
          code: string
          created_at?: string
          currency_code: string
          currency_symbol?: string
          id?: string
          is_active?: boolean
          name: string
          phone_prefix?: string
        }
        Update: {
          code?: string
          created_at?: string
          currency_code?: string
          currency_symbol?: string
          id?: string
          is_active?: boolean
          name?: string
          phone_prefix?: string
        }
        Relationships: []
      }
      markets: {
        Row: {
          created_at: string
          id: string
          label: string
          market_type: string
          match_id: string
          outcomes: Json
          status: Database["public"]["Enums"]["market_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          market_type: string
          match_id: string
          outcomes?: Json
          status?: Database["public"]["Enums"]["market_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          market_type?: string
          match_id?: string
          outcomes?: Json
          status?: Database["public"]["Enums"]["market_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "markets_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          away_logo: string | null
          away_score: number | null
          away_team: string
          created_at: string
          external_id: number | null
          home_logo: string | null
          home_score: number | null
          home_team: string
          id: string
          kick_off: string
          league: string | null
          league_logo: string | null
          raw_data: Json | null
          sport: string
          status: Database["public"]["Enums"]["match_status"]
          updated_at: string
        }
        Insert: {
          away_logo?: string | null
          away_score?: number | null
          away_team: string
          created_at?: string
          external_id?: number | null
          home_logo?: string | null
          home_score?: number | null
          home_team: string
          id?: string
          kick_off: string
          league?: string | null
          league_logo?: string | null
          raw_data?: Json | null
          sport?: string
          status?: Database["public"]["Enums"]["match_status"]
          updated_at?: string
        }
        Update: {
          away_logo?: string | null
          away_score?: number | null
          away_team?: string
          created_at?: string
          external_id?: number | null
          home_logo?: string | null
          home_score?: number | null
          home_team?: string
          id?: string
          kick_off?: string
          league?: string | null
          league_logo?: string | null
          raw_data?: Json | null
          sport?: string
          status?: Database["public"]["Enums"]["match_status"]
          updated_at?: string
        }
        Relationships: []
      }
      payment_methods: {
        Row: {
          config: Json
          country_id: string
          created_at: string
          id: string
          is_active: boolean
          method_type: string
          name: string
        }
        Insert: {
          config?: Json
          country_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          method_type: string
          name: string
        }
        Update: {
          config?: Json
          country_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          method_type?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_methods_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          country_id: string | null
          created_at: string
          display_name: string | null
          id: string
          is_suspended: boolean
          is_verified: boolean
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          country_id?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          is_suspended?: boolean
          is_verified?: boolean
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          country_id?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          is_suspended?: boolean
          is_verified?: boolean
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          checkout_id: string | null
          created_at: string
          description: string | null
          id: string
          metadata: Json | null
          reference: string | null
          status: Database["public"]["Enums"]["tx_status"]
          type: Database["public"]["Enums"]["tx_type"]
          updated_at: string
          wallet_id: string
        }
        Insert: {
          amount: number
          checkout_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          reference?: string | null
          status?: Database["public"]["Enums"]["tx_status"]
          type: Database["public"]["Enums"]["tx_type"]
          updated_at?: string
          wallet_id: string
        }
        Update: {
          amount?: number
          checkout_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          reference?: string | null
          status?: Database["public"]["Enums"]["tx_status"]
          type?: Database["public"]["Enums"]["tx_type"]
          updated_at?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_vip: {
        Row: {
          created_at: string
          id: string
          promoted_at: string
          tier_id: string
          total_deposited: number
          total_wagered: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          promoted_at?: string
          tier_id: string
          total_deposited?: number
          total_wagered?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          promoted_at?: string
          tier_id?: string
          total_deposited?: number
          total_wagered?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_vip_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "vip_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      vip_tiers: {
        Row: {
          benefits: Json
          created_at: string
          id: string
          level: number
          min_deposits: number
          min_wagered: number
          name: string
        }
        Insert: {
          benefits?: Json
          created_at?: string
          id?: string
          level: number
          min_deposits?: number
          min_wagered?: number
          name: string
        }
        Update: {
          benefits?: Json
          created_at?: string
          id?: string
          level?: number
          min_deposits?: number
          min_wagered?: number
          name?: string
        }
        Relationships: []
      }
      wallets: {
        Row: {
          balance: number
          bonus_balance: number
          created_at: string
          currency_code: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          bonus_balance?: number
          created_at?: string
          currency_code: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          bonus_balance?: number
          created_at?: string
          currency_code?: string
          id?: string
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      bet_status: "open" | "won" | "lost" | "void" | "cashout"
      bet_type: "single" | "multi"
      market_status: "open" | "suspended" | "settled" | "void"
      match_status: "upcoming" | "live" | "finished" | "postponed" | "cancelled"
      selection_result: "pending" | "won" | "lost" | "void" | "push"
      tx_status: "pending" | "successful" | "failed" | "reversed"
      tx_type:
        | "deposit"
        | "withdrawal"
        | "bet"
        | "payout"
        | "bonus"
        | "reversal"
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
      app_role: ["admin", "moderator", "user"],
      bet_status: ["open", "won", "lost", "void", "cashout"],
      bet_type: ["single", "multi"],
      market_status: ["open", "suspended", "settled", "void"],
      match_status: ["upcoming", "live", "finished", "postponed", "cancelled"],
      selection_result: ["pending", "won", "lost", "void", "push"],
      tx_status: ["pending", "successful", "failed", "reversed"],
      tx_type: ["deposit", "withdrawal", "bet", "payout", "bonus", "reversal"],
    },
  },
} as const
