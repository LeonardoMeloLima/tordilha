import { UsersRound, CalendarDays, TrendingUp, HeartPulse, Lightbulb, AlertCircle, Star, MessageSquare } from "lucide-react";
import { useAlunos } from "@/hooks/useAlunos";
import { useCavalos } from "@/hooks/useCavalos";
import { useSessoes } from "@/hooks/useSessoes";
import { useSessoesRecorrentes } from "@/hooks/useSessoesRecorrentes";
import { useFeedbacks } from "@/hooks/useFeedbacks";
import { useTaxaPresencaStats } from "@/hooks/useTaxaPresencaStats";
import { TaxaPresencaModal } from "@/components/gestor/TaxaPresencaModal";
import { format, isToday, parseISO, getDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatDistanceToNow } from "date-fns";
import { AvatarWithFallback } from "@/components/ui/AvatarWithFallback";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ActionSheet } from "@/components/ui/ActionSheet";

const categoriaConfig: Record<string, { label: string; icon: React.ReactNode; cor: string; corBg: string }> = {
  sugestao: { label: "Sugestão", icon: <Lightbulb size={16} />, cor: "text-amber-600", corBg: "bg-amber-50" },
  reclamacao: { label: "Reclamação", icon: <AlertCircle size={16} />, cor: "text-rose-500", corBg: "bg-rose-50" },
  elogio: { label: "Elogio", icon: <Star size={16} />, cor: "text-[#4E593F]", corBg: "bg-[#4E593F]/5" },
};

