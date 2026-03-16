import { useState, useEffect } from "react";
import { ActionSheet } from "../ui/ActionSheet";
import { useFichaAtendimento } from "@/hooks/useFichaAtendimento";
import { useAlunosResponsaveis } from "@/hooks/useAlunosResponsaveis";
import { useCavalos } from "@/hooks/useCavalos";
import { useToast } from "@/components/ui/use-toast";
import { Check, ClipboardList, Loader2 } from "lucide-react";
import { format, parseISO } from "date-fns";

interface FichaAtendimentoModalProps {
  isOpen: boolean;
  onClose: () => void;
  aluno: any;
}

export const FichaAtendimentoModal = ({ isOpen, onClose, aluno }: FichaAtendimentoModalProps) => {
  const { toast } = useToast();
  const { ficha, upsertFicha } = useFichaAtendimento(aluno?.id);
  const { responsaveis } = useAlunosResponsaveis(aluno?.id);
  const { cavalos } = useCavalos();

  const [form, setForm] = useState({
    equipe: "",
    cavalo_id: "",
    encilhamento: "",
    objetivo_t1: "",
    objetivo_t2: "",
    objetivo_t3: "",
    objetivo_t4: "",
  });

  useEffect(() => {
    if (ficha) {
      setForm({
        equipe: ficha.equipe || "",
        cavalo_id: ficha.cavalo_id || "",
        encilhamento: ficha.encilhamento || "",
        objetivo_t1: ficha.objetivo_t1 || "",
        objetivo_t2: ficha.objetivo_t2 || "",
        objetivo_t3: ficha.objetivo_t3 || "",
        objetivo_t4: ficha.objetivo_t4 || "",
      });
    }
  }, [ficha]);

  const handleSave = async () => {
    try {
      await upsertFicha.mutateAsync({
        aluno_id: aluno.id,
        ...form,
      });
      toast({
        title: "Sucesso",
        description: "Ficha de atendimento atualizada!",
      });
      onClose();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao salvar",
        description: error.message,
      });
    }
  };

  const firstResponsavel = responsaveis?.[0];

  return (
    <ActionSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Ficha de Atendimento"
      subtitle="Equoterapia - Planejamento Terapêutico"
      footer={
        <button
          type="button"
          onClick={handleSave}
          disabled={upsertFicha.isPending}
          className="w-full h-14 bg-[#4E593F] hover:bg-[#3E4732] text-white rounded-full font-bold text-lg shadow-lg shadow-[#4E593F]/20 flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-70"
        >
          {upsertFicha.isPending ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Check size={20} strokeWidth={2.5} />
          )}
          Salvar Planejamento
        </button>
      }
    >
      <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-200">
        {/* Dados Automáticos (Equipe para Cima) */}
        <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100 space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Nome</label>
              <p className="text-sm font-bold text-slate-900 ml-1">{aluno?.nome || "-"}</p>
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Data Nasc.</label>
              <p className="text-sm font-bold text-slate-900 ml-1">
                {aluno?.data_nascimento 
                  ? format(parseISO(aluno.data_nascimento), "dd/MM/yyyy")
                  : (aluno?.idade ? `${aluno.idade} anos` : "-")}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-200/50">
            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Responsável</label>
              <p className="text-sm font-bold text-slate-900 ml-1 truncate">{firstResponsavel?.nome || "-"}</p>
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Telefone</label>
              <p className="text-sm font-bold text-slate-900 ml-1">{firstResponsavel?.telefone || "-"}</p>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200/50">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Diagnóstico</label>
            <p className="text-sm font-bold text-slate-900 ml-1">{aluno?.diagnostico || "-"}</p>
          </div>
        </div>

        {/* Dados para Preenchimento (Equipe para Baixo) */}
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-800 ml-1">Equipe</label>
            <input
              type="text"
              value={form.equipe}
              onChange={(e) => setForm({ ...form, equipe: e.target.value })}
              placeholder="Ex: Fisioterapeuta, Psicólogo..."
              className="w-full h-12 px-4 rounded-2xl bg-white border border-slate-200 text-slate-800 text-sm font-medium focus:ring-2 focus:ring-[#4E593F] focus:border-[#4E593F] outline-none transition-all shadow-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-800 ml-1">Cavalo</label>
              <select
                value={form.cavalo_id}
                onChange={(e) => setForm({ ...form, cavalo_id: e.target.value })}
                className="w-full h-12 px-3 rounded-2xl bg-white border border-slate-200 text-slate-800 text-sm font-medium focus:ring-2 focus:ring-[#4E593F] focus:border-[#4E593F] outline-none transition-all shadow-sm"
              >
                <option value="">Selecionar...</option>
                {cavalos.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-800 ml-1">Encilhamento</label>
              <input
                type="text"
                value={form.encilhamento}
                onChange={(e) => setForm({ ...form, encilhamento: e.target.value })}
                placeholder="Ex: Baixeiro, Manta..."
                className="w-full h-12 px-4 rounded-2xl bg-white border border-slate-200 text-slate-800 text-sm font-medium focus:ring-2 focus:ring-[#4E593F] focus:border-[#4E593F] outline-none transition-all shadow-sm"
              />
            </div>
          </div>

          <div className="space-y-6 pt-4">
            <div className="flex items-center gap-2 mb-2">
              <ClipboardList size={18} className="text-[#4E593F]" />
              <h3 className="font-extrabold text-slate-900 tracking-tight">Objetivos Terapêuticos</h3>
            </div>

            {[1, 2, 3, 4].map((t) => (
              <div key={t} className="space-y-1.5">
                <label className="text-xs font-black uppercase text-[#4E593F] tracking-widest ml-1">Objetivo {t}º Trimestre</label>
                <textarea
                  value={(form as any)[`objetivo_t${t}`]}
                  onChange={(e) => setForm({ ...form, [`objetivo_t${t}`]: e.target.value })}
                  placeholder={`Descreva os objetivos para o ${t}º trimestre...`}
                  rows={3}
                  className="w-full p-4 rounded-3xl bg-white border border-slate-200 text-slate-800 text-sm font-medium focus:ring-2 focus:ring-[#4E593F] focus:border-[#4E593F] outline-none transition-all shadow-sm resize-none"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </ActionSheet>
  );
};
