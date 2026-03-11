import { useAlunos } from "@/hooks/useAlunos";
import { Phone, Search, Shield, ShieldOff, Check } from "lucide-react";
import { ActionSheet } from "../ui/ActionSheet";
import { AvatarWithFallback } from "@/components/ui/AvatarWithFallback";
import { useState } from "react";
import { GraduationCap, Users, Mail } from "lucide-react";
import { useProfessores } from "@/hooks/useProfessores";
import { useAlunosResponsaveis } from "@/hooks/useAlunosResponsaveis";

export const ProfessorAlunos = () => {
  const { alunos, isLoading } = useAlunos();
  const { professores } = useProfessores();
  const [search, setSearch] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const [selectedAluno, setSelectedAluno] = useState<any>(null);

  // For responsible linking (view-only)
  const { responsaveis } = useAlunosResponsaveis(selectedAluno?.id || null);

  const filteredAlunos = alunos.filter(a =>
    a.nome.toLowerCase().includes(search.toLowerCase())
  );

  const openDetails = (aluno: any) => {
    setSelectedAluno(aluno);
    setShowDetails(true);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-24">
      <div>
        <h1 className="text-xl font-extrabold text-foreground tracking-tight">Meus Alunos</h1>
        <p className="text-sm text-muted-foreground font-medium mt-0.5">{alunos.length} alunos cadastrados</p>
      </div>

      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#EAB308] transition-colors" size={20} />
        <input
          type="text"
          placeholder="Buscar aluno..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full h-14 pl-12 pr-4 rounded-[20px] bg-white border-2 border-slate-50 focus:border-[#EAB308] focus:bg-white outline-none transition-all card-shadow text-sm font-medium"
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
        ) : filteredAlunos.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-[32px] border-2 border-dashed border-slate-100">
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Nenhum aluno encontrado</p>
          </div>
        ) : (
          filteredAlunos.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => openDetails(a)}
              className={`w-full text-left bg-card rounded-3xl card-shadow p-5 transition-all active:scale-[0.98] ${a.ativo === false ? "opacity-50" : ""}`}
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
                    : "bg-[#EAB308] text-white"
                    }`}>
                    {a.ativo === false ? "INATIVO" : "ATIVO"}
                  </span>
                </div>
              </div>

              {/* Emergency contact strip */}
              {a.contato_emergencia && (
                <div className="mt-4 flex items-center justify-between p-3.5 rounded-2xl bg-[#F8F9FA]">
                  <div className="flex items-center gap-3">
                    <Phone size={14} className="text-slate-400" />
                    <span className="text-xs font-bold text-slate-600">{a.contato_emergencia}</span>
                  </div>
                  <button type="button" className="text-[10px] font-black uppercase text-[#EAB308] tracking-widest">Ligar Agora</button>
                </div>
              )}
            </button>
          ))
        )}
      </div>

      <ActionSheet
        isOpen={showDetails}
        onClose={() => setShowDetails(false)}
        title="Detalhes do Aluno"
        subtitle={selectedAluno ? `Visualizando dados de ${selectedAluno.nome}` : ""}
      >
        <div className="space-y-5">
          <div className="flex justify-center">
            <AvatarWithFallback
              src={selectedAluno?.avatar_url}
              className="w-24 h-24 rounded-full border-4 border-white shadow-sm"
              type="user"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 ml-1">Nome Completo</label>
            <div className="w-full h-14 px-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 text-base font-medium flex items-center">
              {selectedAluno?.nome}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 ml-1">Idade</label>
              <div className="w-full h-14 px-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 text-base font-medium flex items-center">
                {selectedAluno?.idade || "Não informada"}
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 ml-1">Emergência</label>
              <div className="w-full h-14 px-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 text-base font-medium flex items-center">
                {selectedAluno?.contato_emergencia || "Não informado"}
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 ml-1">Diagnóstico</label>
            <div className="w-full h-14 px-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 text-base font-medium flex items-center">
              {selectedAluno?.diagnostico || "Não informado"}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 ml-1 flex items-center gap-1.5">
              <GraduationCap size={14} className="text-slate-400" />
              Professor Responsável
            </label>
            <div className="w-full h-14 px-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 text-base font-medium flex items-center font-bold">
              {(() => {
                const prof = professores.find(p => p.id === selectedAluno?.professor_id);
                return prof ? prof.full_name : "Nenhum professor vinculado";
              })()}
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
            <div className={`w-5 h-5 rounded border ${selectedAluno?.lgpd_assinado ? "bg-[#EAB308] border-[#EAB308]" : "bg-slate-50 border-slate-300"} flex items-center justify-center`}>
              {selectedAluno?.lgpd_assinado && <Check size={14} className="text-white" strokeWidth={3} />}
            </div>
            <span className="text-sm font-medium text-slate-700">Consentimento LGPD Assinado</span>
          </div>

          {/* Responsáveis Section */}
          <div className="pt-6 border-t border-slate-100 space-y-4">
            <label className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Users size={16} className="text-[#EAB308]" />
              Responsáveis Vinculados
            </label>

            <div className="space-y-2">
              {responsaveis.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  Nenhum responsável vinculado.
                </p>
              ) : (
                responsaveis.map((resp) => (
                  <div key={resp.id} className="flex items-center justify-between p-3 rounded-2xl bg-white border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center">
                        <Mail size={16} className="text-slate-400" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">{resp.nome} <span className="text-[10px] text-[#EAB308] bg-amber-50 px-1.5 py-0.5 rounded-full ml-1">{resp.parentesco}</span></p>
                        <p className="text-[11px] text-slate-500">{resp.email}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Final Spacer with extra height for mobile safe area */}
          <div className="h-32 shrink-0 lg:h-12" />
        </div>
      </ActionSheet>
    </div>
  );
};
