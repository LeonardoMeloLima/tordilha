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
          arquivado: boolean | null
          ativo: boolean | null
          atualizado_em: string | null
          autoriza_imagem: boolean | null
          avatar_url: string | null
          contato_emergencia: string | null
          criado_em: string | null
          data_autorizacao_imagem: string | null
          data_nascimento: string | null
          diagnostico: string | null
          id: string
          idade: number | null
          lgpd_assinado: boolean | null
          nome: string
          patrocinador: string | null
          professor_id: string | null
          status: string
        }
        Insert: {
          arquivado?: boolean | null
          ativo?: boolean | null
          atualizado_em?: string | null
          autoriza_imagem?: boolean | null
          avatar_url?: string | null
          contato_emergencia?: string | null
          criado_em?: string | null
          data_autorizacao_imagem?: string | null
          data_nascimento?: string | null
          diagnostico?: string | null
          id?: string
          idade?: number | null
          lgpd_assinado?: boolean | null
          nome: string
          patrocinador?: string | null
          professor_id?: string | null
          status?: string
        }
        Update: {
          arquivado?: boolean | null
          ativo?: boolean | null
          atualizado_em?: string | null
          autoriza_imagem?: boolean | null
          avatar_url?: string | null
          contato_emergencia?: string | null
          criado_em?: string | null
          data_autorizacao_imagem?: string | null
          data_nascimento?: string | null
          diagnostico?: string | null
          id?: string
          idade?: number | null
          lgpd_assinado?: boolean | null
          nome?: string
          patrocinador?: string | null
          professor_id?: string | null
          status?: string
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
          target_role: string | null
          target_user_id: string | null
          tipo: string
          titulo: string
        }
        Insert: {
          atualizado_em?: string | null
          criado_em?: string | null
          data?: string
          id?: string
          mensagem: string
          target_role?: string | null
          target_user_id?: string | null
          tipo: string
          titulo: string
        }
        Update: {
          atualizado_em?: string | null
          criado_em?: string | null
          data?: string
          id?: string
          mensagem?: string
          target_role?: string | null
          target_user_id?: string | null
          tipo?: string
          titulo?: string
        }
        Relationships: []
      }
      cavalos: {
        Row: {
          altura: number | null
          ano_nascimento: number | null
          atualizado_em: string | null
          avaliacao_comportamento: Json | null
          avaliacao_marcha: Json | null
          avaliacao_veterinaria: Json | null
          castrado: boolean | null
          comentario: string | null
          cor: string | null
          criado_em: string | null
          data_avaliacao: string | null
          foto_url: string | null
          humor: string | null
          id: string
          movimento_3d_predominante: string | null
          nome: string
          pelagem: string | null
          peso: number | null
          raca: string | null
          sexo: string | null
          status: string | null
        }
        Insert: {
          altura?: number | null
          ano_nascimento?: number | null
          atualizado_em?: string | null
          avaliacao_comportamento?: Json | null
          avaliacao_marcha?: Json | null
          avaliacao_veterinaria?: Json | null
          castrado?: boolean | null
          comentario?: string | null
          cor?: string | null
          criado_em?: string | null
          data_avaliacao?: string | null
          foto_url?: string | null
          humor?: string | null
          id?: string
          movimento_3d_predominante?: string | null
          nome: string
          pelagem?: string | null
          peso?: number | null
          raca?: string | null
          sexo?: string | null
          status?: string | null
        }
        Update: {
          altura?: number | null
          ano_nascimento?: number | null
          atualizado_em?: string | null
          avaliacao_comportamento?: Json | null
          avaliacao_marcha?: Json | null
          avaliacao_veterinaria?: Json | null
          castrado?: boolean | null
          comentario?: string | null
          cor?: string | null
          criado_em?: string | null
          data_avaliacao?: string | null
          foto_url?: string | null
          humor?: string | null
          id?: string
          movimento_3d_predominante?: string | null
          nome?: string
          pelagem?: string | null
          peso?: number | null
          raca?: string | null
          sexo?: string | null
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
          fisico: number | null
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
          fisico?: number | null
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
          fisico?: number | null
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
      feedbacks: {
        Row: {
          categoria: string
          created_at: string
          id: string
          lida: boolean
          mensagem: string
          responsavel_id: string
          responsavel_nome: string
        }
        Insert: {
          categoria: string
          created_at?: string
          id?: string
          lida?: boolean
          mensagem: string
          responsavel_id: string
          responsavel_nome: string
        }
        Update: {
          categoria?: string
          created_at?: string
          id?: string
          lida?: boolean
          mensagem?: string
          responsavel_id?: string
          responsavel_nome?: string
        }
        Relationships: []
      }
      fichas_atendimento: {
        Row: {
          aluno_id: string | null
          atualizado_em: string | null
          cavalo_id: string | null
          criado_em: string | null
          encilhamento: string | null
          equipe: string | null
          id: string
          objetivo_t1: string | null
          objetivo_t2: string | null
          objetivo_t3: string | null
          objetivo_t4: string | null
        }
        Insert: {
          aluno_id?: string | null
          atualizado_em?: string | null
          cavalo_id?: string | null
          criado_em?: string | null
          encilhamento?: string | null
          equipe?: string | null
          id?: string
          objetivo_t1?: string | null
          objetivo_t2?: string | null
          objetivo_t3?: string | null
          objetivo_t4?: string | null
        }
        Update: {
          aluno_id?: string | null
          atualizado_em?: string | null
          cavalo_id?: string | null
          criado_em?: string | null
          encilhamento?: string | null
          equipe?: string | null
          id?: string
          objetivo_t1?: string | null
          objetivo_t2?: string | null
          objetivo_t3?: string | null
          objetivo_t4?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fichas_atendimento_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: true
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fichas_atendimento_cavalo_id_fkey"
            columns: ["cavalo_id"]
            isOneToOne: false
            referencedRelation: "cavalos"
            referencedColumns: ["id"]
          },
        ]
      }
      mural_comentarios: {
        Row: {
          conteudo: string
          criado_em: string | null
          id: string
          post_id: string
          user_id: string | null
        }
        Insert: {
          conteudo: string
          criado_em?: string | null
          id?: string
          post_id: string
          user_id?: string | null
        }
        Update: {
          conteudo?: string
          criado_em?: string | null
          id?: string
          post_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mural_comentarios_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "mural_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      mural_likes: {
        Row: {
          criado_em: string | null
          id: string
          post_id: string
          user_id: string | null
        }
        Insert: {
          criado_em?: string | null
          id?: string
          post_id: string
          user_id?: string | null
        }
        Update: {
          criado_em?: string | null
          id?: string
          post_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mural_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "mural_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      mural_posts: {
        Row: {
          aluno_id: string | null
          atualizado_em: string | null
          badge: string | null
          criado_em: string | null
          data: string
          descricao: string
          id: string
          media_url: string | null
          sessao_id: string | null
          tipo: string
          user_id: string | null
        }
        Insert: {
          aluno_id?: string | null
          atualizado_em?: string | null
          badge?: string | null
          criado_em?: string | null
          data?: string
          descricao: string
          id?: string
          media_url?: string | null
          sessao_id?: string | null
          tipo: string
          user_id?: string | null
        }
        Update: {
          aluno_id?: string | null
          atualizado_em?: string | null
          badge?: string | null
          criado_em?: string | null
          data?: string
          descricao?: string
          id?: string
          media_url?: string | null
          sessao_id?: string | null
          tipo?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mural_posts_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mural_posts_sessao_id_fkey"
            columns: ["sessao_id"]
            isOneToOne: false
            referencedRelation: "sessoes"
            referencedColumns: ["id"]
          },
        ]
      }
      notificacoes: {
        Row: {
          criado_em: string | null
          id: string
          lida: boolean | null
          link: string | null
          mensagem: string
          target_role: string | null
          tipo: string | null
          titulo: string
          user_id: string
        }
        Insert: {
          criado_em?: string | null
          id?: string
          lida?: boolean | null
          link?: string | null
          mensagem: string
          target_role?: string | null
          tipo?: string | null
          titulo: string
          user_id: string
        }
        Update: {
          criado_em?: string | null
          id?: string
          lida?: boolean | null
          link?: string | null
          mensagem?: string
          target_role?: string | null
          tipo?: string | null
          titulo?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          aluno_diagnosticos: string | null
          aluno_idades: string | null
          aluno_nomes: string | null
          avatar_url: string | null
          email: string | null
          full_name: string | null
          id: string
          lgpd_assinado: boolean | null
          needs_password_reset: boolean | null
          nome_completo_responsavel: string | null
          patrocinador: string | null
          role: string | null
          telefone: string | null
          updated_at: string | null
        }
        Insert: {
          aluno_diagnosticos?: string | null
          aluno_idades?: string | null
          aluno_nomes?: string | null
          avatar_url?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          lgpd_assinado?: boolean | null
          needs_password_reset?: boolean | null
          nome_completo_responsavel?: string | null
          patrocinador?: string | null
          role?: string | null
          telefone?: string | null
          updated_at?: string | null
        }
        Update: {
          aluno_diagnosticos?: string | null
          aluno_idades?: string | null
          aluno_nomes?: string | null
          avatar_url?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          lgpd_assinado?: boolean | null
          needs_password_reset?: boolean | null
          nome_completo_responsavel?: string | null
          patrocinador?: string | null
          role?: string | null
          telefone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      propostas_horario: {
        Row: {
          aluno_id: string
          cavalo_id: string | null
          criado_em: string | null
          dia_semana: number
          expires_at: string
          horario: string
          id: string
          status: string | null
          terapeuta_id: string
        }
        Insert: {
          aluno_id: string
          cavalo_id?: string | null
          criado_em?: string | null
          dia_semana: number
          expires_at?: string
          horario: string
          id?: string
          status?: string | null
          terapeuta_id: string
        }
        Update: {
          aluno_id?: string
          cavalo_id?: string | null
          criado_em?: string | null
          dia_semana?: number
          expires_at?: string
          horario?: string
          id?: string
          status?: string | null
          terapeuta_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "propostas_horario_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "propostas_horario_cavalo_id_fkey"
            columns: ["cavalo_id"]
            isOneToOne: false
            referencedRelation: "cavalos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "propostas_horario_terapeuta_id_fkey"
            columns: ["terapeuta_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      responsaveis: {
        Row: {
          atualizado_em: string | null
          cidade: string | null
          cpf: string | null
          criado_em: string | null
          email: string | null
          endereco: string | null
          estado: string | null
          id: string
          nome: string
          rg: string | null
          status: string
          telefone: string | null
        }
        Insert: {
          atualizado_em?: string | null
          cidade?: string | null
          cpf?: string | null
          criado_em?: string | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          nome: string
          rg?: string | null
          status?: string
          telefone?: string | null
        }
        Update: {
          atualizado_em?: string | null
          cidade?: string | null
          cpf?: string | null
          criado_em?: string | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          nome?: string
          rg?: string | null
          status?: string
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
          recorrente_id: string | null
          status: string | null
          tipo: string | null
          visitante_nome: string | null
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
          recorrente_id?: string | null
          status?: string | null
          tipo?: string | null
          visitante_nome?: string | null
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
          recorrente_id?: string | null
          status?: string | null
          tipo?: string | null
          visitante_nome?: string | null
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
          {
            foreignKeyName: "sessoes_recorrente_id_fkey"
            columns: ["recorrente_id"]
            isOneToOne: false
            referencedRelation: "sessoes_recorrentes"
            referencedColumns: ["id"]
          },
        ]
      }
      sessoes_recorrentes: {
        Row: {
          aluno_id: string | null
          ativo: boolean | null
          atualizado_em: string | null
          cavalo_id: string | null
          criado_em: string | null
          dia_semana: number
          horario: string
          id: string
          professor_id: string | null
        }
        Insert: {
          aluno_id?: string | null
          ativo?: boolean | null
          atualizado_em?: string | null
          cavalo_id?: string | null
          criado_em?: string | null
          dia_semana: number
          horario: string
          id?: string
          professor_id?: string | null
        }
        Update: {
          aluno_id?: string | null
          ativo?: boolean | null
          atualizado_em?: string | null
          cavalo_id?: string | null
          criado_em?: string | null
          dia_semana?: number
          horario?: string
          id?: string
          professor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sessoes_recorrentes_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessoes_recorrentes_cavalo_id_fkey"
            columns: ["cavalo_id"]
            isOneToOne: false
            referencedRelation: "cavalos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessoes_recorrentes_professor_id_fkey"
            columns: ["professor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      solicitacoes: {
        Row: {
          aluno_id: string
          alvo_id: string | null
          atualizado_em: string
          criado_em: string
          decidido_em: string | null
          decidido_por: string | null
          id: string
          motivo_rejeicao: string | null
          payload: Json
          solicitante_id: string
          status: string
          tipo: string
        }
        Insert: {
          aluno_id: string
          alvo_id?: string | null
          atualizado_em?: string
          criado_em?: string
          decidido_em?: string | null
          decidido_por?: string | null
          id?: string
          motivo_rejeicao?: string | null
          payload?: Json
          solicitante_id: string
          status?: string
          tipo: string
        }
        Update: {
          aluno_id?: string
          alvo_id?: string | null
          atualizado_em?: string
          criado_em?: string
          decidido_em?: string | null
          decidido_por?: string | null
          id?: string
          motivo_rejeicao?: string | null
          payload?: Json
          solicitante_id?: string
          status?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "solicitacoes_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos"
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
      enviar_comunicado: {
        Args: {
          p_mensagem: string
          p_target_role: string
          p_target_user_id?: string
          p_tipo: string
          p_titulo: string
        }
        Returns: undefined
      }
      get_evolucao_clinica_recente: {
        Args: never
        Returns: {
          aluno_id: string
          avatar_url: string
          evolucao_percentual: number
          media_agitacao: number
          media_cognitivo: number
          media_emocional: number
          media_fisico: number
          media_interacao: number
          media_pedagogico: number
          media_social: number
          nome: string
          ultima_sessao_data: string
        }[]
      }
      get_kpi_evolucao_global: { Args: never; Returns: number }
      get_relatorio_professores: {
        Args: never
        Returns: {
          nome_professor: string
          professor_id: string
          total_alunos_unicos: number
          total_sessoes: number
        }[]
      }
      rpc_atualizar_recorrencia: {
        Args: {
          p_dia_semana: number
          p_horario: string
          p_recorrencia_id: string
        }
        Returns: Json
      }
      rpc_decidir_solicitacao: {
        Args: { p_decisao: string; p_motivo?: string; p_solicitacao_id: string }
        Returns: Json
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
