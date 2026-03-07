import { useAlunos } from "@/hooks/useAlunos";
import { Phone, Search, Shield, ShieldOff } from "lucide-react";
import { AvatarWithFallback } from "@/components/ui/AvatarWithFallback";
import { useState } from "react";

export const ProfessorAlunos = () => {
  const { alunos, isLoading } = useAlunos();
  const [search, setSearch] = useState("");

  const filteredAlunos = alunos.filter(a =>
    a.nome.toLowerCase().includes(search.toLowerCase())
  );

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
            <div
              key={a.id}
              className={`bg-card rounded-3xl card-shadow p-5 transition-all active:scale-[0.98] ${a.ativo === false ? "opacity-50" : ""}`}
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
            </div>
          ))
        )}
      </div>
    </div>
  );
};
