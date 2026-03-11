import { useState, useMemo } from "react";
import { Check, User, Calendar, Clock, Loader2 } from "lucide-react";
import { ActionSheet } from "../ui/ActionSheet";
import { useResponsavelAlunos } from "@/hooks/useResponsavelAlunos";
import { useSessoes } from "@/hooks/useSessoes";
import { useToast } from "@/components/ui/use-toast";
import { format, parseISO, isSameDay, setHours, setMinutes } from "date-fns";

interface NovoAgendamentoModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const NovoAgendamentoModal = ({ isOpen, onClose }: NovoAgendamentoModalProps) => {
    const { toast } = useToast();
    const [selectedAluno, setSelectedAluno] = useState("");
    const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
    const [selectedTime, setSelectedTime] = useState("");
    const [loading, setLoading] = useState(false);

    const { data: vinculos, isLoading: loadingAlunos } = useResponsavelAlunos();
    const { sessoes, createSessao } = useSessoes();

    const alunos = useMemo(() => {
        return vinculos?.map(v => ({
            id: v.aluno_id,
            nome: v.alunos?.nome
        })) || [];
    }, [vinculos]);

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
        if (!selectedAluno || !selectedDate || !selectedTime) return;

        setLoading(true);
        try {
            const [hours, minutes] = selectedTime.split(':').map(Number);
            const dateObj = parseISO(selectedDate);
            const finalDate = setMinutes(setHours(dateObj, hours), minutes);

            await createSessao.mutateAsync({
                aluno_id: selectedAluno,
                data_hora: finalDate.toISOString(),
                status: "confirmada"
            });

            toast({
                title: "Sucesso!",
                description: "Sessão agendada com sucesso.",
            });
            
            onClose();
            setSelectedAluno("");
            setSelectedTime("");
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
            title="Agendar Nova Sessão"
            subtitle="Preencha os dados abaixo para agendar"
            footer={
                <button
                    type="button"
                    onClick={handleConfirm}
                    disabled={!selectedAluno || !selectedDate || !selectedTime || loading || createSessao.isPending}
                    className="w-full h-16 bg-[#EAB308] text-white rounded-[24px] font-bold text-lg shadow-lg shadow-[#EAB308]/20 flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50 disabled:grayscale"
                >
                    {loading ? (
                        <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                        "Confirmar Agendamento"
                    )}
                </button>
            }
        >
            <div className="space-y-8 py-2">
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
                                onClick={() => setSelectedAluno(aluno.id || "")}
                                className={`flex items-center justify-between p-5 rounded-[24px] transition-all border-2 ${selectedAluno === aluno.id
                                    ? "bg-[#EAB308]/5 border-[#EAB308] shadow-sm"
                                    : "bg-slate-50 border-transparent hover:border-slate-200"
                                    }`}
                            >
                                <span className={`font-bold text-base ${selectedAluno === aluno.id ? "text-[#EAB308]" : "text-slate-700"}`}>
                                    {aluno.nome}
                                </span>
                                {selectedAluno === aluno.id && (
                                    <div className="w-6 h-6 rounded-full bg-[#EAB308] flex items-center justify-center">
                                        <Check size={14} className="text-white" strokeWidth={3} />
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* 2. Seleção de Data */}
                <div className="space-y-4">
                    <label className="flex items-center gap-2 text-sm font-bold text-slate-400 uppercase tracking-widest ml-1">
                        <Calendar size={16} />
                        Data da Sessão
                    </label>
                    <div className="relative">
                        <input
                            type="date"
                            value={selectedDate}
                            min={format(new Date(), "yyyy-MM-dd")}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="w-full h-16 px-6 rounded-[24px] bg-slate-50 border-2 border-transparent focus:border-[#EAB308] focus:bg-white text-slate-900 font-bold text-lg outline-none transition-all appearance-none"
                        />
                        <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                            <Calendar size={20} />
                        </div>
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
                                onClick={() => setSelectedTime(slot.hora)}
                                className={`h-12 rounded-[16px] font-bold text-sm transition-all flex flex-col items-center justify-center border-2 ${selectedTime === slot.hora
                                    ? "bg-[#EAB308] border-[#EAB308] text-white shadow-md shadow-[#EAB308]/20"
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

