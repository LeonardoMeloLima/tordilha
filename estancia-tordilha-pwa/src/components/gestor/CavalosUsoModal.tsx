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
                            <p className="text-[40px] font-extrabold text-[#1A1D1E] leading-none tracking-tight">
                                {data.totalCavalosAtivos}
                                <span className="text-2xl font-semibold text-slate-400 ml-2">/ {data.totalCavalosCadastrados}</span>
                            </p>
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
                                <div className="space-y-2">
                                    {data.ranking.map((c) => (
                                        <CavaloRow key={c.cavaloId} cavalo={c} />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
};

const CavaloRow = ({ cavalo }: { cavalo: { nome: string; fotoUrl: string | null; totalSessoes: number; percentualUso: number; percentualVsMax: number } }) => {
    const semUso = cavalo.totalSessoes === 0;
    return (
        <div className={`flex items-center gap-3 py-2.5 px-3 rounded-xl bg-slate-50 ${semUso ? "opacity-60" : ""}`}>
            <AvatarWithFallback
                src={cavalo.fotoUrl}
                className="w-9 h-9 rounded-xl shrink-0"
                type="horse"
            />
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-sm font-bold text-slate-700 truncate">{cavalo.nome}</span>
                    <span className="text-xs font-bold text-slate-500 whitespace-nowrap">
                        {semUso ? "sem uso" : `${cavalo.totalSessoes} ${cavalo.totalSessoes === 1 ? "sessão" : "sessões"} · ${cavalo.percentualUso.toFixed(1)}%`}
                    </span>
                </div>
                <div className="h-1 w-full bg-slate-200 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-[#4E593F] rounded-full transition-all duration-700"
                        style={{ width: `${cavalo.percentualVsMax}%` }}
                    />
                </div>
            </div>
        </div>
    );
};
