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
      create_invitation: {
        Args: {
          p_email: string;
          p_role: string;
          p_token_hash: string;
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
