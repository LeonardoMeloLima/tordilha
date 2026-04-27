import { AvatarWithFallback } from "@/components/ui/AvatarWithFallback";
import { useState, useEffect, useMemo } from "react";

import { useAlunos } from "@/hooks/useAlunos";
import { supabase } from "@/lib/supabase";
import { Search, Brain, Shield, ShieldOff } from "lucide-react";
import { FichaAtendimentoModal } from "./FichaAtendimentoModal";

export const ProfessorAlunos = () => {
  const { alunos: todosAlunos, isLoading } = useAlunos();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [selectedAluno, setSelectedAluno] = useState<any>(null);
  const [isFichaOpen, setIsFichaOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [visibleCount, setVisibleCount] = useState(10);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setCurrentUserId(user?.id ?? null));
  }, []);

  const alunos = useMemo(
    () => todosAlunos.filter(a => a.professor_id === currentUserId),
    [todosAlunos, currentUserId]
  );

  const filteredAlunos = alunos.filter(a =>
    a.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const displayedAlunos = filteredAlunos.slice(0, visibleCount);

  return (
    <div className="space-y-6 animate-fade-in pb-24">
      <div>
        <h1 className="text-xl font-extrabold text-foreground tracking-tight">Meus Praticantes</h1>
        <p className="text-sm text-muted-foreground font-medium mt-0.5">{alunos.length} praticantes cadastrados</p>
      </div>

      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#4E593F] transition-colors" size={20} />
        <input
          type="text"
          placeholder="Buscar praticante..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full h-14 pl-12 pr-4 rounded-[20px] bg-white border-2 border-slate-50 focus:border-[#4E593F] focus:bg-white outline-none transition-all card-shadow text-sm font-medium"
        />
      </div>

      <div className="space-y-3">
        {isLoading ? (
          [1, 2, 3].map(i => (
            <div key={i} className="bg-card rounded-3xl card-shadow p-5 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-slate-100" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-100 rounded w-1/2" />
                  <div className="h-3 bg-slate-100 rounded w-1/3" />
                </div>
              </div>
            </div>
          ))
        ) : displayedAlunos.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-[32px] border-2 border-dashed border-slate-100">
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Nenhum praticante encontrado</p>
          </div>
        ) : (
          displayedAlunos.map((a) => (
            <div
              key={a.id}
              onClick={() => {
                setSelectedAluno(a);
                setIsFichaOpen(true);
              }}
              className={`w-full text-left bg-card rounded-3xl card-shadow p-5 cursor-pointer active:scale-[0.98] transition-all ${a.ativo === false ? "opacity-50" : ""}`}
            >
              {/* Header row: avatar + info + status badge */}
              <div className="flex items-center gap-4">
                <AvatarWithFallback
                  src={a.avatar_url}
                  className="w-14 h-14 rounded-2xl"
                  type="user"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-base font-bold text-slate-900">{a.nome}</p>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    {a.diagnostico || "Avaliação"} · {a.idade ? `${a.idade} anos` : "Idade não informada"}
                  </p>
                </div>
                {/* Status + LGPD indicators */}
                <div className="flex items-center gap-2 shrink-0">
                  {a.lgpd_assinado
                    ? <Shield size={14} className="text-primary" />
                    : <ShieldOff size={14} className="text-destructive/50" />
                  }
                  <span className={`px-3 py-1 text-[11px] font-extrabold rounded-full tracking-wide ${a.ativo === false
                    ? "bg-slate-100 text-slate-400 border border-slate-200"
                    : "bg-[#4E593F] text-white"
                    }`}>
                    {a.ativo === false ? "INATIVO" : "ATIVO"}
                  </span>
                </div>
              </div>

              {/* Emergency contact strip */}
              {/* Clinical Info strip for Professor */}
              <div className="mt-4 flex items-center justify-between p-3.5 rounded-2xl bg-[#F8F9FA]">
                <div className="flex items-center gap-3">
                  <Brain size={14} className="text-[#4E593F]" />
                  <span className="text-xs font-bold text-[#4E593F] truncate max-w-[180px]">
                    {a.diagnostico || "Avaliação Clínica"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest bg-slate-200/50 px-2 py-1 rounded-lg">
                    {a.idade ? `${a.idade} anos` : "N/A"}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {filteredAlunos.length > visibleCount && (
        <div className="flex justify-center pt-4">
          <button
            onClick={() => setVisibleCount(prev => prev + 10)}
            className="px-8 h-12 bg-white border-2 border-slate-100 text-[#4E593F] text-sm font-bold rounded-2xl card-shadow active:scale-95 transition-all"
          >
            Carregar mais alunos
          </button>
        </div>
      )}

      {/* Modal de Ficha de Atendimento */}
      <FichaAtendimentoModal 
        isOpen={isFichaOpen}
        onClose={() => setIsFichaOpen(false)}
        aluno={selectedAluno}
      />
    </div>
  );
};
