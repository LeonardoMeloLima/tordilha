import { useState, useMemo, useEffect } from "react";
import { CheckCircle, Mic, Save, Loader2, Brain, BookOpen, Users, Heart, Activity, MessageCircle, LogIn } from "lucide-react";
import { useSessoes } from "@/hooks/useSessoes";
import { useEvolucao } from "@/hooks/useEvolucao";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/components/ui/use-toast";
import { ClinicalSlice } from "@/components/ui/ClinicalSlice";

export const ProfessorEvolucao = () => {
  const { toast } = useToast();
  const { sessoes, isLoading: loadingSessoes, updateSessao } = useSessoes();
  const { createEvolucao } = useEvolucao();

  const activeSessoes = useMemo(() => 
    sessoes.filter(s => s.status !== "concluida"),
    [sessoes]
  );

  const [selectedSessaoId, setSelectedSessaoId] = useState("");
  const [checkedIn, setCheckedIn] = useState(false);
  const [notas, setNotas] = useState("");
  const [cognitivo, setCognitivo] = useState(0);
  const [pedagogico, setPedagogico] = useState(0);
  const [social, setSocial] = useState(0);
  const [emocional, setEmocional] = useState(0);
  const [agitacao, setAgitacao] = useState(0);
  const [interacao, setInteracao] = useState(0);

  const selectedSessao = useMemo(() =>
    sessoes.find(s => s.id === selectedSessaoId),
    [sessoes, selectedSessaoId]
  );

  // Listen for 'sessao-preselect' → pre-select the session only
  useEffect(() => {
    const handler = (e: Event) => {
      const { sessaoId } = (e as CustomEvent).detail;
      setSelectedSessaoId(sessaoId);
      // Removed auto check-in: let the professor click the button
      // Scroll the page to top so user sees the form
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    window.addEventListener('sessao-preselect', handler);
    return () => window.removeEventListener('sessao-preselect', handler);
  }, []);



  const handleSave = async () => {
    if (!selectedSessaoId) {
      toast({
        title: "Erro",
        description: "Selecione uma sessão primeiro.",
        variant: "destructive",
      });
      return;
    }

    if (!notas.trim()) {
      toast({
        title: "Campo Obrigatório",
        description: "Por favor, descreva as notas da sessão.",
        variant: "destructive",
      });
      return;
    }

    const hasClinicalValue = [cognitivo, pedagogico, social, emocional, agitacao, interacao].some(v => v > 0);
    if (!hasClinicalValue) {
      toast({
        title: "Avaliação incompleta",
        description: "Por favor, preencha ao menos um item da avaliação clínica.",
        variant: "destructive",
      });
      return;
    }

    try {
      await createEvolucao.mutateAsync({
        sessao_id: selectedSessaoId,
        observacoes: notas,
        cognitivo,
        pedagogico,
        social,
        emocional,
        agitacao,
        interacao,
      });

      // Update session status to completed
      await updateSessao.mutateAsync({
        id: selectedSessaoId,
        status: "concluida",
      });

      toast({
        title: "Sucesso!",
        description: "Evolução salva com sucesso.",
      });

      // Reset state
      setNotas("");
      setCognitivo(0);
      setPedagogico(0);
      setSocial(0);
      setEmocional(0);
      setAgitacao(0);
      setInteracao(0);
      setCheckedIn(false);
      setSelectedSessaoId("");

      // Navigate back to agenda
      window.dispatchEvent(new CustomEvent('change-tab', {
        detail: { tab: 'agenda' }
      }));
    } catch (error) {
      console.error(error);
      toast({
        title: "Erro",
        description: "Falha ao salvar evolução.",
        variant: "destructive",
      });
    }
  };

  if (loadingSessoes) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <Loader2 className="w-8 h-8 text-[#EAB308] animate-spin" />
        <p className="text-sm font-medium text-muted-foreground">Carregando sessões...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-xl font-extrabold text-foreground">Evolução</h1>
        <p className="text-sm text-muted-foreground font-medium mt-0.5">Registrar progresso da sessão</p>
      </div>

      {/* Sessão selector */}
      <div className="bg-card rounded-3xl p-5 card-shadow">
        <label className="text-sm font-medium text-slate-700 block mb-3 ml-1">SESSÃO / ALUNO</label>
        <select
          value={selectedSessaoId}
          onChange={(e) => setSelectedSessaoId(e.target.value)}
          className="w-full h-14 px-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 text-base font-medium focus:ring-2 focus:ring-[#EAB308] focus:border-[#EAB308] outline-none transition-all shadow-sm appearance-none"
        >
          <option value="">Selecione uma sessão...</option>
          {activeSessoes.map((s) => (
            <option key={s.id} value={s.id}>
              {s.aluno?.nome} - {format(parseISO(s.data_hora), "dd/MM 'às' HH:mm", { locale: ptBR })}
            </option>
          ))}
        </select>
        {!activeSessoes.length && (
          <p className="text-xs text-amber-600 mt-2 ml-1">Nenhuma sessão pendente para você.</p>
        )}
      </div>

      {selectedSessao && (
        <>
          {/* Check-in button */}
          <button
            type="button"
            onClick={() => setCheckedIn(!checkedIn)}
            className={`w-full py-5 rounded-3xl font-extrabold text-base touch-target transition-all flex items-center justify-center gap-3 ${checkedIn
              ? "bg-primary/10 text-primary border-2 border-primary"
              : "bg-primary text-primary-foreground"
              }`}
            style={!checkedIn ? { boxShadow: '0 8px 24px hsla(45, 93%, 47%, 0.35)' } : {}}
          >
            {checkedIn ? <CheckCircle size={24} /> : <LogIn size={24} />}
            {checkedIn ? "Check-in Realizado ✓" : "Realizar Check-in"}
          </button>

          {/* Session Notes */}
          <div className="bg-card rounded-3xl p-5 card-shadow space-y-3">
            <label className="text-sm font-medium text-slate-700 ml-1">NOTAS DA SESSÃO</label>
            <div className="relative">
              <textarea
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="Descreva o progresso do aluno nesta sessão..."
                rows={4}
                className="w-full p-4 pr-14 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 text-base font-medium resize-none focus:ring-2 focus:ring-[#EAB308] focus:border-[#EAB308] outline-none transition-all shadow-sm"
              />
              <button
                type="button"
                className="absolute right-3 bottom-5 w-11 h-11 rounded-2xl bg-slate-100/50 text-slate-400 hover:text-[#EAB308] flex items-center justify-center transition-colors">
                <Mic size={18} />
              </button>
            </div>
          </div>

          {/* Behavior scales (Clinical Slices) */}
          <div className="space-y-4">
            <h3 className="text-sm font-extrabold text-slate-700 ml-1">AVALIAÇÃO CLÍNICA</h3>

            <ClinicalSlice
              label="Cognitivo"
              icon={Brain}
              value={cognitivo}
              onChange={setCognitivo}
            />

            <ClinicalSlice
              label="Pedagógico"
              icon={BookOpen}
              value={pedagogico}
              onChange={setPedagogico}
            />

            <ClinicalSlice
              label="Social"
              icon={Users}
              value={social}
              onChange={setSocial}
            />

            <ClinicalSlice
              label="Emocional"
              icon={Heart}
              value={emocional}
              onChange={setEmocional}
            />

            <ClinicalSlice
              label="Agitação"
              icon={Activity}
              value={agitacao}
              onChange={setAgitacao}
            />

            <ClinicalSlice
              label="Interação"
              icon={MessageCircle}
              value={interacao}
              onChange={setInteracao}
            />
          </div>

          <button
            onClick={handleSave}
            disabled={createEvolucao.isPending || !selectedSessaoId || !notas.trim() || ![cognitivo, pedagogico, social, emocional, agitacao, interacao].some(v => v > 0)}
            className="w-full py-5 bg-primary text-primary-foreground rounded-3xl font-extrabold text-base touch-target flex items-center justify-center gap-3 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed transition-all"
            style={{
              boxShadow: ![cognitivo, pedagogico, social, emocional, agitacao, interacao].some(v => v > 0) || !selectedSessaoId || !notas.trim()
                ? 'none'
                : '0 8px 24px hsla(45, 93%, 47%, 0.35)'
            }}
          >
            {createEvolucao.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save size={20} />}
            Salvar Evolução
          </button>
        </>
      )}
    </div>
  );
};

