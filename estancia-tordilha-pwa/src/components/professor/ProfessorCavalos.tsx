import { useState } from "react";
import { useCavalos } from "@/hooks/useCavalos";
import { AvatarWithFallback } from "@/components/ui/AvatarWithFallback";
import { ChevronRight, Info, Activity, ShieldAlert, HeartPulse, Calendar } from "lucide-react";
import { ActionSheet } from "../ui/ActionSheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const ProfessorCavalos = () => {
  const { cavalos, isLoading } = useCavalos();
  const [showDetails, setShowDetails] = useState(false);
  const [selected, setSelected] = useState<any>(null);

  const openDetails = (c: any) => {
    setSelected(c);
    setShowDetails(true);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-24">
      <div>
        <h1 className="text-xl font-extrabold text-foreground tracking-tight">Cavalos</h1>
        <p className="text-sm text-muted-foreground font-medium mt-0.5">{cavalos.length} cavalos disponíveis</p>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          [1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-4 p-5 bg-card rounded-3xl card-shadow animate-pulse">
              <div className="w-14 h-14 rounded-2xl bg-slate-100" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-slate-100 rounded w-1/3" />
                <div className="h-3 bg-slate-100 rounded w-1/2" />
              </div>
            </div>
          ))
        ) : cavalos.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-[32px] border-2 border-dashed border-slate-100">
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Nenhum cavalo cadastrado</p>
          </div>
        ) : (
          cavalos.map((c) => (
            <button 
              key={c.id} 
              onClick={() => openDetails(c)}
              className="w-full flex items-center gap-4 p-5 bg-card rounded-3xl card-shadow transition-all active:scale-[0.98] text-left"
            >
              <AvatarWithFallback
                src={c.foto_url}
                className="w-14 h-14 rounded-2xl"
                type="horse"
              />
              <div className="flex-1">
                <p className="text-base font-bold text-slate-900">{c.nome}</p>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  {c.raca || "Raça não informada"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 text-[11px] font-extrabold uppercase rounded-full tracking-wide ${c.status === "Ativo" ? "bg-[#4E593F] text-white" : "bg-[#DDE2D6] text-[#3E4732] border border-[#8C9A7A]"}`}>
                  {c.status}
                </span>
                <ChevronRight size={18} className="text-muted-foreground" />
              </div>
            </button>
          ))
        )}
      </div>

      {/* Horse Detail View (Read-Only) */}
      <ActionSheet
        isOpen={showDetails}
        onClose={() => setShowDetails(false)}
        title="Detalhes do Cavalo"
        subtitle={selected ? `Informações técnicas de ${selected.nome}` : "Carregando..."}
      >
        {selected && (
          <Tabs defaultValue="geral" className="w-full">
            <TabsList className="grid grid-cols-3 mb-6 bg-slate-100 p-1 rounded-2xl">
              <TabsTrigger value="geral" className="rounded-xl flex items-center gap-2 text-xs font-bold">
                <Info size={14} /> Geral
              </TabsTrigger>
              <TabsTrigger value="tecnica" className="rounded-xl flex items-center gap-2 text-xs font-bold">
                <Activity size={14} /> Técnica
              </TabsTrigger>
              <TabsTrigger value="comportamento" className="rounded-xl flex items-center gap-2 text-xs font-bold">
                <ShieldAlert size={14} /> Reações
              </TabsTrigger>
            </TabsList>

            <TabsContent value="geral" className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
              <div className="aspect-video w-full rounded-2xl overflow-hidden bg-slate-100 flex items-center justify-center border border-slate-200">
                {selected.foto_url ? (
                  <img src={selected.foto_url} alt={selected.nome} className="w-full h-full object-cover" />
                ) : (
                  <HeartPulse size={40} className="text-slate-200" />
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <span className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Raça</span>
                  <p className="text-sm font-bold text-slate-800 mt-1">{selected.raca || "N/A"}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <span className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Pelagem</span>
                  <p className="text-sm font-bold text-slate-800 mt-1">{selected.pelagem || selected.cor || "N/A"}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <span className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Idade (Nasc.)</span>
                  <p className="text-sm font-bold text-slate-800 mt-1">{selected.ano_nascimento || "N/A"}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <span className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Sexo</span>
                  <p className="text-sm font-bold text-slate-800 mt-1">{selected.sexo || "N/A"}</p>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex justify-between items-center">
                <span className="text-xs font-bold text-slate-500 uppercase">Status Global</span>
                <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${selected.status === 'Ativo' ? 'bg-[#4E593F] text-white' : 'bg-slate-200 text-slate-600'}`}>
                  {selected.status}
                </span>
              </div>
            </TabsContent>

            <TabsContent value="tecnica" className="space-y-5 animate-in fade-in slide-in-from-bottom-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <span className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Altura</span>
                  <p className="text-sm font-bold text-slate-800 mt-1">{selected.altura ? `${selected.altura}m` : "N/A"}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <span className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Peso</span>
                  <p className="text-sm font-bold text-slate-800 mt-1">{selected.peso ? `${selected.peso}kg` : "N/A"}</p>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest">Marcha</h3>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
                    <Calendar size={12} /> {selected.data_avaliacao || "S/ Data"}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-y-4">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Qualidade</span>
                    <p className="text-xs font-bold text-slate-700">{selected.avaliacao_marcha?.qualidade || "N/A"}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Comprimento</span>
                    <p className="text-xs font-bold text-slate-700">{selected.avaliacao_marcha?.comprimento || "N/A"}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Passos/min</span>
                    <p className="text-xs font-bold text-slate-700">{selected.avaliacao_marcha?.velocidade || "N/A"}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Passos (10m)</span>
                    <p className="text-xs font-bold text-slate-700">{selected.avaliacao_marcha?.frequencia_10m || "N/A"}</p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <span className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Movimento 3D</span>
                <p className="text-xs font-medium text-slate-700 mt-2 leading-relaxed">
                  {selected.movimento_3d_predominante || "Sem descrição técnica do movimento."}
                </p>
              </div>
            </TabsContent>

            <TabsContent value="comportamento" className="space-y-5 animate-in fade-in slide-in-from-bottom-2 pb-10">
              <div className="space-y-2">
                {[
                  { key: "animais", label: "Outros Animais" },
                  { key: "materiais", label: "Materiais" },
                  { key: "montar_descer", label: "Montar/Descer" },
                  { key: "movimento_cavaleiro", label: "Mov. Cavaleiro" },
                  { key: "conducao_guia", label: "Guia" },
                  { key: "manejo", label: "Manejo" },
                  { key: "ambiente_externo", label: "Ambiente Ext." },
                ].map((item) => (
                  <div key={item.key} className="flex justify-between items-center p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">{item.label}</span>
                    <span className="text-xs font-bold text-slate-800">{(selected.avaliacao_comportamento as any)?.[item.key] || "—"}</span>
                  </div>
                ))}
              </div>

              <div className="bg-[#F1F3EF] p-4 rounded-2xl border border-[#8C9A7A]/20 space-y-3">
                <h3 className="text-xs font-black text-[#4E593F] uppercase flex items-center gap-2">
                  <HeartPulse size={14} /> Veterinário
                </h3>
                <div className="space-y-2">
                  <div className="bg-white/50 p-3 rounded-lg border border-[#8C9A7A]/20">
                    <span className="text-[9px] font-bold text-[#4E593F]/60 uppercase">Indicações</span>
                    <p className="text-xs text-[#4E593F] mt-1">{selected.avaliacao_veterinaria?.indicacoes || "Nenhuma indicação registrada."}</p>
                  </div>
                  <div className="bg-white/50 p-3 rounded-lg border border-rose-200/50">
                    <span className="text-[9px] font-bold text-rose-600 uppercase">Contra-indicações</span>
                    <p className="text-xs text-rose-900 mt-1">{selected.avaliacao_veterinaria?.contra_indicacoes || "Nenhuma contra-indicação registrada."}</p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Humor</span>
                  <span className="px-3 py-1 bg-white border border-slate-200 rounded-full text-[10px] font-bold text-slate-600">
                    {selected.humor || "Dócil"}
                  </span>
                </div>
                <p className="text-xs font-medium text-slate-700 mt-2 leading-relaxed italic">
                  "{selected.comentario || "Sem observações adicionais."}"
                </p>
              </div>
            </TabsContent>
          </Tabs>
        )}
        <div className="h-10" />
      </ActionSheet>
    </div>
  );
};

export default ProfessorCavalos;
