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
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      auction_entrance_fees: {
        Row: {
          access_expires_at: string
          access_token: string
          auction_id: string
          bidder_id: string
          checkout_url: string | null
          created_at: string
          currency: string
          fee_amount: number
          id: string
          paid_at: string | null
          payment_status: string
          provider: string | null
          provider_payment_id: string | null
          provider_session_id: string | null
          redeemed_at: string | null
          updated_at: string
        }
        Insert: {
          access_expires_at: string
          access_token?: string
          auction_id: string
          bidder_id: string
          checkout_url?: string | null
          created_at?: string
          currency?: string
          fee_amount: number
          id?: string
          paid_at?: string | null
          payment_status?: string
          provider?: string | null
          provider_payment_id?: string | null
          provider_session_id?: string | null
          redeemed_at?: string | null
          updated_at?: string
        }
        Update: {
          access_expires_at?: string
          access_token?: string
          auction_id?: string
          bidder_id?: string
          checkout_url?: string | null
          created_at?: string
          currency?: string
          fee_amount?: number
          id?: string
          paid_at?: string | null
          payment_status?: string
          provider?: string | null
          provider_payment_id?: string | null
          provider_session_id?: string | null
          redeemed_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "auction_entrance_fees_auction_id_fkey"
            columns: ["auction_id"]
            isOneToOne: false
            referencedRelation: "auction_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auction_entrance_fees_auction_id_fkey"
            columns: ["auction_id"]
            isOneToOne: false
            referencedRelation: "auction_events_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auction_entrance_fees_bidder_id_fkey"
            columns: ["bidder_id"]
            isOneToOne: false
            referencedRelation: "bidders"
            referencedColumns: ["id"]
          },
        ]
      }
      auction_events: {
        Row: {
          created_at: string
          description: string | null
          end_date: string
          entrance_fee: number | null
          id: string
          revenue: number | null
          start_date: string
          status: string
          theme_title: string | null
          title: string
          total_bids: number | null
          updated_at: string
          viewer_count: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          end_date: string
          entrance_fee?: number | null
          id?: string
          revenue?: number | null
          start_date: string
          status?: string
          theme_title?: string | null
          title: string
          total_bids?: number | null
          updated_at?: string
          viewer_count?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          end_date?: string
          entrance_fee?: number | null
          id?: string
          revenue?: number | null
          start_date?: string
          status?: string
          theme_title?: string | null
          title?: string
          total_bids?: number | null
          updated_at?: string
          viewer_count?: number | null
        }
        Relationships: []
      }
      auction_streams: {
        Row: {
          auction_id: string
          created_at: string
          embed_code: string | null
          entrance_fee: number
          id: string
          is_active: boolean
          platform: string
          stream_url: string
          updated_at: string
          viewer_count: number
        }
        Insert: {
          auction_id: string
          created_at?: string
          embed_code?: string | null
          entrance_fee?: number
          id?: string
          is_active?: boolean
          platform: string
          stream_url: string
          updated_at?: string
          viewer_count?: number
        }
        Update: {
          auction_id?: string
          created_at?: string
          embed_code?: string | null
          entrance_fee?: number
          id?: string
          is_active?: boolean
          platform?: string
          stream_url?: string
          updated_at?: string
          viewer_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "auction_streams_auction_id_fkey"
            columns: ["auction_id"]
            isOneToOne: false
            referencedRelation: "auction_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auction_streams_auction_id_fkey"
            columns: ["auction_id"]
            isOneToOne: false
            referencedRelation: "auction_events_public"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          ip_address: string | null
          resource: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          resource?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          resource?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      bidders: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          id: string
          loyalty_points: number
          phone_number: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          loyalty_points?: number
          phone_number?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          loyalty_points?: number
          phone_number?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          payment_method: string
          reference_number: string | null
          sale_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          payment_method: string
          reference_number?: string | null
          sale_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          payment_method?: string
          reference_number?: string | null
          sale_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      product_tag_relations: {
        Row: {
          product_id: string
          tag_id: string
        }
        Insert: {
          product_id: string
          tag_id: string
        }
        Update: {
          product_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_tag_relations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_tag_relations_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "product_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      product_tags: {
        Row: {
          id: string
          name: string
        }
        Insert: {
          id?: string
          name: string
        }
        Update: {
          id?: string
          name?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          name: string
          price: number
          stock_quantity: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          price: number
          stock_quantity?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          price?: number
          stock_quantity?: number
          updated_at?: string
        }
        Relationships: []
      }
      sale_items: {
        Row: {
          id: string
          price: number
          product_id: string | null
          quantity: number
          sale_id: string | null
          subtotal: number
        }
        Insert: {
          id?: string
          price: number
          product_id?: string | null
          quantity: number
          sale_id?: string | null
          subtotal: number
        }
        Update: {
          id?: string
          price?: number
          product_id?: string | null
          quantity?: number
          sale_id?: string | null
          subtotal?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          bidder_id: string | null
          created_at: string
          id: string
          remarks: string | null
          staff_id: string | null
          status: string
          subtotal: number
          tax: number
          total: number
        }
        Insert: {
          bidder_id?: string | null
          created_at?: string
          id?: string
          remarks?: string | null
          staff_id?: string | null
          status?: string
          subtotal: number
          tax: number
          total: number
        }
        Update: {
          bidder_id?: string | null
          created_at?: string
          id?: string
          remarks?: string | null
          staff_id?: string | null
          status?: string
          subtotal?: number
          tax?: number
          total?: number
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          display_name_changed_at: string | null
          notifications: Json
          privacy_settings: Json
          theme: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          display_name_changed_at?: string | null
          notifications?: Json
          privacy_settings?: Json
          theme?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          display_name_changed_at?: string | null
          notifications?: Json
          privacy_settings?: Json
          theme?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          last_login: string | null
          phone_number: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id: string
          last_login?: string | null
          phone_number?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          last_login?: string | null
          phone_number?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      auction_events_public: {
        Row: {
          created_at: string | null
          description: string | null
          end_date: string | null
          id: string | null
          start_date: string | null
          status: string | null
          theme_title: string | null
          title: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: string | null
          start_date?: string | null
          status?: string | null
          theme_title?: string | null
          title?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: string | null
          start_date?: string | null
          status?: string | null
          theme_title?: string | null
          title?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      can_change_display_name: {
        Args: { user_id: string }
        Returns: boolean
      }
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: Database["public"]["Enums"]["user_role"]
      }
      has_any_role: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      has_role: {
        Args: { required_role: Database["public"]["Enums"]["user_role"] }
        Returns: boolean
      }
      log_activity: {
        Args: {
          action: string
          details?: Json
          ip_address?: string
          resource: string
        }
        Returns: string
      }
      update_display_name: {
        Args: { new_display_name: string }
        Returns: Json
      }
    }
    Enums: {
      user_role:
        | "super-admin"
        | "admin"
        | "staff"
        | "auction-manager"
        | "bidder"
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
      user_role: ["super-admin", "admin", "staff", "auction-manager", "bidder"],
    },
  },
} as const
