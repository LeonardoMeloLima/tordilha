import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileText, Users, TrendingUp, ChevronRight, Loader2, Search } from "lucide-react";
import { useRelatorioProfessores } from "@/hooks/useRelatorioProfessores";
import { useProgressoAlunos } from "@/hooks/useProgressoAlunos";
import { generatePDF, generateSocialImpactPDF } from "@/services/pdfService";
import { useEvolucaoClinica } from "@/hooks/useEvolucaoClinica";
import { useAlunos } from "@/hooks/useAlunos";
import { startOfMonth, subMonths, parseISO } from "date-fns";
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
    const [searchTerm, setSearchTerm] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);
    const { isLoading: isLoadingProductivity, refetch: refetchProductivity } = useRelatorioProfessores();
    const { data: students } = useProgressoAlunos();
    const { alunos } = useAlunos();
    const { data: evolucaoClinica } = useEvolucaoClinica();

    const filteredAlunos = (alunos || []).filter(a => 
        a.nome.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleGenerate = async () => {
        setIsGenerating(true);
        try {
            if (selectedType === "productivity") {
                console.log("Gerando Relatório de Produtividade...");
                const result = await refetchProductivity();
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
                console.log("Gerando Relatório de Impacto Social...");
                
                // 1. Fetch Key Metrics
                const { count: totalAlunos } = await supabase.from('alunos').select('*', { count: 'exact', head: true }).eq('arquivado', false);
                const { count: totalCavalos } = await supabase.from('cavalos').select('*', { count: 'exact', head: true }).neq('status', 'Inativo');
                const { data: globalEvolution } = await supabase.rpc('get_kpi_evolucao_global');
                
                const now = new Date();
                const sixMonthsAgo = startOfMonth(subMonths(now, 5));
                const { data: sessoes } = await supabase
                    .from('sessoes')
                    .select('id, data_hora, status, evolucao_sessoes(id)')
                    .gte('data_hora', sixMonthsAgo.toISOString());

                const totalSessoes = sessoes?.length || 0;

                // 2. Prepare Indicadores-Chave Section
                const indicadoresData = [
                    ["Total de Alunos Atendidos", totalAlunos?.toString() || "0"],
                    ["Sessões Realizadas", totalSessoes.toString()],
                    ["Evolução Global Média", `${globalEvolution || 0}%`],
                    ["Cavalos Ativos", totalCavalos?.toString() || "0"],
                ];

                // 3. Prepare Frequência Mensal Section
                const statsMap: Record<string, { name: string; presencas: number; faltas: number }> = {};
                for (let i = 5; i >= 0; i--) {
                    const monthDate = subMonths(now, i);
                    const monthKey = format(monthDate, "yyyy-MM");
                    const monthName = format(monthDate, "MMM", { locale: ptBR }).replace(".", "");
                    statsMap[monthKey] = {
                        name: monthName.charAt(0).toUpperCase() + monthName.slice(1),
                        presencas: 0,
                        faltas: 0
                    };
                }

                sessoes?.forEach(s => {
                    const date = parseISO(s.data_hora);
                    const monthKey = format(date, "yyyy-MM");
                    if (statsMap[monthKey]) {
                        // Consider presence if status is 'realizada' or has expansion
                        if (s.status === 'realizada' || (s.evolucao_sessoes as any[])?.length > 0) {
                            statsMap[monthKey].presencas++;
                        } else if (s.status === 'falta' || s.status === 'cancelada') {
                            statsMap[monthKey].faltas++;
                        }
                    }
                });

                const frequenciaData = Object.values(statsMap).map(m => {
                    const total = m.presencas + m.faltas;
                    const percent = total > 0 ? Math.round((m.presencas / total) * 100) : 0;
                    return [m.name, m.presencas.toString(), m.faltas.toString(), `${percent}%`];
                });

                // 4. Prepare Progresso Individual Section
                // Fetch students with diagnosis and session count
                const { data: studentsWithDiagnosis } = await supabase
                    .from('alunos')
                    .select('id, nome, diagnostico, sessoes(id)')
                    .eq('arquivado', false);

                const progressoData = (studentsWithDiagnosis || []).map(student => {
                    const stats = evolucaoClinica?.find(e => e.aluno_id === student.id);
                    const sessoesCount = student.sessoes?.length || 0;
                    
                    // Calcular o percentual atual com base na soma das notas (max 30)
                    const totalScore = 
                        Number(stats?.media_cognitivo || 0) + 
                        Number(stats?.media_pedagogico || 0) + 
                        Number(stats?.media_social || 0) + 
                        Number(stats?.media_emocional || 0) + 
                        Number(stats?.media_agitacao || 0) + 
                        Number(stats?.media_interacao || 0);
                    
                    const scorePercent = totalScore > 0 ? Math.round((totalScore / 30) * 100) : 0;

                    return [
                        student.nome || "Aluno",
                        student.diagnostico || "-",
                        sessoesCount.toString(),
                        `${scorePercent}%`
                    ];
                });

                const sections = [
                    { title: "Indicadores-Chave", columns: ["Indicador", "Valor"], data: indicadoresData },
                    { title: "Frequência Mensal", columns: ["Mês", "Presenças", "Faltas", "% Presença"], data: frequenciaData },
                    { title: "Progresso Individual dos Alunos", columns: ["Aluno", "Diagnóstico", "Sessões", "Evolução"], data: progressoData },
                ];

                await generateSocialImpactPDF(sections, "impacto_social.pdf");
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
            icon: <FileText className="text-[#4E593F]" size={24} />,
        },
        {
            id: "productivity",
            title: "Produtividade da Equipe",
            description: "Sessões e alunos únicos por professor",
            icon: <Users className="text-[#4E593F]" size={24} />,
        },
        {
            id: "evolution",
            title: "Evolução Clínica Individual",
            description: "Relatório detalhado por aluno",
            icon: <TrendingUp className="text-[#4E593F]" size={24} />,
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
                                ? "border-[#4E593F] bg-[#4E593F]/5"
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
                                className={selectedType === option.id ? "text-[#4E593F]" : "text-slate-300"}
                            />
                        </button>
                    ))}
                </div>

                {selectedType === "evolution" && (
                    <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                Buscar Aluno
                            </label>
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input
                                    type="text"
                                    placeholder="Pesquisar por nome..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full h-12 pl-11 pr-4 rounded-2xl border-2 border-slate-100 bg-slate-50/50 focus:border-[#4E593F] outline-none transition-all text-sm font-bold placeholder:text-slate-300"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                Selecionar Aluno
                            </label>
                            <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                                <SelectTrigger className="h-14 rounded-2xl border-2 border-slate-100 bg-white font-bold text-[#1A1D1E] focus:border-[#4E593F] focus:ring-0">
                                    <SelectValue placeholder="Escolha um aluno..." />
                                </SelectTrigger>
                                <SelectContent className="rounded-2xl border-none shadow-xl max-h-[300px]">
                                    {filteredAlunos.length > 0 ? (
                                        filteredAlunos.map((student) => (
                                            <SelectItem
                                                key={student.id}
                                                value={student.id}
                                                className="font-bold py-3 focus:bg-[#4E593F]/10 rounded-xl"
                                            >
                                                {student.nome}
                                            </SelectItem>
                                        ))
                                    ) : (
                                        <div className="p-4 text-center text-xs font-bold text-slate-400">
                                            Nenhum aluno encontrado
                                        </div>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                )}

                <Button
                    onClick={handleGenerate}
                    disabled={isGenerating || (isLoadingProductivity && selectedType === "productivity")}
                    className="w-full h-14 bg-[#4E593F] hover:bg-[#3E4732] text-white font-black text-base rounded-2xl shadow-lg shadow-[#4E593F]/20 transition-all"
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
