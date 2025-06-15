/* eslint-disable @typescript-eslint/no-explicit-any */

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          lastname: string | null;
          firstname: string | null;
          email: string | null;
          elevenlabs_agent_api_id: string | null;
          picture_url: string | null;
          credits: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          lastname?: string | null;
          firstname?: string | null;
          email?: string | null;
          elevenlabs_agent_api_id?: string | null;
          picture_url?: string | null;
          credits?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          lastname?: string | null;
          firstname?: string | null;
          email?: string | null;
          elevenlabs_agent_api_id?: string | null;
          picture_url?: string | null;
          credits?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      products: {
        Row: {
          id: string;
          name: string;
          pitch: string | null;
          price: number | null;
          marche: string | null;
          principales_objections_attendues: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          pitch?: string | null;
          price?: number | null;
          marche?: string | null;
          principales_objections_attendues?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          pitch?: string | null;
          price?: number | null;
          marche?: string | null;
          principales_objections_attendues?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      agents: {
        Row: {
          id: string;
          product_id: string | null;
          difficulty: string | null;
          job_title: string | null;
          personnality: {
            attitude: string;
            verbalisation: string;
            écoute: string;
            présence: string;
            prise_de_décision: string;
          } | null;
          picture_url: string | null;
          voice_id: string | null;
          name: string | null;
          firstname: string | null;
          lastname: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          product_id?: string | null;
          difficulty?: string | null;
          job_title?: string | null;
          personnality?: {
            attitude: string;
            verbalisation: string;
            écoute: string;
            présence: string;
            prise_de_décision: string;
          } | null;
          picture_url?: string | null;
          voice_id?: string | null;
          name?: string | null;
          firstname?: string | null;
          lastname?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string | null;
          difficulty?: string | null;
          job_title?: string | null;
          personnality?: {
            attitude: string;
            verbalisation: string;
            écoute: string;
            présence: string;
            prise_de_décision: string;
          } | null;
          picture_url?: string | null;
          voice_id?: string | null;
          name?: string | null;
          firstname?: string | null;
          lastname?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      conversations: {
        Row: {
          id: string;
          user_id: string;
          agent_id: string | null;
          transcript: any | null;
          goal: string | null;
          feedback_id: string | null;
          context: {
            secteur: string;
            company: string;
            historique_relation: string;
          } | null;
          call_type: string | null;
          duration_seconds: number;
          elevenlabs_conversation_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          agent_id?: string | null;
          transcript?: any | null;
          goal?: string | null;
          feedback_id?: string | null;
          context?: {
            secteur: string;
            company: string;
            historique_relation: string;
          } | null;
          call_type?: string | null;
          duration_seconds?: number;
          elevenlabs_conversation_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          agent_id?: string | null;
          transcript?: any | null;
          goal?: string | null;
          feedback_id?: string | null;
          context?: {
            secteur: string;
            company: string;
            historique_relation: string;
          } | null;
          call_type?: string | null;
          duration_seconds?: number;
          elevenlabs_conversation_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      feedback: {
        Row: {
          id: string;
          conversation_id: string | null;
          user_id: string | null;
          note: number | null;
          points_forts: string[] | null;
          axes_amelioration: string[] | null;
          moments_cles: string[] | null;
          suggestions: string[] | null;
          analyse_complete: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          conversation_id?: string | null;
          user_id?: string | null;
          note?: number | null;
          points_forts?: string[] | null;
          axes_amelioration?: string[] | null;
          moments_cles?: string[] | null;
          suggestions?: string[] | null;
          analyse_complete?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string | null;
          user_id?: string | null;
          note?: number | null;
          points_forts?: string[] | null;
          axes_amelioration?: string[] | null;
          moments_cles?: string[] | null;
          suggestions?: string[] | null;
          analyse_complete?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
};

// Helper types
export type User = Database["public"]["Tables"]["users"]["Row"];
export type Product = Database["public"]["Tables"]["products"]["Row"];
export type Agent = Database["public"]["Tables"]["agents"]["Row"];
export type Conversation = Database["public"]["Tables"]["conversations"]["Row"];
export type Feedback = Database["public"]["Tables"]["feedback"]["Row"];

export type CallType =
  | "cold_call"
  | "discovery_meeting"
  | "product_demo"
  | "closing_call"
  | "follow_up_call";

export type Difficulty = "facile" | "moyen" | "difficile";

export type HistoriqueRelation =
  | "Premier contact"
  | "2ème appel"
  | "Relance post-devis";