export const GestorDashboard = () => {
  const { alunos, isLoading: loadingAlunos } = useAlunos();
  const { cavalos, isLoading: loadingCavalos } = useCavalos();
  const { sessoes, isLoading: loadingSessoes } = useSessoes();
  const { recorrentes } = useSessoesRecorrentes();
  const { feedbacks, marcarLido } = useFeedbacks();
  const { data: taxaPresencaStats, isLoading: loadingTaxaPresenca } = useTaxaPresencaStats();
  const [taxaModalOpen, setTaxaModalOpen] = useState(false);

  const todayDow = getDay(new Date()); // 0=dom,1=seg...6=sab

  // Sessões reais de hoje
  const sessoesHoje = useMemo(() =>
    sessoes.filter(s => isToday(parseISO(s.data_hora))),
    [sessoes]
  );

  // Recorrentes virtuais de hoje (que não têm sessão real correspondente)
  const recorrentesHoje = useMemo(() => {
    const todayStr = format(new Date(), "yyyy-MM-dd");
    return recorrentes
      .filter(r => r.dia_semana === todayDow)
      .filter(r => !sessoesHoje.some(s => (s as any).recorrente_id === r.id))
      .map(r => ({
        id: `rec-${r.id}`,
        data_hora: `${todayStr}T${r.horario}`,
        status: "recorrente",
        aluno: (r as any).aluno,
        cavalo: (r as any).cavalo,
        recorrente_id: r.id,
        _isRecorrente: true,
      }));
  }, [recorrentes, sessoesHoje, todayDow]);
  const navigate = useNavigate();
  const [selectedFeedback, setSelectedFeedback] = useState<any>(null);

  const metrics = useMemo(() => [
    {
      label: 'Praticantes Ativos',
      value: loadingAlunos ? '...' : alunos.length.toString(),
      icon: UsersRound,
      color: 'bg-[#fdf4ff]', // fuchsia-50
      iconBg: 'bg-[#fae8ff]', // fuchsia-100
      iconCol: 'text-fuchsia-600'
    },
    {
      label: 'Sessões Hoje',
      value: loadingSessoes ? '...' : (sessoesHoje.length + recorrentesHoje.length).toString(),
      icon: CalendarDays,
      color: 'bg-[#f0fdf4]', // green-50
      iconBg: 'bg-[#dcfce7]', // green-100
      iconCol: 'text-green-600'
    },
    {
      label: 'Taxa de Presença',
      value: loadingTaxaPresenca
        ? '...'
        : taxaPresencaStats?.taxaPercentual === null || taxaPresencaStats === undefined
          ? '—'
          : `${taxaPresencaStats.taxaPercentual.toFixed(0)}%`,
      icon: TrendingUp,
      color: 'bg-[#eff6ff]', // blue-50
      iconBg: 'bg-[#dbeafe]', // blue-100
      iconCol: 'text-blue-600',
      onClick: () => setTaxaModalOpen(true),
    },
    {
      label: 'Cavalos Ativos',
      value: loadingCavalos ? '...' : `${cavalos.filter(c => c.status === 'Ativo').length}/${cavalos.length}`,
      icon: HeartPulse,
      color: 'bg-[#F1F3EF]',
      iconBg: 'bg-[#DDE2D6]',
      iconCol: 'text-[#3E4732]'
    },
  ], [alunos, sessoes, cavalos, loadingAlunos, loadingSessoes, loadingCavalos, sessoesHoje, recorrentesHoje, taxaPresencaStats, loadingTaxaPresenca]);

  const upcomingSessions = useMemo(() => {
    return [...sessoesHoje, ...recorrentesHoje]
      .sort((a, b) => a.data_hora.localeCompare(b.data_hora))
      .slice(0, 5);
  }, [sessoesHoje, recorrentesHoje]);

  const isLoading = loadingAlunos || loadingCavalos || loadingSessoes;

  return (
    <div className="space-y-8 animate-fade-in pb-24">
      {/* Resumo e Link para Estatísticas */}
      <div>
        <div className="flex items-center justify-between mb-6 px-1 mt-2">
          <h1 className="text-xl font-extrabold text-[#1A1D1E] tracking-tight">Estatísticas</h1>
          <button
            type="button"
            onClick={() => navigate('/estatisticas')}
            className="text-sm font-semibold text-slate-400 hover:text-slate-600 transition-colors"
          >
            Ver Todas
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {metrics.map((m: any) => (
            <div
              key={m.label}
              onClick={m.onClick ?? (() => navigate('/estatisticas'))}
              className={`${m.color} rounded-[32px] p-6 flex flex-col gap-6 relative overflow-hidden cursor-pointer transition-transform active:scale-[0.98] border border-white/40`}
            >
              <div className="flex items-start justify-between">
                <div className={`rounded-[16px] ${m.iconBg} p-3`}>
                  <m.icon size={26} className={m.iconCol} strokeWidth={2} />
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-[28px] font-extrabold text-[#1A1D1E] tracking-tight leading-none">{m.value}</p>
                <p className="text-[13px] text-slate-500 font-semibold">{m.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="pt-2">
        <div className="flex items-center justify-between mb-6 px-1">
          <h2 className="font-extrabold text-xl text-[#1A1D1E] tracking-tight">Próximas Sessões</h2>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('change-tab', { detail: { tab: 'agenda' } }))}
            className="text-sm font-semibold text-slate-400 hover:text-slate-600 transition-colors"
          >
            Ver todas
          </button>
        </div>

        <div className="space-y-4">
          {isLoading ? (
            [1, 2, 3].map(i => (
              <div key={i} className="flex flex-col gap-4 p-5 rounded-[32px] bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] animate-pulse">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-slate-100" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-slate-100 rounded w-1/2" />
                    <div className="h-3 bg-slate-100 rounded w-1/3" />
                  </div>
                </div>
              </div>
            ))
          ) : upcomingSessions.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border-2 border-dashed border-slate-100">
              <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Nenhuma sessão hoje</p>
            </div>
          ) : (
            upcomingSessions.map((s) => (
              <div key={s.id} className="flex flex-col gap-4 p-5 rounded-[32px] bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all active:scale-[0.98]">
                <div className="flex items-center gap-4">
                  <AvatarWithFallback
                    src={s.aluno?.avatar_url}
                    className="w-14 h-14 rounded-full shadow-sm"
                    type="user"
                  />
                  <div className="flex-1">
                    <h3 className="text-base font-extrabold text-[#1A1D1E] tracking-tight">{s.aluno?.nome || "Praticante"}</h3>
                    <p className="text-sm text-slate-500 font-medium mt-0.5">c/ {s.cavalo?.nome || "Sem cavalo"}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <div className="px-3 py-1.5 rounded-xl bg-[#F1F3EF] border border-[#8C9A7A]/20 shadow-sm">
                      <p className="text-[10px] font-black text-[#4E593F] uppercase tracking-wider whitespace-nowrap">
                        {s.aluno?.diagnostico || "Avaliação"}
                      </p>
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mr-1">
                      {s.aluno?.idade ? `${s.aluno.idade} anos` : "S/ Idade"}
                    </p>
                  </div>
                </div>

                <div className="bg-[#F8F9FA] rounded-[20px] p-3 flex items-center justify-center">
                  <p className="text-sm font-bold text-[#1A1D1E] tracking-tight">
                    {format(parseISO(s.data_hora), "HH:mm")}
                    <span className="text-slate-400 font-semibold mx-1">·</span>
                    {s.status ? (s.status.charAt(0).toUpperCase() + s.status.slice(1)) : "Pendente"}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Mensagens dos Responsáveis */}
      {feedbacks.length > 0 && (
        <div className="pt-2">
          <div className="flex items-center justify-between mb-6 px-1">
            <div className="flex items-center gap-2">
              <h2 className="font-extrabold text-xl text-[#1A1D1E] tracking-tight">Mensagens</h2>
              {feedbacks.filter(f => !f.lida).length > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-[#4E593F] text-white text-[10px] font-black">
                  {feedbacks.filter(f => !f.lida).length} nova{feedbacks.filter(f => !f.lida).length > 1 ? "s" : ""}
                </span>
              )}
            </div>
            <MessageSquare size={18} className="text-slate-300" />
          </div>

          <div className="space-y-3">
            {feedbacks.slice(0, 5).map((f) => {
              const cfg = categoriaConfig[f.categoria] || categoriaConfig.sugestao;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => {
                    setSelectedFeedback(f);
                    if (!f.lida) marcarLido.mutate(f.id);
                  }}
                  className={`w-full flex items-start gap-4 p-4 rounded-3xl text-left transition-all active:scale-[0.98] border ${
                    f.lida ? "bg-white border-slate-100 opacity-70" : "bg-white border-[#4E593F]/10 shadow-sm"
                  }`}
                >
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${cfg.corBg}`}>
                    <span className={cfg.cor}>{cfg.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-black text-slate-800">{f.responsavel_nome}</p>
                      {!f.lida && <div className="w-2 h-2 rounded-full bg-[#4E593F] shrink-0" />}
                    </div>
                    <p className="text-xs text-slate-500 font-medium line-clamp-1 mt-0.5">{f.mensagem}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[10px] font-black uppercase tracking-wider ${cfg.cor}`}>{cfg.label}</span>
                      <span className="text-[10px] text-slate-300">·</span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {formatDistanceToNow(new Date(f.created_at), { addSuffix: true, locale: ptBR })}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ActionSheet de detalhe do feedback */}
      <ActionSheet
        isOpen={!!selectedFeedback}
        onClose={() => setSelectedFeedback(null)}
        title={selectedFeedback ? categoriaConfig[selectedFeedback.categoria]?.label || "Mensagem" : ""}
        subtitle={selectedFeedback?.responsavel_nome}
      >
        {selectedFeedback && (
          <div className="pb-4 space-y-4">
            <div className={`p-4 rounded-2xl ${categoriaConfig[selectedFeedback.categoria]?.corBg}`}>
              <p className="text-sm font-medium text-slate-700 leading-relaxed whitespace-pre-wrap">
                {selectedFeedback.mensagem}
              </p>
            </div>
            <p className="text-[11px] text-slate-400 font-medium text-right">
              {new Date(selectedFeedback.created_at).toLocaleDateString("pt-BR", {
                day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit"
              })}
            </p>
          </div>
        )}
      </ActionSheet>

      <TaxaPresencaModal isOpen={taxaModalOpen} onClose={() => setTaxaModalOpen(false)} />
    </div>
  );
};
