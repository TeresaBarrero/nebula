// Tipos de la base de datos. Reflejan supabase/migrations/.
// Cuando el proyecto esté enlazado se pueden regenerar con: npm run db:tipos

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Marcas = { created_at: string; updated_at: string };

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Marcas & {
          id: string;
          full_name: string;
          name: string;
          role: string;
          email: string;
          phone: string;
          prefs: Json;
          status: 'pendiente' | 'aprobado' | 'rechazado';
          privacy_accepted_at: string | null;
          signup_data: Json;
        };
        Insert: never;
        Update: { full_name?: string; name?: string; role?: string; phone?: string; prefs?: Json };
        Relationships: [];
      };
      app_admins: {
        Row: { user_id: string; created_at: string };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      workspaces: {
        Row: Marcas & { id: string; name: string; created_by: string | null };
        Insert: never;
        Update: { name?: string };
        Relationships: [];
      };
      workspace_members: {
        Row: Marcas & { id: string; workspace_id: string; user_id: string; role: 'owner' | 'member' };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      workspace_settings: {
        Row: Marcas & {
          id: string;
          workspace_id: string;
          business: string;
          legal_name: string;
          nif: string;
          address: string;
          iban: string;
          kind: 'autonomo' | 'sociedad';
          new_autonomo: boolean;
          irpf_mode: 'empresas' | 'particulares' | 'mixto';
          iva: number;
          irpf: number;
          pay_days: number;
          rate: number;
          extra_round: number;
          capacity: number;
          disciplines: string[];
          pay_online: Json;
          onboarded: boolean;
        };
        Insert: never;
        Update: Partial<{
          business: string;
          legal_name: string;
          nif: string;
          address: string;
          iban: string;
          kind: 'autonomo' | 'sociedad';
          new_autonomo: boolean;
          irpf_mode: 'empresas' | 'particulares' | 'mixto';
          iva: number;
          irpf: number;
          pay_days: number;
          rate: number;
          extra_round: number;
          capacity: number;
          disciplines: string[];
          pay_online: Json;
          onboarded: boolean;
        }>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_member: { Args: { ws: string }; Returns: boolean };
      is_admin: { Args: Record<string, never>; Returns: boolean };
      accept_privacy: { Args: Record<string, never>; Returns: undefined };
      admin_list_accounts: {
        Args: Record<string, never>;
        Returns: {
          id: string;
          full_name: string;
          email: string;
          status: 'pendiente' | 'aprobado' | 'rechazado';
          created_at: string;
          privacy_accepted_at: string | null;
          email_confirmed_at: string | null;
        }[];
      };
      admin_set_status: { Args: { target: string; new_status: string }; Returns: undefined };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
