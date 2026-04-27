import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCavalosUsoStats } from "@/hooks/useCavalosUsoStats";
import { AvatarWithFallback } from "@/components/ui/AvatarWithFallback";
import { HeartPulse, Loader2 } from "lucide-react";

type Props = {
    isOpen: boolean;
    onClose: () => void;
};

export const CavalosUsoModal = ({ isOpen, onClose }: Props) => {
    const { data, isLoading } = useCavalosUsoStats();

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-[calc(100%-40px)] w-[440px] max-h-[85vh] overflow-y-auto rounded-[32px] p-6 border-none card-shadow">
                <DialogHeader className="mb-4">
                    <div className="flex items-center gap-3 text-left">
                        <div className="rounded-2xl bg-[#DDE2D6] p-3">
                            <HeartPulse size={22} className="text-[#3E4732]" strokeWidth={2} />
                        </div>
                        <div>
                            <DialogTitle className="text-lg font-black text-slate-800">Uso dos Cavalos</DialogTitle>
                            <p className="text-xs font-medium text-slate-500">Distribuição por sessões realizadas</p>
                        </div>
                    </div>
                </DialogHeader>

                {isLoading || !data ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Resumo */}
                        <div className="bg-[#F1F3EF] rounded-2xl p-5">
                            <div className="flex items-baseline gap-2">
                                <p className="text-[40px] font-extrabold text-[#1A1D1E] leading-none tracking-tight">
                                    {data.totalCavalosAtivos}
                                </p>
                                <p className="text-lg font-semibold text-slate-500">/ {data.totalCavalosCadastrados}</p>
                            </div>
                            <p className="text-sm font-semibold text-slate-600 mt-2">
                                cavalos ativos
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                                {data.totalSessoesComCavalo} {data.totalSessoesComCavalo === 1 ? "atendimento realizado" : "atendimentos realizados"} no histórico
                            </p>
                        </div>

                        {/* Ranking de uso */}
                        <div>
                            <h3 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-3">
                                Ranking de uso
                            </h3>
                            {data.ranking.length === 0 ? (
                                <div className="py-3 px-3 text-xs text-slate-400 italic">
                                    Nenhum cavalo ativo cadastrado.
                                </div>
                            ) : data.totalSessoesComCavalo === 0 ? (
                                <div className="py-3 px-3 text-xs text-slate-400 italic">
                                    Nenhum atendimento realizado ainda.
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {data.ranking.map((c) => (
                                        <CavaloRow key={c.cavaloId} cavalo={c} />
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Insight de balanceamento — só aparece se tiver mais de 1 cavalo com uso */}
                        {data.ranking.filter(c => c.totalSessoes > 0).length >= 2 && (
                            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
                                <p className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-1">💡 Balanceamento</p>
                                <p className="text-xs text-slate-600 leading-relaxed">
                                    Cavalos com uso muito acima da média podem precisar de descanso.
                                    Os com uso baixo podem estar disponíveis para mais sessões.
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
};

const CavaloRow = ({ cavalo }: { cavalo: { nome: string; fotoUrl: string | null; totalSessoes: number; percentualUso: number; percentualVsMax: number } }) => (
    <div className="flex items-center gap-3">
        <AvatarWithFallback
            src={cavalo.fotoUrl}
            className="w-10 h-10 rounded-2xl shrink-0"
            type="horse"
        />
        <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="text-sm font-bold text-slate-700 truncate">{cavalo.nome}</span>
                <span className="text-xs font-bold text-slate-500 whitespace-nowrap">
                    {cavalo.totalSessoes} {cavalo.totalSessoes === 1 ? "sessão" : "sessões"} · {cavalo.percentualUso.toFixed(1)}%
                </span>
            </div>
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                    className="h-full bg-[#4E593F] rounded-full transition-all duration-700"
                    style={{ width: `${cavalo.percentualVsMax}%` }}
                />
            </div>
        </div>
    </div>
);
