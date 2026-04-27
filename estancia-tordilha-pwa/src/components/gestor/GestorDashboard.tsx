import { UsersRound, CalendarDays, TrendingUp, HeartPulse } from "lucide-react";
import { useAlunos } from "@/hooks/useAlunos";
import { useCavalos } from "@/hooks/useCavalos";
import { useSessoes } from "@/hooks/useSessoes";
import { format, isToday, parseISO } from "date-fns";
import { AvatarWithFallback } from "@/components/ui/AvatarWithFallback";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTaxaPresencaStats } from "@/hooks/useTaxaPresencaStats";
import { TaxaPresencaModal } from "@/components/gestor/TaxaPresencaModal";
import { CavalosUsoModal } from "@/components/gestor/CavalosUsoModal";

export const GestorDashboard = () => {
  const { alunos, isLoading: loadingAlunos } = useAlunos();
  const { cavalos, isLoading: loadingCavalos } = useCavalos();
  const { sessoes, isLoading: loadingSessoes } = useSessoes();
  const navigate = useNavigate();
  const { data: taxaPresencaStats, isLoading: loadingTaxaPresenca } = useTaxaPresencaStats();
  const [taxaModalOpen, setTaxaModalOpen] = useState(false);
  const [cavalosModalOpen, setCavalosModalOpen] = useState(false);

  const metrics = useMemo(() => [
    {
      label: 'Alunos Ativos',
      value: loadingAlunos ? '...' : alunos.length.toString(),
      icon: UsersRound,
      color: 'bg-[#fdf4ff]', // fuchsia-50
      iconBg: 'bg-[#fae8ff]', // fuchsia-100
      iconCol: 'text-fuchsia-600'
    },
    {
      label: 'Sessões Hoje',
      value: loadingSessoes ? '...' : sessoes.filter(s => isToday(parseISO(s.data_hora))).length.toString(),
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
      iconCol: 'text-[#3E4732]',
      onClick: () => setCavalosModalOpen(true),
    },
  ], [alunos, sessoes, cavalos, loadingAlunos, loadingSessoes, loadingCavalos, taxaPresencaStats, loadingTaxaPresenca]);

  const upcomingSessions = useMemo(() => {
    return sessoes
      .filter(s => isToday(parseISO(s.data_hora)))
      .sort((a, b) => a.data_hora.localeCompare(b.data_hora))
      .slice(0, 5);
  }, [sessoes]);

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
                    <h3 className="text-base font-extrabold text-[#1A1D1E] tracking-tight">{s.aluno?.nome || "Aluno"}</h3>
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

      <TaxaPresencaModal isOpen={taxaModalOpen} onClose={() => setTaxaModalOpen(false)} />
      <CavalosUsoModal isOpen={cavalosModalOpen} onClose={() => setCavalosModalOpen(false)} />
    </div>
  );
};
