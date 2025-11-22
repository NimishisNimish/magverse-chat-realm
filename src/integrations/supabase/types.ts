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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      admin_notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          metadata: Json | null
          notification_type: string
          title: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          metadata?: Json | null
          notification_type: string
          title: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          metadata?: Json | null
          notification_type?: string
          title?: string
          user_id?: string | null
        }
        Relationships: []
      }
      ai_custom_instructions: {
        Row: {
          created_at: string | null
          id: string
          instructions: string
          is_active: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          instructions: string
          is_active?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          instructions?: string
          is_active?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      ai_response_feedback: {
        Row: {
          chat_id: string | null
          comment: string | null
          created_at: string | null
          id: string
          message_id: string | null
          model: string | null
          rating: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          chat_id?: string | null
          comment?: string | null
          created_at?: string | null
          id?: string
          message_id?: string | null
          model?: string | null
          rating?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          chat_id?: string | null
          comment?: string | null
          created_at?: string | null
          id?: string
          message_id?: string | null
          model?: string | null
          rating?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_response_feedback_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chat_history"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_response_feedback_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_comparisons: {
        Row: {
          chat_ids: Json
          created_at: string
          id: string
          name: string
          notes: string | null
          user_id: string
        }
        Insert: {
          chat_ids?: Json
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          user_id: string
        }
        Update: {
          chat_ids?: Json
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          user_id?: string
        }
        Relationships: []
      }
      chat_history: {
        Row: {
          created_at: string | null
          id: string
          title: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          title?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          title?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          attachment_url: string | null
          chat_id: string
          content: string
          created_at: string | null
          credits_consumed: number | null
          id: string
          model: string | null
          role: string
          user_id: string
        }
        Insert: {
          attachment_url?: string | null
          chat_id: string
          content: string
          created_at?: string | null
          credits_consumed?: number | null
          id?: string
          model?: string | null
          role: string
          user_id: string
        }
        Update: {
          attachment_url?: string | null
          chat_id?: string
          content?: string
          created_at?: string | null
          credits_consumed?: number | null
          id?: string
          model?: string | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chat_history"
            referencedColumns: ["id"]
          },
        ]
      }
      comparison_ratings: {
        Row: {
          category: string
          chat_id: string
          comparison_id: string
          created_at: string
          id: string
          notes: string | null
          rating: number | null
        }
        Insert: {
          category: string
          chat_id: string
          comparison_id: string
          created_at?: string
          id?: string
          notes?: string | null
          rating?: number | null
        }
        Update: {
          category?: string
          chat_id?: string
          comparison_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          rating?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "comparison_ratings_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chat_history"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comparison_ratings_comparison_id_fkey"
            columns: ["comparison_id"]
            isOneToOne: false
            referencedRelation: "chat_comparisons"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_messages: {
        Row: {
          branch_name: string | null
          content: string
          conversation_id: string | null
          created_at: string | null
          id: string
          metadata: Json | null
          model: string | null
          parent_message_id: string | null
          role: string
          user_id: string | null
        }
        Insert: {
          branch_name?: string | null
          content: string
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          model?: string | null
          parent_message_id?: string | null
          role: string
          user_id?: string | null
        }
        Update: {
          branch_name?: string | null
          content?: string
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          model?: string | null
          parent_message_id?: string | null
          role?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversation_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_messages_parent_message_id_fkey"
            columns: ["parent_message_id"]
            isOneToOne: false
            referencedRelation: "conversation_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_participants: {
        Row: {
          conversation_id: string
          joined_at: string | null
          last_seen_at: string | null
          user_id: string
        }
        Insert: {
          conversation_id: string
          joined_at?: string | null
          last_seen_at?: string | null
          user_id: string
        }
        Update: {
          conversation_id?: string
          joined_at?: string | null
          last_seen_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          is_public: boolean | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_public?: boolean | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_public?: boolean | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      credit_usage_logs: {
        Row: {
          chat_id: string | null
          created_at: string
          credits_used: number
          id: string
          message_id: string | null
          model: string
          request_type: string
          response_time_ms: number | null
          tokens_used: number | null
          user_id: string
        }
        Insert: {
          chat_id?: string | null
          created_at?: string
          credits_used?: number
          id?: string
          message_id?: string | null
          model: string
          request_type?: string
          response_time_ms?: number | null
          tokens_used?: number | null
          user_id: string
        }
        Update: {
          chat_id?: string | null
          created_at?: string
          credits_used?: number
          id?: string
          message_id?: string | null
          model?: string
          request_type?: string
          response_time_ms?: number | null
          tokens_used?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_usage_logs_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chat_history"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_usage_logs_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      email_campaigns: {
        Row: {
          campaign_type: string
          click_tracking_id: string | null
          clicked_at: string | null
          conversion_value: number | null
          converted: boolean | null
          email_type: string
          id: string
          ip_address: string | null
          metadata: Json | null
          opened_at: string | null
          sent_at: string | null
          status: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          campaign_type: string
          click_tracking_id?: string | null
          clicked_at?: string | null
          conversion_value?: number | null
          converted?: boolean | null
          email_type: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          opened_at?: string | null
          sent_at?: string | null
          status?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          campaign_type?: string
          click_tracking_id?: string | null
          clicked_at?: string | null
          conversion_value?: number | null
          converted?: boolean | null
          email_type?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          opened_at?: string | null
          sent_at?: string | null
          status?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      email_change_requests: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          new_email: string
          user_id: string
          verification_code: string
          verified: boolean | null
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: string
          new_email: string
          user_id: string
          verification_code: string
          verified?: boolean | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          new_email?: string
          user_id?: string
          verification_code?: string
          verified?: boolean | null
        }
        Relationships: []
      }
      email_clicks: {
        Row: {
          campaign_id: string
          clicked_at: string | null
          id: string
          ip_address: string | null
          link_url: string | null
          user_agent: string | null
        }
        Insert: {
          campaign_id: string
          clicked_at?: string | null
          id?: string
          ip_address?: string | null
          link_url?: string | null
          user_agent?: string | null
        }
        Update: {
          campaign_id?: string
          clicked_at?: string | null
          id?: string
          ip_address?: string | null
          link_url?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_clicks_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "email_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount: number
          created_at: string
          id: string
          invoice_number: string
          issue_date: string
          plan_type: string
          status: string
          transaction_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          invoice_number: string
          issue_date?: string
          plan_type: string
          status?: string
          transaction_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          invoice_number?: string
          issue_date?: string
          plan_type?: string
          status?: string
          transaction_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      message_annotations: {
        Row: {
          annotation_type: string
          content: string | null
          created_at: string | null
          highlighted_text: string | null
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          annotation_type: string
          content?: string | null
          created_at?: string | null
          highlighted_text?: string | null
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          annotation_type?: string
          content?: string | null
          created_at?: string | null
          highlighted_text?: string | null
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: []
      }
      message_reactions: {
        Row: {
          created_at: string | null
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: []
      }
      model_health_history: {
        Row: {
          consecutive_failures: number | null
          id: string
          is_disabled: boolean | null
          model_id: string
          model_name: string
          recorded_at: string | null
          status: string
          successful_requests: number | null
          total_requests: number | null
        }
        Insert: {
          consecutive_failures?: number | null
          id?: string
          is_disabled?: boolean | null
          model_id: string
          model_name: string
          recorded_at?: string | null
          status: string
          successful_requests?: number | null
          total_requests?: number | null
        }
        Update: {
          consecutive_failures?: number | null
          id?: string
          is_disabled?: boolean | null
          model_id?: string
          model_name?: string
          recorded_at?: string | null
          status?: string
          successful_requests?: number | null
          total_requests?: number | null
        }
        Relationships: []
      }
      model_presets: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_system_preset: boolean | null
          models: Json
          name: string
          settings: Json | null
          task_type: string
          usage_count: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_system_preset?: boolean | null
          models?: Json
          name: string
          settings?: Json | null
          task_type?: string
          usage_count?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_system_preset?: boolean | null
          models?: Json
          name?: string
          settings?: Json | null
          task_type?: string
          usage_count?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      password_reset_attempts: {
        Row: {
          created_at: string | null
          email: string
          id: string
          ip_address: string | null
          method: string
          phone_number: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          ip_address?: string | null
          method: string
          phone_number?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          ip_address?: string | null
          method?: string
          phone_number?: string | null
        }
        Relationships: []
      }
      phone_verification_codes: {
        Row: {
          attempts: number | null
          code: string
          created_at: string | null
          expires_at: string
          id: string
          phone_number: string
          purpose: string
          user_id: string | null
          verified: boolean | null
        }
        Insert: {
          attempts?: number | null
          code: string
          created_at?: string | null
          expires_at: string
          id?: string
          phone_number: string
          purpose?: string
          user_id?: string | null
          verified?: boolean | null
        }
        Update: {
          attempts?: number | null
          code?: string
          created_at?: string | null
          expires_at?: string
          id?: string
          phone_number?: string
          purpose?: string
          user_id?: string | null
          verified?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "phone_verification_codes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      preset_performance: {
        Row: {
          avg_rating: number | null
          avg_response_time: number | null
          id: string
          preset_id: string
          success_rate: number | null
          total_uses: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avg_rating?: number | null
          avg_response_time?: number | null
          id?: string
          preset_id: string
          success_rate?: number | null
          total_uses?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avg_rating?: number | null
          avg_response_time?: number | null
          id?: string
          preset_id?: string
          success_rate?: number | null
          total_uses?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "preset_performance_preset_id_fkey"
            columns: ["preset_id"]
            isOneToOne: false
            referencedRelation: "model_presets"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          animation_preferences: Json | null
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          credits_remaining: number | null
          display_name: string | null
          email_digest_enabled: boolean | null
          email_invoices_enabled: boolean | null
          email_marketing_enabled: boolean | null
          email_system_enabled: boolean | null
          email_welcome_enabled: boolean | null
          id: string
          is_pro: boolean | null
          last_credit_reset: string | null
          last_digest_sent: string | null
          last_email_change: string | null
          last_password_change: string | null
          last_phone_change: string | null
          monthly_credits: number | null
          monthly_credits_used: number | null
          phone_number: string | null
          phone_verified: boolean | null
          phone_verified_at: string | null
          recovery_email: string | null
          subscription_expires_at: string | null
          subscription_type: string | null
          theme_preferences: Json | null
          username: string | null
        }
        Insert: {
          animation_preferences?: Json | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          credits_remaining?: number | null
          display_name?: string | null
          email_digest_enabled?: boolean | null
          email_invoices_enabled?: boolean | null
          email_marketing_enabled?: boolean | null
          email_system_enabled?: boolean | null
          email_welcome_enabled?: boolean | null
          id: string
          is_pro?: boolean | null
          last_credit_reset?: string | null
          last_digest_sent?: string | null
          last_email_change?: string | null
          last_password_change?: string | null
          last_phone_change?: string | null
          monthly_credits?: number | null
          monthly_credits_used?: number | null
          phone_number?: string | null
          phone_verified?: boolean | null
          phone_verified_at?: string | null
          recovery_email?: string | null
          subscription_expires_at?: string | null
          subscription_type?: string | null
          theme_preferences?: Json | null
          username?: string | null
        }
        Update: {
          animation_preferences?: Json | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          credits_remaining?: number | null
          display_name?: string | null
          email_digest_enabled?: boolean | null
          email_invoices_enabled?: boolean | null
          email_marketing_enabled?: boolean | null
          email_system_enabled?: boolean | null
          email_welcome_enabled?: boolean | null
          id?: string
          is_pro?: boolean | null
          last_credit_reset?: string | null
          last_digest_sent?: string | null
          last_email_change?: string | null
          last_password_change?: string | null
          last_phone_change?: string | null
          monthly_credits?: number | null
          monthly_credits_used?: number | null
          phone_number?: string | null
          phone_verified?: boolean | null
          phone_verified_at?: string | null
          recovery_email?: string | null
          subscription_expires_at?: string | null
          subscription_type?: string | null
          theme_preferences?: Json | null
          username?: string | null
        }
        Relationships: []
      }
      prompt_library: {
        Row: {
          category: string | null
          created_at: string | null
          id: string
          is_public: boolean | null
          prompt_template: string
          tags: string[] | null
          title: string
          updated_at: string | null
          usage_count: number | null
          user_id: string | null
          variables: Json | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          id?: string
          is_public?: boolean | null
          prompt_template: string
          tags?: string[] | null
          title: string
          updated_at?: string | null
          usage_count?: number | null
          user_id?: string | null
          variables?: Json | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          id?: string
          is_public?: boolean | null
          prompt_template?: string
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          usage_count?: number | null
          user_id?: string | null
          variables?: Json | null
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          auto_verified: boolean | null
          created_at: string | null
          gateway_order_id: string | null
          gateway_payment_id: string | null
          gateway_response: Json | null
          id: string
          order_id: string | null
          payment_id: string | null
          payment_method: string | null
          payment_reference: string | null
          plan_type: string | null
          status: string
          subscription_period_end: string | null
          subscription_period_start: string | null
          user_id: string
          verification_status: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          amount: number
          auto_verified?: boolean | null
          created_at?: string | null
          gateway_order_id?: string | null
          gateway_payment_id?: string | null
          gateway_response?: Json | null
          id?: string
          order_id?: string | null
          payment_id?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          plan_type?: string | null
          status: string
          subscription_period_end?: string | null
          subscription_period_start?: string | null
          user_id: string
          verification_status?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          amount?: number
          auto_verified?: boolean | null
          created_at?: string | null
          gateway_order_id?: string | null
          gateway_payment_id?: string | null
          gateway_response?: Json | null
          id?: string
          order_id?: string | null
          payment_id?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          plan_type?: string | null
          status?: string
          subscription_period_end?: string | null
          subscription_period_start?: string | null
          user_id?: string
          verification_status?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_segments: {
        Row: {
          assigned_at: string | null
          id: string
          metadata: Json | null
          segment_type: string
          segment_value: string
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          id?: string
          metadata?: Json | null
          segment_type: string
          segment_value: string
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          id?: string
          metadata?: Json | null
          segment_type?: string
          segment_value?: string
          user_id?: string
        }
        Relationships: []
      }
      verification_codes: {
        Row: {
          code: string
          created_at: string | null
          expires_at: string
          id: string
          purpose: string | null
          user_id: string | null
          verified: boolean | null
        }
        Insert: {
          code: string
          created_at?: string | null
          expires_at: string
          id?: string
          purpose?: string | null
          user_id?: string | null
          verified?: boolean | null
        }
        Update: {
          code?: string
          created_at?: string | null
          expires_at?: string
          id?: string
          purpose?: string | null
          user_id?: string | null
          verified?: boolean | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_and_deduct_credit: { Args: { p_user_id: string }; Returns: boolean }
      check_and_deduct_credits: {
        Args: { p_credits_to_deduct: number; p_user_id: string }
        Returns: Json
      }
      check_and_deduct_yearly_credit: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      check_high_activity: { Args: never; Returns: undefined }
      check_phone_reset_rate_limit: {
        Args: { p_phone: string }
        Returns: boolean
      }
      check_reset_rate_limit: { Args: { p_email: string }; Returns: boolean }
      cleanup_expired_email_requests: { Args: never; Returns: undefined }
      cleanup_expired_phone_codes: { Args: never; Returns: undefined }
      cleanup_old_pending_transactions: { Args: never; Returns: undefined }
      expire_monthly_subscriptions: { Args: never; Returns: undefined }
      generate_verification_code: {
        Args: { p_user_id: string }
        Returns: string
      }
      get_campaign_analytics: {
        Args: {
          p_campaign_type?: string
          p_end_date?: string
          p_start_date?: string
        }
        Returns: {
          campaign_type: string
          click_rate: number
          conversion_rate: number
          open_rate: number
          roi: number
          total_clicked: number
          total_converted: number
          total_opened: number
          total_revenue: number
          total_sent: number
        }[]
      }
      get_chat_history_with_counts: {
        Args: { p_user_id: string }
        Returns: {
          created_at: string
          id: string
          message_count: number
          title: string
          updated_at: string
          user_id: string
        }[]
      }
      get_inactive_users: {
        Args: { days?: number }
        Returns: {
          created_at: string
          display_name: string
          id: string
        }[]
      }
      get_user_dashboard_stats: { Args: { p_user_id: string }; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      reset_daily_credits: { Args: never; Returns: undefined }
      update_all_user_segments: { Args: never; Returns: undefined }
      update_user_segments: { Args: { p_user_id: string }; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
