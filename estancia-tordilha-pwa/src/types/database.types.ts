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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      aluno_conquistas: {
        Row: {
          aluno_id: string | null
          conquistado_em: string | null
          descricao: string | null
          id: string
          titulo: string
        }
        Insert: {
          aluno_id?: string | null
          conquistado_em?: string | null
          descricao?: string | null
          id?: string
          titulo: string
        }
        Update: {
          aluno_id?: string | null
          conquistado_em?: string | null
          descricao?: string | null
          id?: string
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "aluno_conquistas_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
        ]
      }
      aluno_responsavel: {
        Row: {
          aluno_id: string
          parentesco: string | null
          responsavel_id: string
        }
        Insert: {
          aluno_id: string
          parentesco?: string | null
          responsavel_id: string
        }
        Update: {
          aluno_id?: string
          parentesco?: string | null
          responsavel_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "aluno_responsavel_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aluno_responsavel_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "responsaveis"
            referencedColumns: ["id"]
          },
        ]
      }
      alunos: {
        Row: {
          arquivado: boolean
          ativo: boolean
          atualizado_em: string | null
          avatar_url: string | null
          contato_emergencia: string | null
          criado_em: string | null
          diagnostico: string | null
          id: string
          idade: number | null
          lgpd_assinado: boolean | null
          nome: string
          professor_id: string | null
        }
        Insert: {
          arquivado?: boolean
          ativo?: boolean
          atualizado_em?: string | null
          avatar_url?: string | null
          contato_emergencia?: string | null
          criado_em?: string | null
          diagnostico?: string | null
          id?: string
          idade?: number | null
          lgpd_assinado?: boolean | null
          nome: string
          professor_id?: string | null
        }
        Update: {
          arquivado?: boolean
          ativo?: boolean
          atualizado_em?: string | null
          avatar_url?: string | null
          contato_emergencia?: string | null
          criado_em?: string | null
          diagnostico?: string | null
          id?: string
          idade?: number | null
          lgpd_assinado?: boolean | null
          nome?: string
          professor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alunos_professor_id_fkey"
            columns: ["professor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      avisos: {
        Row: {
          atualizado_em: string | null
          criado_em: string | null
          data: string
          id: string
          mensagem: string
          tipo: string
          titulo: string
        }
        Insert: {
          atualizado_em?: string | null
          criado_em?: string | null
          data?: string
          id?: string
          mensagem: string
          tipo: string
          titulo: string
        }
        Update: {
          atualizado_em?: string | null
          criado_em?: string | null
          data?: string
          id?: string
          mensagem?: string
          tipo?: string
          titulo?: string
        }
        Relationships: []
      }
      cavalos: {
        Row: {
          atualizado_em: string | null
          cor: string | null
          criado_em: string | null
          foto_url: string | null
          id: string
          nome: string
          raca: string | null
          status: string | null
        }
        Insert: {
          atualizado_em?: string | null
          cor?: string | null
          criado_em?: string | null
          foto_url?: string | null
          id?: string
          nome: string
          raca?: string | null
          status?: string | null
        }
        Update: {
          atualizado_em?: string | null
          cor?: string | null
          criado_em?: string | null
          foto_url?: string | null
          id?: string
          nome?: string
          raca?: string | null
          status?: string | null
        }
        Relationships: []
      }
      evolucao_sessoes: {
        Row: {
          agitacao: number | null
          atualizado_em: string | null
          cognitivo: number | null
          comportamento_escala: number | null
          criado_em: string | null
          emocional: number | null
          fotos_urls: string[] | null
          id: string
          interacao: number | null
          interacao_escala: number | null
          observacoes: string | null
          pedagogico: number | null
          sessao_id: string
          social: number | null
        }
        Insert: {
          agitacao?: number | null
          atualizado_em?: string | null
          cognitivo?: number | null
          comportamento_escala?: number | null
          criado_em?: string | null
          emocional?: number | null
          fotos_urls?: string[] | null
          id?: string
          interacao?: number | null
          interacao_escala?: number | null
          observacoes?: string | null
          pedagogico?: number | null
          sessao_id: string
          social?: number | null
        }
        Update: {
          agitacao?: number | null
          atualizado_em?: string | null
          cognitivo?: number | null
          comportamento_escala?: number | null
          criado_em?: string | null
          emocional?: number | null
          fotos_urls?: string[] | null
          id?: string
          interacao?: number | null
          interacao_escala?: number | null
          observacoes?: string | null
          pedagogico?: number | null
          sessao_id?: string
          social?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "evolucao_sessoes_sessao_id_fkey"
            columns: ["sessao_id"]
            isOneToOne: false
            referencedRelation: "sessoes"
            referencedColumns: ["id"]
          },
        ]
      }
      mural_posts: {
        Row: {
          atualizado_em: string | null
          badge: string | null
          criado_em: string | null
          data: string
          descricao: string
          id: string
          media_url: string | null
          tipo: string
        }
        Insert: {
          atualizado_em?: string | null
          badge?: string | null
          criado_em?: string | null
          data?: string
          descricao: string
          id?: string
          media_url?: string | null
          tipo: string
        }
        Update: {
          atualizado_em?: string | null
          badge?: string | null
          criado_em?: string | null
          data?: string
          descricao?: string
          id?: string
          media_url?: string | null
          tipo?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          full_name: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          full_name?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      responsaveis: {
        Row: {
          atualizado_em: string | null
          cpf: string | null
          criado_em: string | null
          email: string | null
          id: string
          nome: string
          telefone: string | null
        }
        Insert: {
          atualizado_em?: string | null
          cpf?: string | null
          criado_em?: string | null
          email?: string | null
          id?: string
          nome: string
          telefone?: string | null
        }
        Update: {
          atualizado_em?: string | null
          cpf?: string | null
          criado_em?: string | null
          email?: string | null
          id?: string
          nome?: string
          telefone?: string | null
        }
        Relationships: []
      }
      sessoes: {
        Row: {
          aluno_id: string | null
          atualizado_em: string | null
          cavalo_id: string | null
          criado_em: string | null
          data_hora: string
          id: string
          notas: string | null
          professor_id: string | null
          status: string | null
        }
        Insert: {
          aluno_id?: string | null
          atualizado_em?: string | null
          cavalo_id?: string | null
          criado_em?: string | null
          data_hora: string
          id?: string
          notas?: string | null
          professor_id?: string | null
          status?: string | null
        }
        Update: {
          aluno_id?: string | null
          atualizado_em?: string | null
          cavalo_id?: string | null
          criado_em?: string | null
          data_hora?: string
          id?: string
          notas?: string | null
          professor_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sessoes_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessoes_cavalo_id_fkey"
            columns: ["cavalo_id"]
            isOneToOne: false
            referencedRelation: "cavalos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessoes_professor_id_fkey"
            columns: ["professor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_evolucao_clinica_recente: {
        Args: Record<PropertyKey, never>
        Returns: {
          aluno_id: string
          nome: string
          avatar_url: string | null
          ultima_sessao_data: string
          evolucao_percentual: number
          media_cognitivo: number
          media_pedagogico: number
          media_social: number
          media_emocional: number
          media_agitacao: number
          media_interacao: number
        }[]
      }
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
