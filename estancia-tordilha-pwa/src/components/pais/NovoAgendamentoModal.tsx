import { useState, useMemo } from "react";
import { Check, User, Calendar, Clock, Loader2, HeartPulse, Repeat } from "lucide-react";
import { ActionSheet } from "../ui/ActionSheet";
import { useResponsavelAlunos } from "@/hooks/useResponsavelAlunos";
import { useSessoes } from "@/hooks/useSessoes";
import { useSessoesRecorrentes, DIAS_SEMANA } from "@/hooks/useSessoesRecorrentes";
import { useAlunos } from "@/hooks/useAlunos";
import { useCavalos } from "@/hooks/useCavalos";
import { useRoleSession } from "@/hooks/supabase/useRoleSession";
import { useToast } from "@/components/ui/use-toast";
import { format, parseISO, isSameDay, setHours, setMinutes, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";

interface NovoAgendamentoModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const NovoAgendamentoModal = ({ isOpen, onClose }: NovoAgendamentoModalProps) => {
    const { toast } = useToast();
    const [selectedAluno, setSelectedAluno] = useState("");
    const [selectedCavalo, setSelectedCavalo] = useState("");
    const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
    const [selectedTime, setSelectedTime] = useState("");
    const [loading, setLoading] = useState(false);
    const [isRecorrente, setIsRecorrente] = useState(false);
    const [diaSemana, setDiaSemana] = useState(1);

    const { isSuperUser } = useRoleSession();
    const { data: vinculos, isLoading: loadingVinculos } = useResponsavelAlunos();
    const { alunos: allAlunos, isLoading: loadingAllAlunos } = useAlunos();
    const { cavalos, isLoading: loadingCavalos } = useCavalos();
    const { sessoes, createSessao } = useSessoes();
    const { createRecorrente } = useSessoesRecorrentes();

    const loadingAlunos = loadingVinculos || (isSuperUser && loadingAllAlunos);

    const alunos = useMemo(() => {
        // Se houver vínculos (filhos do responsável), mostramos eles
        if (vinculos && vinculos.length > 0) {
            return vinculos.map(v => ({
                id: v.aluno_id,
                nome: v.alunos?.nome
            }));
        }

        // Se for administrador e não tiver vínculos específicos, mostramos todos
        if (isSuperUser) {
            return allAlunos.map(a => ({ id: a.id, nome: a.nome }));
        }

        return [];
    }, [vinculos, allAlunos, isSuperUser]);

    // Generate 30 days for horizontal calendar
    const calendarDays = useMemo(() => {
        return Array.from({ length: 30 }).map((_, i) => {
            const date = addDays(new Date(), i);
            return {
                date: format(date, "yyyy-MM-dd"),
                day: format(date, "d"),
                weekday: format(date, "EEE", { locale: ptBR }).replace('.', ''),
                fullDate: date
            };
        });
    }, []);

    // Available slots (standard hours)
    const horáriosBase = [
        "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
        "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30"
    ];

    // Filter slots based on occupied sessions for the selected day
    const horários = useMemo((): { hora: string; ocupado: boolean }[] => {
        if (!selectedDate) return horáriosBase.map(h => ({ hora: h, ocupado: false }));

        const dateObj = parseISO(selectedDate);
        const occupiedTimes = sessoes
            .filter(s => isSameDay(parseISO(s.data_hora), dateObj))
            .map(s => format(parseISO(s.data_hora), "HH:mm"));

        return horáriosBase.map(h => ({
            hora: h,
            ocupado: occupiedTimes.includes(h)
        }));
    }, [selectedDate, sessoes]);

    const handleConfirm = async () => {
        if (!selectedAluno) return;
        if (!isRecorrente && (!selectedDate || !selectedTime)) return;
        if (isRecorrente && !selectedTime) return;

        setLoading(true);
        try {
            if (isRecorrente) {
                await createRecorrente.mutateAsync({
                    aluno_id: selectedAluno,
                    cavalo_id: selectedCavalo || null,
                    dia_semana: diaSemana,
                    horario: selectedTime + ":00",
                    ativo: true,
                });
                toast({ title: "Sucesso!", description: "Aula recorrente solicitada com sucesso." });
            } else {
                const [hours, minutes] = selectedTime.split(':').map(Number);
                const dateObj = parseISO(selectedDate);
                const finalDate = setMinutes(setHours(dateObj, hours), minutes);

                await createSessao.mutateAsync({
                    aluno_id: selectedAluno,
                    cavalo_id: selectedCavalo || null,
                    data_hora: finalDate.toISOString(),
                    status: "confirmada"
                });
                toast({ title: "Sucesso!", description: "Sessão agendada com sucesso." });
            }

            onClose();
            setSelectedAluno("");
            setSelectedCavalo("");
            setSelectedTime("");
            setIsRecorrente(false);
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Erro ao agendar",
                description: error.message || "Ocorreu um erro ao tentar agendar a sessão.",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <ActionSheet
            isOpen={isOpen}
            onClose={onClose}
            title="Agendar Sessão"
            subtitle="Verifique a disponibilidade e escolha os dados"
            className="sm:max-w-[480px]"
            footer={
                <button
                    type="button"
                    onClick={handleConfirm}
                    disabled={!selectedAluno || (!isRecorrente && (!selectedDate || !selectedTime)) || (isRecorrente && !selectedTime) || loading || createSessao.isPending || createRecorrente.isPending}
                    className="w-full h-16 bg-[#4E593F] text-white rounded-[24px] font-bold text-lg shadow-lg shadow-[#4E593F]/20 flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50 disabled:grayscale"
                >
                    {loading || createRecorrente.isPending ? (
                        <Loader2 className="w-6 h-6 animate-spin" />
                    ) : isRecorrente ? "Criar Aula Recorrente" : (
                        "Confirmar Agendamento"
                    )}
                </button>
            }
        >
            <div className="space-y-8 py-2">
                {/* Toggle recorrente */}
                <div
                    onClick={() => setIsRecorrente(v => !v)}
                    className={`flex items-center justify-between p-4 rounded-2xl border-2 cursor-pointer transition-all ${isRecorrente ? "border-[#4E593F] bg-[#4E593F]/5" : "border-slate-200 bg-slate-50"}`}
                >
                    <div className="flex items-center gap-2">
                        <Repeat size={18} className={isRecorrente ? "text-[#4E593F]" : "text-slate-400"} />
                        <div>
                            <p className={`text-sm font-bold ${isRecorrente ? "text-[#4E593F]" : "text-slate-700"}`}>Aula Recorrente</p>
                            <p className="text-[11px] text-slate-400">Ex: toda terça às 10h</p>
                        </div>
                    </div>
                    <div className={`w-10 h-6 rounded-full transition-colors ${isRecorrente ? "bg-[#4E593F]" : "bg-slate-200"} flex items-center px-1`}>
                        <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${isRecorrente ? "translate-x-4" : "translate-x-0"}`} />
                    </div>
                </div>

                {/* 1. Seleção de Aluno */}
                <div className="space-y-4">
                    <label className="flex items-center gap-2 text-sm font-bold text-slate-400 uppercase tracking-widest ml-1">
                        <User size={16} />
                        Escolha o Aluno
                    </label>
                    <div className="grid grid-cols-1 gap-3">
                        {loadingAlunos ? (
                            <div className="flex justify-center py-4">
                                <Loader2 className="animate-spin text-slate-300" />
                            </div>
                        ) : alunos.map(aluno => (
                            <button
                                key={aluno.id}
                                type="button"
                                onClick={() => setSelectedAluno(prev => prev === aluno.id ? "" : (aluno.id || ""))}
                                className={`flex items-center justify-between p-5 rounded-[24px] transition-all border-2 ${selectedAluno === aluno.id
                                    ? "bg-[#4E593F]/5 border-[#4E593F] shadow-sm"
                                    : "bg-slate-50 border-transparent hover:border-slate-200"
                                    }`}
                            >
                                <span className={`font-bold text-base ${selectedAluno === aluno.id ? "text-[#4E593F]" : "text-slate-700"}`}>
                                    {aluno.nome}
                                </span>
                                {selectedAluno === aluno.id && (
                                    <div className="w-6 h-6 rounded-full bg-[#4E593F] flex items-center justify-center">
                                        <Check size={14} className="text-white" strokeWidth={3} />
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* 1.5 Dia da semana (só em recorrente) */}
                {isRecorrente && (
                    <div className="space-y-4">
                        <label className="flex items-center gap-2 text-sm font-bold text-slate-400 uppercase tracking-widest ml-1">
                            <Repeat size={16} />
                            Dia da Semana
                        </label>
                        <div className="flex gap-2 flex-wrap">
                            {DIAS_SEMANA.map(d => (
                                <button
                                    key={d.value}
                                    type="button"
                                    onClick={() => setDiaSemana(d.value)}
                                    className={`h-10 px-4 rounded-xl font-bold text-sm transition-all border-2 ${diaSemana === d.value
                                        ? "bg-[#4E593F] border-[#4E593F] text-white"
                                        : "bg-slate-50 border-transparent text-slate-600 hover:border-slate-200"
                                    }`}
                                >
                                    {d.label}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* 2. Seleção de Data - Horizontal (só em avulso) */}
                {!isRecorrente && (
                <div className="space-y-4">
                    <label className="flex items-center gap-2 text-sm font-bold text-slate-400 uppercase tracking-widest ml-1">
                        <Calendar size={16} />
                        Data da Sessão
                    </label>
                    <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-none">
                        {calendarDays.map((d) => (
                            <button
                                key={d.date}
                                onClick={() => setSelectedDate(d.date)}
                                className={`flex flex-col items-center justify-center min-w-[64px] h-[76px] rounded-2xl transition-all border-2 ${selectedDate === d.date
                                    ? "bg-[#4E593F] border-[#4E593F] text-white shadow-md shadow-[#4E593F]/20"
                                    : "bg-slate-50 border-transparent text-slate-600 hover:border-slate-200"
                                    }`}
                            >
                                <span className={`text-[10px] font-bold uppercase ${selectedDate === d.date ? "text-white/80" : "text-slate-400"}`}>
                                    {d.weekday}
                                </span>
                                <span className="text-lg font-black tracking-tight">{d.day}</span>
                            </button>
                        ))}
                    </div>
                </div>
                )}

                {/* 2.5 Seleção de Cavalo (Opcional para pais, mas recomendado) */}
                <div className="space-y-4">
                    <label className="flex items-center gap-2 text-sm font-bold text-slate-400 uppercase tracking-widest ml-1">
                        <HeartPulse size={16} />
                        Cavalo (Opcional)
                    </label>
                    <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-none">
                        {loadingCavalos ? (
                            <div className="flex gap-2">
                                {[1, 2, 3].map(i => <div key={i} className="w-24 h-12 bg-slate-100 rounded-xl animate-pulse" />)}
                            </div>
                        ) : cavalos.map(c => (
                            <button
                                key={c.id}
                                onClick={() => setSelectedCavalo(selectedCavalo === c.id ? "" : c.id)}
                                className={`whitespace-nowrap px-4 h-12 rounded-xl font-bold text-sm transition-all border-2 flex items-center gap-2 ${selectedCavalo === c.id
                                    ? "bg-[#8B4513]/10 border-[#8B4513] text-[#8B4513]"
                                    : "bg-slate-50 border-transparent text-slate-600 hover:border-slate-200"
                                    }`}
                            >
                                <div className={`w-2 h-2 rounded-full ${selectedCavalo === c.id ? "bg-[#8B4513]" : "bg-slate-300"}`} />
                                {c.nome}
                            </button>
                        ))}
                    </div>
                </div>

                {/* 3. Seleção de Horário */}
                <div className="space-y-4">
                    <label className="flex items-center gap-2 text-sm font-bold text-slate-400 uppercase tracking-widest ml-1">
                        <Clock size={16} />
                        Horários Disponíveis
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                        {horários.map((slot: { hora: string; ocupado: boolean }) => (
                            <button
                                key={slot.hora}
                                type="button"
                                disabled={slot.ocupado}
                                onClick={() => setSelectedTime(prev => prev === slot.hora ? "" : slot.hora)}
                                className={`h-12 rounded-[16px] font-bold text-sm transition-all flex flex-col items-center justify-center border-2 ${selectedTime === slot.hora
                                    ? "bg-[#4E593F] border-[#4E593F] text-white shadow-md shadow-[#4E593F]/20"
                                    : slot.ocupado 
                                        ? "bg-slate-100 border-transparent text-slate-300 cursor-not-allowed opacity-50"
                                        : "bg-slate-50 border-transparent text-slate-600 hover:border-slate-200"
                                    }`}
                            >
                                <span className="flex items-center gap-1">
                                    <Clock size={12} className={selectedTime === slot.hora ? "text-white" : "text-slate-400"} />
                                    {slot.hora}
                                </span>
                                {slot.ocupado && <span className="text-[7px] uppercase tracking-tighter leading-none">(Ocupado)</span>}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </ActionSheet>
    );
};

