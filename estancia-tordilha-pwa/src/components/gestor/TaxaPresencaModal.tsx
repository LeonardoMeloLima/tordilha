import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTaxaPresencaStats } from "@/hooks/useTaxaPresencaStats";
import { TrendingUp, CalendarX, UserCheck, AlertCircle, Loader2 } from "lucide-react";

type Props = {
    isOpen: boolean;
    onClose: () => void;
};

export const TaxaPresencaModal = ({ isOpen, onClose }: Props) => {
    const { data, isLoading } = useTaxaPresencaStats();

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-[calc(100%-40px)] w-[440px] max-h-[85vh] overflow-y-auto rounded-[32px] p-6 border-none card-shadow">
                <DialogHeader className="mb-4">
                    <div className="flex items-center gap-3 text-left">
                        <div className="rounded-2xl bg-[#dbeafe] p-3">
                            <TrendingUp size={22} className="text-blue-600" strokeWidth={2} />
                        </div>
                        <div>
                            <DialogTitle className="text-lg font-black text-slate-800">Taxa de Presença</DialogTitle>
                            <p className="text-xs font-medium text-slate-500">Histórico completo</p>
                        </div>
                    </div>
                </DialogHeader>

                {isLoading || !data ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
                    </div>
                ) : data.totalSessoes === 0 ? (
                    <div className="py-8 text-center text-sm text-slate-500">
                        Nenhuma sessão registrada ainda.
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Total */}
                        <div className="bg-[#eff6ff] rounded-2xl p-5">
                            <p className="text-[40px] font-extrabold text-[#1A1D1E] leading-none tracking-tight">
                                {data.taxaPercentual?.toFixed(1)}%
                            </p>
                            <p className="text-sm font-semibold text-slate-600 mt-2">
                                {data.totalConcluidas} realizadas / {data.totalSessoes} no total
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                                {data.totalFaltas} {data.totalFaltas === 1 ? "falta" : "faltas"} no histórico
                            </p>
                        </div>

                        {/* Dias com mais faltas */}
                        <Section icon={CalendarX} title="Dias com mais faltas" iconColor="text-rose-500">
                            {data.diasComFaltas.length === 0 ? (
                                <EmptyRow text="Nenhuma falta registrada" />
                            ) : (
                                data.diasComFaltas.map((d) => (
                                    <Row
                                        key={d.data}
                                        left={d.dataLabel}
                                        right={`${d.totalFaltas} ${d.totalFaltas === 1 ? "falta" : "faltas"}`}
                                    />
                                ))
                            )}
                        </Section>

                        {/* Ranking de terapeutas */}
                        <Section icon={UserCheck} title="Terapeutas — ranking" iconColor="text-emerald-500">
                            {data.rankingTerapeutas.length === 0 ? (
                                <EmptyRow text="Sem dados de terapeutas" />
                            ) : (
                                data.rankingTerapeutas.map((t) => (
                                    <Row
                                        key={t.professorId}
                                        left={t.nome}
                                        right={`${t.taxa.toFixed(1)}% (${t.concluidas}/${t.concluidas + t.faltas})`}
                                    />
                                ))
                            )}
                        </Section>

                        {/* Últimas faltas */}
                        <Section icon={AlertCircle} title="Últimas faltas" iconColor="text-amber-500">
                            {data.ultimasFaltas.length === 0 ? (
                                <EmptyRow text="Sem faltas recentes" />
                            ) : (
                                data.ultimasFaltas.map((f) => (
                                    <Row
                                        key={f.sessaoId}
                                        left={f.alunoNome}
                                        right={`${f.dataLabel} • ${f.terapeutaNome}`}
                                    />
                                ))
                            )}
                        </Section>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
};

const Section = ({
    icon: Icon,
    title,
    iconColor,
    children,
}: {
    icon: any;
    title: string;
    iconColor: string;
    children: React.ReactNode;
}) => (
    <div>
        <div className="flex items-center gap-2 mb-3">
            <Icon size={14} className={iconColor} />
            <h3 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">{title}</h3>
        </div>
        <div className="space-y-1">{children}</div>
    </div>
);

const Row = ({ left, right }: { left: string; right: string }) => (
    <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-slate-50">
        <span className="text-sm font-semibold text-slate-700 truncate pr-3">{left}</span>
        <span className="text-xs font-bold text-slate-500 whitespace-nowrap">{right}</span>
    </div>
);

const EmptyRow = ({ text }: { text: string }) => (
    <div className="py-3 px-3 text-xs text-slate-400 italic">{text}</div>
);
