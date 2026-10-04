export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.18';
  };
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string;
          actor_user_id: string | null;
          created_at: string;
          id: string;
          metadata: Json;
          target_id: string | null;
          target_type: string;
          workspace_id: string;
        };
        Insert: {
          action: string;
          actor_user_id?: string | null;
          created_at?: string;
          id?: string;
          metadata?: Json;
          target_id?: string | null;
          target_type: string;
          workspace_id: string;
        };
        Update: {
          action?: string;
          actor_user_id?: string | null;
          created_at?: string;
          id?: string;
          metadata?: Json;
          target_id?: string | null;
          target_type?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'audit_logs_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      contact_rate_limits: {
        Row: {
          attempts: number;
          expires_at: string;
          key_hash: string;
          window_start: string;
        };
        Insert: {
          attempts?: number;
          expires_at: string;
          key_hash: string;
          window_start: string;
        };
        Update: {
          attempts?: number;
          expires_at?: string;
          key_hash?: string;
          window_start?: string;
        };
        Relationships: [];
      };
      contact_submissions: {
        Row: {
          company: string | null;
          created_at: string;
          delivery_status: string;
          email_normalized: string;
          full_name: string;
          id: string;
          last_error_code: string | null;
          message: string;
          processed_at: string | null;
          topic: string;
        };
        Insert: {
          company?: string | null;
          created_at?: string;
          delivery_status?: string;
          email_normalized: string;
          full_name: string;
          id?: string;
          last_error_code?: string | null;
          message: string;
          processed_at?: string | null;
          topic: string;
        };
        Update: {
          company?: string | null;
          created_at?: string;
          delivery_status?: string;
          email_normalized?: string;
          full_name?: string;
          id?: string;
          last_error_code?: string | null;
          message?: string;
          processed_at?: string | null;
          topic?: string;
        };
        Relationships: [];
      };
      conversation_tags: {
        Row: {
          conversation_id: string;
          tag_id: string;
          workspace_id: string;
        };
        Insert: {
          conversation_id: string;
          tag_id: string;
          workspace_id: string;
        };
        Update: {
          conversation_id?: string;
          tag_id?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'conversation_tags_conversation_id_fkey';
            columns: ['conversation_id'];
            isOneToOne: false;
            referencedRelation: 'conversations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'conversation_tags_tag_id_fkey';
            columns: ['tag_id'];
            isOneToOne: false;
            referencedRelation: 'tags';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'conversation_tags_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      conversations: {
        Row: {
          assignee_user_id: string | null;
          channel: string;
          created_at: string;
          customer_id: string;
          id: string;
          last_message_at: string | null;
          priority: string;
          status: string;
          subject: string;
          unread_count: number;
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          assignee_user_id?: string | null;
          channel?: string;
          created_at?: string;
          customer_id: string;
          id?: string;
          last_message_at?: string | null;
          priority?: string;
          status?: string;
          subject?: string;
          unread_count?: number;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          assignee_user_id?: string | null;
          channel?: string;
          created_at?: string;
          customer_id?: string;
          id?: string;
          last_message_at?: string | null;
          priority?: string;
          status?: string;
          subject?: string;
          unread_count?: number;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'conversations_customer_id_fkey';
            columns: ['customer_id'];
            isOneToOne: false;
            referencedRelation: 'customers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'conversations_customer_workspace_fk';
            columns: ['workspace_id', 'customer_id'];
            isOneToOne: false;
            referencedRelation: 'customers';
            referencedColumns: ['workspace_id', 'id'];
          },
          {
            foreignKeyName: 'conversations_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      customer_identities: {
        Row: {
          created_at: string;
          customer_id: string;
          id: string;
          identity_key: string;
          provider: string;
          workspace_id: string;
        };
        Insert: {
          created_at?: string;
          customer_id: string;
          id?: string;
          identity_key: string;
          provider: string;
          workspace_id: string;
        };
        Update: {
          created_at?: string;
          customer_id?: string;
          id?: string;
          identity_key?: string;
          provider?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'customer_identities_customer_id_fkey';
            columns: ['customer_id'];
            isOneToOne: false;
            referencedRelation: 'customers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'customer_identities_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      customer_tags: {
        Row: {
          customer_id: string;
          tag_id: string;
          workspace_id: string;
        };
        Insert: {
          customer_id: string;
          tag_id: string;
          workspace_id: string;
        };
        Update: {
          customer_id?: string;
          tag_id?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'customer_tags_customer_id_fkey';
            columns: ['customer_id'];
            isOneToOne: false;
            referencedRelation: 'customers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'customer_tags_tag_id_fkey';
            columns: ['tag_id'];
            isOneToOne: false;
            referencedRelation: 'tags';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'customer_tags_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      customers: {
        Row: {
          company: string | null;
          created_at: string;
          email: string | null;
          first_seen_at: string;
          id: string;
          last_seen_at: string;
          locale: string | null;
          metadata: Json;
          name: string;
          phone: string | null;
          timezone: string | null;
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          company?: string | null;
          created_at?: string;
          email?: string | null;
          first_seen_at?: string;
          id?: string;
          last_seen_at?: string;
          locale?: string | null;
          metadata?: Json;
          name?: string;
          phone?: string | null;
          timezone?: string | null;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          company?: string | null;
          created_at?: string;
          email?: string | null;
          first_seen_at?: string;
          id?: string;
          last_seen_at?: string;
          locale?: string | null;
          metadata?: Json;
          name?: string;
          phone?: string | null;
          timezone?: string | null;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'customers_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      messages: {
        Row: {
          body: string;
          client_id: string | null;
          conversation_id: string;
          created_at: string;
          delivery_status: string;
          id: string;
          sender_type: string;
          sender_user_id: string | null;
          workspace_id: string;
        };
        Insert: {
          body: string;
          client_id?: string | null;
          conversation_id: string;
          created_at?: string;
          delivery_status?: string;
          id?: string;
          sender_type: string;
          sender_user_id?: string | null;
          workspace_id: string;
        };
        Update: {
          body?: string;
          client_id?: string | null;
          conversation_id?: string;
          created_at?: string;
          delivery_status?: string;
          id?: string;
          sender_type?: string;
          sender_user_id?: string | null;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'messages_conversation_id_fkey';
            columns: ['conversation_id'];
            isOneToOne: false;
            referencedRelation: 'conversations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'messages_conversation_workspace_fk';
            columns: ['workspace_id', 'conversation_id'];
            isOneToOne: false;
            referencedRelation: 'conversations';
            referencedColumns: ['workspace_id', 'id'];
          },
          {
            foreignKeyName: 'messages_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      notifications: {
        Row: {
          body: string;
          created_at: string;
          id: string;
          kind: string;
          read_at: string | null;
          title: string;
          user_id: string;
          workspace_id: string;
        };
        Insert: {
          body: string;
          created_at?: string;
          id?: string;
          kind: string;
          read_at?: string | null;
          title: string;
          user_id: string;
          workspace_id: string;
        };
        Update: {
          body?: string;
          created_at?: string;
          id?: string;
          kind?: string;
          read_at?: string | null;
          title?: string;
          user_id?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'notifications_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          display_name: string;
          email_normalized: string;
          id: string;
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          display_name?: string;
          email_normalized: string;
          id: string;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          display_name?: string;
          email_normalized?: string;
          id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      tags: {
        Row: {
          color: string;
          created_at: string;
          id: string;
          name: string;
          workspace_id: string;
        };
        Insert: {
          color?: string;
          created_at?: string;
          id?: string;
          name: string;
          workspace_id: string;
        };
        Update: {
          color?: string;
          created_at?: string;
          id?: string;
          name?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'tags_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      ticket_events: {
        Row: {
          actor_user_id: string | null;
          created_at: string;
          event_type: string;
          id: string;
          payload: Json;
          ticket_id: string;
          workspace_id: string;
        };
        Insert: {
          actor_user_id?: string | null;
          created_at?: string;
          event_type: string;
          id?: string;
          payload?: Json;
          ticket_id: string;
          workspace_id: string;
        };
        Update: {
          actor_user_id?: string | null;
          created_at?: string;
          event_type?: string;
          id?: string;
          payload?: Json;
          ticket_id?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'ticket_events_ticket_id_fkey';
            columns: ['ticket_id'];
            isOneToOne: false;
            referencedRelation: 'tickets';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'ticket_events_ticket_workspace_fk';
            columns: ['workspace_id', 'ticket_id'];
            isOneToOne: false;
            referencedRelation: 'tickets';
            referencedColumns: ['workspace_id', 'id'];
          },
          {
            foreignKeyName: 'ticket_events_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      ticket_tags: {
        Row: {
          tag_id: string;
          ticket_id: string;
          workspace_id: string;
        };
        Insert: {
          tag_id: string;
          ticket_id: string;
          workspace_id: string;
        };
        Update: {
          tag_id?: string;
          ticket_id?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'ticket_tags_tag_id_fkey';
            columns: ['tag_id'];
            isOneToOne: false;
            referencedRelation: 'tags';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'ticket_tags_ticket_id_fkey';
            columns: ['ticket_id'];
            isOneToOne: false;
            referencedRelation: 'tickets';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'ticket_tags_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      tickets: {
        Row: {
          assignee_user_id: string | null;
          category: string | null;
          conversation_id: string | null;
          created_at: string;
          customer_id: string | null;
          description: string;
          id: string;
          priority: string;
          resolved_at: string | null;
          status: string;
          ticket_number: number;
          title: string;
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          assignee_user_id?: string | null;
          category?: string | null;
          conversation_id?: string | null;
          created_at?: string;
          customer_id?: string | null;
          description?: string;
          id?: string;
          priority?: string;
          resolved_at?: string | null;
          status?: string;
          ticket_number: number;
          title: string;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          assignee_user_id?: string | null;
          category?: string | null;
          conversation_id?: string | null;
          created_at?: string;
          customer_id?: string | null;
          description?: string;
          id?: string;
          priority?: string;
          resolved_at?: string | null;
          status?: string;
          ticket_number?: number;
          title?: string;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'tickets_conversation_id_fkey';
            columns: ['conversation_id'];
            isOneToOne: false;
            referencedRelation: 'conversations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'tickets_conversation_workspace_fk';
            columns: ['workspace_id', 'conversation_id'];
            isOneToOne: false;
            referencedRelation: 'conversations';
            referencedColumns: ['workspace_id', 'id'];
          },
          {
            foreignKeyName: 'tickets_customer_id_fkey';
            columns: ['customer_id'];
            isOneToOne: false;
            referencedRelation: 'customers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'tickets_customer_workspace_fk';
            columns: ['workspace_id', 'customer_id'];
            isOneToOne: false;
            referencedRelation: 'customers';
            referencedColumns: ['workspace_id', 'id'];
          },
          {
            foreignKeyName: 'tickets_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      workspace_invitations: {
        Row: {
          accepted_at: string | null;
          created_at: string;
          delivery_status: string;
          email_normalized: string;
          expires_at: string;
          id: string;
          invited_by_user_id: string;
          last_error_code: string | null;
          last_sent_at: string | null;
          revoked_at: string | null;
          role: string;
          token_hash: string;
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          accepted_at?: string | null;
          created_at?: string;
          delivery_status?: string;
          email_normalized: string;
          expires_at: string;
          id?: string;
          invited_by_user_id: string;
          last_error_code?: string | null;
          last_sent_at?: string | null;
          revoked_at?: string | null;
          role: string;
          token_hash: string;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          accepted_at?: string | null;
          created_at?: string;
          delivery_status?: string;
          email_normalized?: string;
          expires_at?: string;
          id?: string;
          invited_by_user_id?: string;
          last_error_code?: string | null;
          last_sent_at?: string | null;
          revoked_at?: string | null;
          role?: string;
          token_hash?: string;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'workspace_invitations_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      workspace_members: {
        Row: {
          joined_at: string;
          role: string;
          status: string;
          user_id: string;
          workspace_id: string;
        };
        Insert: {
          joined_at?: string;
          role: string;
          status?: string;
          user_id: string;
          workspace_id: string;
        };
        Update: {
          joined_at?: string;
          role?: string;
          status?: string;
          user_id?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'workspace_members_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'workspace_members_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      workspaces: {
        Row: {
          ai_mode: string;
          company_name: string | null;
          created_at: string;
          id: string;
          name: string;
          onboarding_completed_at: string | null;
          onboarding_step: string;
          owner_user_id: string;
          slug: string;
          support_email: string | null;
          support_name: string | null;
          timezone: string;
          updated_at: string;
          website_origin: string | null;
        };
        Insert: {
          ai_mode?: string;
          company_name?: string | null;
          created_at?: string;
          id?: string;
          name: string;
          onboarding_completed_at?: string | null;
          onboarding_step?: string;
          owner_user_id: string;
          slug: string;
          support_email?: string | null;
          support_name?: string | null;
          timezone?: string;
          updated_at?: string;
          website_origin?: string | null;
        };
        Update: {
          ai_mode?: string;
          company_name?: string | null;
          created_at?: string;
          id?: string;
          name?: string;
          onboarding_completed_at?: string | null;
          onboarding_step?: string;
          owner_user_id?: string;
          slug?: string;
          support_email?: string | null;
          support_name?: string | null;
          timezone?: string;
          updated_at?: string;
          website_origin?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      accept_invitation: { Args: { p_token_hash: string }; Returns: string };
      advance_onboarding: {
        Args: { p_expected: string; p_next: string; p_workspace_id: string };
        Returns: undefined;
      };
      change_member_role: {
        Args: { p_role: string; p_user_id: string; p_workspace_id: string };
        Returns: undefined;
      };
      create_conversation: {
        Args: {
          p_channel?: string;
          p_customer_id: string;
          p_subject: string;
          p_workspace_id: string;
        };
        Returns: string;
      };
      create_invitation: {
        Args: {
          p_email: string;
          p_role: string;
          p_token_hash: string;
          p_workspace_id: string;
        };
        Returns: string;
      };
      create_or_get_customer: {
        Args: {
          p_company: string;
          p_email: string;
          p_identity_key: string;
          p_name: string;
          p_phone: string;
          p_provider: string;
          p_workspace_id: string;
        };
        Returns: string;
      };
      create_ticket: {
        Args: {
          p_assignee_user_id: string;
          p_category: string;
          p_conversation_id: string;
          p_customer_id: string;
          p_description: string;
          p_priority: string;
          p_title: string;
          p_workspace_id: string;
        };
        Returns: string;
      };
      create_workspace: {
        Args: { p_name: string; p_slug: string; p_timezone: string };
        Returns: string;
      };
      finish_onboarding: {
        Args: { p_ai_mode: string; p_workspace_id: string };
        Returns: undefined;
      };
      mark_notification_read: { Args: { p_id: string }; Returns: undefined };
      remove_member: {
        Args: { p_user_id: string; p_workspace_id: string };
        Returns: undefined;
      };
      resend_invitation: {
        Args: { p_id: string; p_token_hash: string };
        Returns: {
          email_normalized: string;
          role: string;
          workspace_id: string;
        }[];
      };
      reserve_contact_attempt: {
        Args: { p_key_hash: string; p_max_attempts: number };
        Returns: boolean;
      };
      revoke_invitation: { Args: { p_id: string }; Returns: undefined };
      send_message: {
        Args: {
          p_body: string;
          p_client_id?: string;
          p_conversation_id: string;
          p_internal?: boolean;
          p_workspace_id: string;
        };
        Returns: string;
      };
      update_conversation: {
        Args: {
          p_assignee_user_id?: string;
          p_conversation_id: string;
          p_priority?: string;
          p_status?: string;
          p_workspace_id: string;
        };
        Returns: undefined;
      };
      update_ticket: {
        Args: {
          p_assignee_user_id?: string;
          p_category?: string;
          p_description?: string;
          p_priority?: string;
          p_status?: string;
          p_ticket_id: string;
          p_title?: string;
          p_workspace_id: string;
        };
        Returns: undefined;
      };
      update_workspace_general: {
        Args: {
          p_company_name: string;
          p_name: string;
          p_slug: string;
          p_support_email: string;
          p_support_name: string;
          p_timezone: string;
          p_website_origin: string;
          p_workspace_id: string;
        };
        Returns: undefined;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  'public'
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] &
        DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] &
        DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
