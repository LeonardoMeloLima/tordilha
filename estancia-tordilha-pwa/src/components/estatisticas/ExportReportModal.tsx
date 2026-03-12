import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileText, Users, TrendingUp, ChevronRight, Loader2 } from "lucide-react";
import { useRelatorioProfessores } from "@/hooks/useRelatorioProfessores";
import { useProgressoAlunos } from "@/hooks/useProgressoAlunos";
import { generatePDF } from "@/services/pdfService";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ExportReportModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type ReportType = "social" | "productivity" | "evolution";

export function ExportReportModal({ isOpen, onClose }: ExportReportModalProps) {
    const [selectedType, setSelectedType] = useState<ReportType>("social");
    const [selectedStudentId, setSelectedStudentId] = useState<string>("");
    const [isGenerating, setIsGenerating] = useState(false);
    const { isLoading: isLoadingProductivity, refetch } = useRelatorioProfessores();
    const { data: students } = useProgressoAlunos();

    const handleGenerate = async () => {
        setIsGenerating(true);
        try {
            if (selectedType === "productivity") {
                console.log("Gerando Relatório de Produtividade...");
                const result = await refetch();
                if (result.data) {
                    const columns = ["Professor", "Sessões", "Alunos Únicos"];
                    const data = result.data.map((p: any) => [
                        p.nome_professor,
                        p.total_sessoes,
                        p.total_alunos_unicos
                    ]);
                    await generatePDF("Relatório de Produtividade da Equipe", columns, data, "produtividade_equipe.pdf");
                    toast.success("Relatório de produtividade gerado com sucesso!");
                }
            } else if (selectedType === "social") {
                // Mock data for social impact - to be replaced with real data from Supabase
                const columns = ["Indicador", "Quantidade", "Status"];
                const data = [
                    ["Total de Alunos Atendidos", "42", "Ativo"],
                    ["Sessões Realizadas (Mês)", "156", "Concluído"],
                    ["Novas Matrículas", "5", "Em Crescimento"],
                    ["Cavalos em Atividade", "8", "Estável"],
                ];
                await generatePDF("Relatório de Impacto Social", columns, data, "impacto_social.pdf");
                toast.success("Relatório de impacto social gerado com sucesso!");
            } else if (selectedType === "evolution") {
                if (!selectedStudentId) {
                    toast.error("Por favor, selecione um aluno.");
                    return;
                }

                console.log("Gerando Relatório de Evolução Clínica para o aluno:", selectedStudentId);

                // Fetch full history for the selected student
                const { data: sessions, error } = await supabase
                    .from("sessoes")
                    .select(`
                        data_hora,
                        status,
                        evolucao_sessoes (
                            cognitivo,
                            pedagogico,
                            social,
                            emocional,
                            agitacao,
                            interacao,
                            observacoes
                        )
                    `)
                    .eq("aluno_id", selectedStudentId)
                    .order("data_hora", { ascending: false });

                if (error) throw error;

                if (!sessions || sessions.length === 0) {
                    toast.info("Nenhuma sessão encontrada para este aluno.");
                    return;
                }

                const studentName = students?.find(s => s.id === selectedStudentId)?.nome || "Aluno";
                const columns = ["Data", "C", "P", "S", "E", "A", "I", "Observações"];
                const data = sessions
                    .filter(s => s.evolucao_sessoes && s.evolucao_sessoes.length > 0)
                    .map(s => {
                        const ev = (s.evolucao_sessoes as any)[0];
                        return [
                            format(new Date(s.data_hora), "dd/MM/yy", { locale: ptBR }),
                            ev.cognitivo ?? "-",
                            ev.pedagogico ?? "-",
                            ev.social ?? "-",
                            ev.emocional ?? "-",
                            ev.agitacao ?? "-",
                            ev.interacao ?? "-",
                            ev.observacoes || "-"
                        ];
                    });

                if (data.length === 0) {
                    toast.info("Nenhuma evolução registrada para este aluno.");
                    return;
                }

                await generatePDF(
                    `Evolução Clínica: ${studentName}`,
                    columns,
                    data,
                    `evolucao_${studentName.toLowerCase().replace(/\s+/g, '_')}.pdf`
                );
                toast.success("Relatório de evolução gerado com sucesso!");
            } else {
                toast.info("Este relatório será implementado em breve.");
            }
        } catch (error) {
            console.error("Erro ao gerar PDF:", error);
            toast.error("Ocorreu um erro ao gerar o relatório.");
        } finally {
            setIsGenerating(false);
        }
    };

    const options = [
        {
            id: "social",
            title: "Impacto Social",
            description: "Visão macro da ONG e resultados gerais",
            icon: <FileText className="text-blue-500" size={24} />,
        },
        {
            id: "productivity",
            title: "Produtividade da Equipe",
            description: "Sessões e alunos únicos por professor",
            icon: <Users className="text-[#2E8B57]" size={24} />,
        },
        {
            id: "evolution",
            title: "Evolução Clínica Individual",
            description: "Relatório detalhado por aluno",
            icon: <TrendingUp className="text-rose-500" size={24} />,
        },
    ];

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-md w-[90vw] rounded-[32px] p-8 border-none gap-6">
                <DialogHeader className="space-y-1">
                    <DialogTitle className="text-2xl font-black text-[#1A1D1E]">
                        Exportar Relatório
                    </DialogTitle>
                    <p className="text-sm font-bold text-slate-400">
                        Selecione o tipo de documento que deseja gerar
                    </p>
                </DialogHeader>

                <div className="space-y-3">
                    {options.map((option) => (
                        <button
                            key={option.id}
                            onClick={() => setSelectedType(option.id as ReportType)}
                            className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${selectedType === option.id
                                ? "border-[#EAB308] bg-[#EAB308]/5"
                                : "border-slate-100 bg-white hover:border-slate-200"
                                }`}
                        >
                            <div className={`p-3 rounded-xl ${selectedType === option.id ? "bg-white shadow-sm" : "bg-slate-50"
                                }`}>
                                {option.icon}
                            </div>
                            <div className="flex-1">
                                <h4 className="font-extrabold text-[#1A1D1E] leading-tight">
                                    {option.title}
                                </h4>
                                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-tight mt-0.5">
                                    {option.description}
                                </p>
                            </div>
                            <ChevronRight
                                size={18}
                                className={selectedType === option.id ? "text-[#EAB308]" : "text-slate-300"}
                            />
                        </button>
                    ))}
                </div>

                {selectedType === "evolution" && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                        <label className="text-xs font-black text-slate-400 uppercase ml-1">
                            Selecionar Aluno
                        </label>
                        <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                            <SelectTrigger className="h-14 rounded-2xl border-2 border-slate-100 bg-white font-bold text-[#1A1D1E] focus:border-[#EAB308] focus:ring-0">
                                <SelectValue placeholder="Escolha um aluno..." />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl border-none shadow-xl">
                                {students?.map((student) => (
                                    <SelectItem
                                        key={student.id}
                                        value={student.id}
                                        className="font-bold py-3 focus:bg-[#EAB308]/10 rounded-xl"
                                    >
                                        {student.nome}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}

                <Button
                    onClick={handleGenerate}
                    disabled={isGenerating || (isLoadingProductivity && selectedType === "productivity")}
                    className="w-full h-14 bg-[#EAB308] hover:bg-[#D9A307] text-white font-black text-base rounded-2xl shadow-lg shadow-yellow-500/20"
                >
                    {isGenerating || (isLoadingProductivity && selectedType === "productivity") ? (
                        <>
                            <Loader2 className="animate-spin mr-2" size={20} />
                            Processando...
                        </>
                    ) : (
                        "Gerar PDF"
                    )}
                </Button>
            </DialogContent>
        </Dialog>
    );
}
