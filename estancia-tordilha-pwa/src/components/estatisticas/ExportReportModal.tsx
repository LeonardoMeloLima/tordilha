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

interface ExportReportModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type ReportType = "social" | "productivity" | "evolution";

export function ExportReportModal({ isOpen, onClose }: ExportReportModalProps) {
    const [selectedType, setSelectedType] = useState<ReportType>("social");
    const { isLoading: isLoadingProductivity, refetch } = useRelatorioProfessores();

    const handleGenerate = async () => {
        if (selectedType === "productivity") {
            console.log("Gerando Relatório de Produtividade...");
            const result = await refetch();
            console.log("Dados de Produtividade:", result.data);
            alert("Produtividade carregada no console!");
        } else {
            console.log(`Gerando relatório: ${selectedType}`);
            alert(`Funcionalidade de PDF para ${selectedType} será implementada na próxima etapa.`);
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

                <Button
                    onClick={handleGenerate}
                    disabled={isLoadingProductivity && selectedType === "productivity"}
                    className="w-full h-14 bg-[#EAB308] hover:bg-[#D9A307] text-white font-black text-base rounded-2xl shadow-lg shadow-yellow-500/20"
                >
                    {isLoadingProductivity && selectedType === "productivity" ? (
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
