import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface ResponsavelLink {
  id: string;
  nome: string;
  email: string;
  rg: string | null;
  cpf: string | null;
  endereco: string | null;
  cidade: string | null;
  estado: string | null;
  telefone: string | null;
  parentesco: string;
}

export function useAlunosResponsaveis(alunoId: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["aluno-responsaveis", alunoId],
    queryFn: async () => {
      if (!alunoId) return [];

      const { data, error } = await supabase
        .from("aluno_responsavel")
        .select(`
          parentesco,
          responsaveis (
            id,
            nome,
            email,
            rg,
            cpf,
            endereco,
            cidade,
            estado,
            telefone
          )
        `)
        .eq("aluno_id", alunoId);

      if (error) throw error;

      return (data as any[]).map((item) => ({
        id: item.responsaveis.id,
        nome: item.responsaveis.nome,
        email: item.responsaveis.email,
        rg: item.responsaveis.rg,
        cpf: item.responsaveis.cpf,
        endereco: item.responsaveis.endereco,
        cidade: item.responsaveis.cidade,
        estado: item.responsaveis.estado,
        telefone: item.responsaveis.telefone,
        parentesco: item.parentesco,
      })) as ResponsavelLink[];
    },
    enabled: !!alunoId,
  });

  const linkResponsavel = useMutation({
    mutationFn: async ({ 
      email, 
      nome, 
      parentesco,
      rg,
      cpf,
      endereco,
      cidade,
      estado
    }: { 
      email: string; 
      nome: string; 
      parentesco: string;
      rg?: string;
      cpf?: string;
      endereco?: string;
      cidade?: string;
      estado?: string;
    }) => {
      if (!alunoId) throw new Error("ID do aluno não informado");

      // 1. Get or create responsible
      let { data: resp } = await supabase
        .from("responsaveis")
        .select("id")
        .eq("email", email)
        .maybeSingle();

      let respId = resp?.id;

      if (!respId) {
        const { data: newResp, error: createError } = await supabase
          .from("responsaveis")
          .insert({ 
            nome, 
            email,
            rg,
            cpf,
            endereco,
            cidade,
            estado
          })
          .select("id")
          .single();

        if (createError) throw createError;
        respId = newResp.id;
      } else {
        // Update existing responsible with missing data
        const { error: updateError } = await supabase
          .from("responsaveis")
          .update({
            nome, // Case they want to update name
            rg: rg || undefined,
            cpf: cpf || undefined,
            endereco: endereco || undefined,
            cidade: cidade || undefined,
            estado: estado || undefined
          })
          .eq("id", respId);
        
        if (updateError) throw updateError;
      }

      // 2. Link them (using upsert to update parentesco if already linked)
      const { error: linkError } = await supabase
        .from("aluno_responsavel")
        .upsert({
          aluno_id: alunoId,
          responsavel_id: respId,
          parentesco
        }, {
          onConflict: 'aluno_id,responsavel_id'
        });

      if (linkError) throw linkError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aluno-responsaveis", alunoId] });
    },
  });

  const unlinkResponsavel = useMutation({
    mutationFn: async (responsavelId: string) => {
      if (!alunoId) throw new Error("ID do aluno não informado");

      const { error } = await supabase
        .from("aluno_responsavel")
        .delete()
        .eq("aluno_id", alunoId)
        .eq("responsavel_id", responsavelId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aluno-responsaveis", alunoId] });
    },
  });

  return {
    responsaveis: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    linkResponsavel,
    unlinkResponsavel,
  };
}
