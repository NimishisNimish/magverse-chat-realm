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
      admin_activity_logs: {
        Row: {
          activity_type: string
          admin_id: string
          created_at: string | null
          id: string
          ip_address: string | null
          metadata: Json | null
          page_path: string
          user_agent: string | null
        }
        Insert: {
          activity_type: string
          admin_id: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          page_path: string
          user_agent?: string | null
        }
        Update: {
          activity_type?: string
          admin_id?: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          page_path?: string
          user_agent?: string | null
        }
        Relationships: []
      }
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
      admin_settings: {
        Row: {
          key: string
          updated_at: string | null
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string | null
          updated_by?: string | null
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: Json
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
      ai_model_metrics: {
        Row: {
          created_at: string | null
          id: string
          message_id: string | null
          model_name: string
          response_time_ms: number
          tokens_input: number | null
          tokens_output: number | null
          tokens_total: number | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message_id?: string | null
          model_name: string
          response_time_ms: number
          tokens_input?: number | null
          tokens_output?: number | null
          tokens_total?: number | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message_id?: string | null
          model_name?: string
          response_time_ms?: number
          tokens_input?: number | null
          tokens_output?: number | null
          tokens_total?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_model_metrics_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
        ]
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
          sources: Json | null
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
          sources?: Json | null
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
          sources?: Json | null
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
          cost_usd: number | null
          created_at: string
          credits_used: number
          id: string
          message_id: string | null
          model: string
          model_pricing_tier: string | null
          request_type: string
          response_time_ms: number | null
          tokens_used: number | null
          user_id: string
        }
        Insert: {
          chat_id?: string | null
          cost_usd?: number | null
          created_at?: string
          credits_used?: number
          id?: string
          message_id?: string | null
          model: string
          model_pricing_tier?: string | null
          request_type?: string
          response_time_ms?: number | null
          tokens_used?: number | null
          user_id: string
        }
        Update: {
          chat_id?: string | null
          cost_usd?: number | null
          created_at?: string
          credits_used?: number
          id?: string
          message_id?: string | null
          model?: string
          model_pricing_tier?: string | null
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
      feature_updates: {
        Row: {
          category: string | null
          content: string
          created_at: string | null
          created_by: string | null
          id: string
          image_url: string | null
          is_published: boolean | null
          notify_subscribers: boolean | null
          published_at: string | null
          summary: string | null
          title: string
          updated_at: string | null
          version: string | null
        }
        Insert: {
          category?: string | null
          content: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          image_url?: string | null
          is_published?: boolean | null
          notify_subscribers?: boolean | null
          published_at?: string | null
          summary?: string | null
          title: string
          updated_at?: string | null
          version?: string | null
        }
        Update: {
          category?: string | null
          content?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          image_url?: string | null
          is_published?: boolean | null
          notify_subscribers?: boolean | null
          published_at?: string | null
          summary?: string | null
          title?: string
          updated_at?: string | null
          version?: string | null
        }
        Relationships: []
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
          {
            foreignKeyName: "invoices_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
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
          is_shared: boolean | null
          is_system_preset: boolean | null
          models: Json
          name: string
          settings: Json | null
          share_code: string | null
          shared_at: string | null
          task_type: string
          usage_count: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_shared?: boolean | null
          is_system_preset?: boolean | null
          models?: Json
          name: string
          settings?: Json | null
          share_code?: string | null
          shared_at?: string | null
          task_type?: string
          usage_count?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_shared?: boolean | null
          is_system_preset?: boolean | null
          models?: Json
          name?: string
          settings?: Json | null
          share_code?: string | null
          shared_at?: string | null
          task_type?: string
          usage_count?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      newsletter_subscribers: {
        Row: {
          email: string
          id: string
          is_active: boolean | null
          metadata: Json | null
          source: string | null
          subscribed_at: string | null
          unsubscribed_at: string | null
          user_id: string | null
        }
        Insert: {
          email: string
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          source?: string | null
          subscribed_at?: string | null
          unsubscribed_at?: string | null
          user_id?: string | null
        }
        Update: {
          email?: string
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          source?: string | null
          subscribed_at?: string | null
          unsubscribed_at?: string | null
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
      pdf_text_cache: {
        Row: {
          char_count: number | null
          created_at: string
          expires_at: string
          extracted_text: string
          extraction_method: string | null
          file_hash: string
          file_name: string | null
          file_url: string
          id: string
          user_id: string | null
          word_count: number | null
        }
        Insert: {
          char_count?: number | null
          created_at?: string
          expires_at?: string
          extracted_text: string
          extraction_method?: string | null
          file_hash: string
          file_name?: string | null
          file_url: string
          id?: string
          user_id?: string | null
          word_count?: number | null
        }
        Update: {
          char_count?: number | null
          created_at?: string
          expires_at?: string
          extracted_text?: string
          extraction_method?: string | null
          file_hash?: string
          file_name?: string | null
          file_url?: string
          id?: string
          user_id?: string | null
          word_count?: number | null
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
          max_attempts: number | null
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
          max_attempts?: number | null
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
          max_attempts?: number | null
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
          {
            foreignKeyName: "phone_verification_codes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
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
          email_credit_alerts_enabled: boolean | null
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
          phone_number_encrypted: string | null
          phone_verified: boolean | null
          phone_verified_at: string | null
          recovery_email_encrypted: string | null
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
          email_credit_alerts_enabled?: boolean | null
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
          phone_number_encrypted?: string | null
          phone_verified?: boolean | null
          phone_verified_at?: string | null
          recovery_email_encrypted?: string | null
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
          email_credit_alerts_enabled?: boolean | null
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
          phone_number_encrypted?: string | null
          phone_verified?: boolean | null
          phone_verified_at?: string | null
          recovery_email_encrypted?: string | null
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
      refund_requests: {
        Row: {
          amount: number
          contact_email: string
          created_at: string | null
          details: string | null
          id: string
          invoice_id: string | null
          reason: string
          status: string
          transaction_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount: number
          contact_email: string
          created_at?: string | null
          details?: string | null
          id?: string
          invoice_id?: string | null
          reason: string
          status?: string
          transaction_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          contact_email?: string
          created_at?: string | null
          details?: string | null
          id?: string
          invoice_id?: string | null
          reason?: string
          status?: string
          transaction_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "refund_requests_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refund_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refund_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      student_trial_applications: {
        Row: {
          created_at: string | null
          email: string
          id: string
          is_edu_email: boolean | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          trial_end_date: string | null
          trial_start_date: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          is_edu_email?: boolean | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          trial_end_date?: string | null
          trial_start_date?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          is_edu_email?: boolean | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          trial_end_date?: string | null
          trial_start_date?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      transaction_gateway_logs: {
        Row: {
          gateway_order_id_full: string | null
          gateway_payment_id_full: string | null
          id: string
          logged_at: string | null
          raw_gateway_response: Json | null
          transaction_id: string
        }
        Insert: {
          gateway_order_id_full?: string | null
          gateway_payment_id_full?: string | null
          id?: string
          logged_at?: string | null
          raw_gateway_response?: Json | null
          transaction_id: string
        }
        Update: {
          gateway_order_id_full?: string | null
          gateway_payment_id_full?: string | null
          id?: string
          logged_at?: string | null
          raw_gateway_response?: Json | null
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transaction_gateway_logs_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
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
      user_budget_alerts: {
        Row: {
          alert_threshold_percent: number | null
          budget_limit_usd: number
          created_at: string | null
          current_spending_usd: number | null
          id: string
          is_active: boolean | null
          last_alert_sent: string | null
          period_end: string | null
          period_start: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          alert_threshold_percent?: number | null
          budget_limit_usd: number
          created_at?: string | null
          current_spending_usd?: number | null
          id?: string
          is_active?: boolean | null
          last_alert_sent?: string | null
          period_end?: string | null
          period_start?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          alert_threshold_percent?: number | null
          budget_limit_usd?: number
          created_at?: string | null
          current_spending_usd?: number | null
          id?: string
          is_active?: boolean | null
          last_alert_sent?: string | null
          period_end?: string | null
          period_start?: string | null
          updated_at?: string | null
          user_id?: string
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
      feature_updates_public: {
        Row: {
          category: string | null
          content: string | null
          created_at: string | null
          id: string | null
          image_url: string | null
          is_published: boolean | null
          published_at: string | null
          summary: string | null
          title: string | null
          updated_at: string | null
          version: string | null
        }
        Insert: {
          category?: string | null
          content?: string | null
          created_at?: string | null
          id?: string | null
          image_url?: string | null
          is_published?: boolean | null
          published_at?: string | null
          summary?: string | null
          title?: string | null
          updated_at?: string | null
          version?: string | null
        }
        Update: {
          category?: string | null
          content?: string | null
          created_at?: string | null
          id?: string | null
          image_url?: string | null
          is_published?: boolean | null
          published_at?: string | null
          summary?: string | null
          title?: string | null
          updated_at?: string | null
          version?: string | null
        }
        Relationships: []
      }
      profiles_safe: {
        Row: {
          animation_preferences: Json | null
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          credits_remaining: number | null
          display_name: string | null
          email_credit_alerts_enabled: boolean | null
          email_digest_enabled: boolean | null
          email_invoices_enabled: boolean | null
          email_marketing_enabled: boolean | null
          email_system_enabled: boolean | null
          email_welcome_enabled: boolean | null
          id: string | null
          is_pro: boolean | null
          last_credit_reset: string | null
          monthly_credits: number | null
          monthly_credits_used: number | null
          phone_verified: boolean | null
          phone_verified_at: string | null
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
          email_credit_alerts_enabled?: boolean | null
          email_digest_enabled?: boolean | null
          email_invoices_enabled?: boolean | null
          email_marketing_enabled?: boolean | null
          email_system_enabled?: boolean | null
          email_welcome_enabled?: boolean | null
          id?: string | null
          is_pro?: boolean | null
          last_credit_reset?: string | null
          monthly_credits?: number | null
          monthly_credits_used?: number | null
          phone_verified?: boolean | null
          phone_verified_at?: string | null
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
          email_credit_alerts_enabled?: boolean | null
          email_digest_enabled?: boolean | null
          email_invoices_enabled?: boolean | null
          email_marketing_enabled?: boolean | null
          email_system_enabled?: boolean | null
          email_welcome_enabled?: boolean | null
          id?: string | null
          is_pro?: boolean | null
          last_credit_reset?: string | null
          monthly_credits?: number | null
          monthly_credits_used?: number | null
          phone_verified?: boolean | null
          phone_verified_at?: string | null
          subscription_expires_at?: string | null
          subscription_type?: string | null
          theme_preferences?: Json | null
          username?: string | null
        }
        Relationships: []
      }
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
      cleanup_expired_pdf_cache: { Args: never; Returns: undefined }
      cleanup_expired_phone_codes: { Args: never; Returns: undefined }
      cleanup_old_pending_transactions: { Args: never; Returns: undefined }
      decrypt_sensitive_data: {
        Args: { encrypted_data: string; user_id: string }
        Returns: string
      }
      encrypt_sensitive_data: {
        Args: { data: string; user_id: string }
        Returns: string
      }
      expire_monthly_subscriptions: { Args: never; Returns: undefined }
      generate_share_code: { Args: never; Returns: string }
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
      get_full_transaction_gateway_data: {
        Args: { p_transaction_id: string }
        Returns: {
          gateway_order_id_full: string
          gateway_payment_id_full: string
          logged_at: string
          raw_gateway_response: Json
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
      get_my_secure_profile: {
        Args: never
        Returns: {
          animation_preferences: Json
          avatar_url: string
          bio: string
          created_at: string
          credits_remaining: number
          display_name: string
          email_credit_alerts_enabled: boolean
          email_digest_enabled: boolean
          email_invoices_enabled: boolean
          email_marketing_enabled: boolean
          email_system_enabled: boolean
          email_welcome_enabled: boolean
          id: string
          is_pro: boolean
          monthly_credits: number
          monthly_credits_used: number
          phone_number_decrypted: string
          phone_number_masked: string
          phone_verified: boolean
          phone_verified_at: string
          recovery_email_decrypted: string
          recovery_email_masked: string
          subscription_expires_at: string
          subscription_type: string
          theme_preferences: Json
          username: string
        }[]
      }
      get_my_sensitive_profile_data: {
        Args: never
        Returns: {
          phone_number_decrypted: string
          recovery_email_decrypted: string
        }[]
      }
      get_user_dashboard_stats: { Args: { p_user_id: string }; Returns: Json }
      get_webhook_urls: { Args: never; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      reset_daily_credits: { Args: never; Returns: undefined }
      sanitize_gateway_response: { Args: { raw_response: Json }; Returns: Json }
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
