import { useNavigate } from "react-router-dom";
import { Download, ChevronLeft, Brain, BookOpen, Users, Heart, Activity, MessageCircle, Loader2, CalendarCheck } from "lucide-react";
import { useState } from "react";
import { useProgressoAlunos, type StudentProgress } from "@/hooks/useProgressoAlunos";
import { useSessoesStats } from "@/hooks/useSessoesStats";
import { AvatarWithFallback } from "@/components/ui/AvatarWithFallback";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Legend
} from 'recharts';

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white rounded-2xl p-4 shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-slate-100">
                <p className="text-sm font-bold text-slate-600 mb-2">{label}</p>
                <div className="space-y-1">
                    {payload.map((entry: any, index: number) => (
                        <div key={index} className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                                <span className="text-xs font-medium text-slate-500">{entry.name}</span>
                            </div>
                            <span className="text-sm font-black text-[#1A1D1E]">{entry.value}</span>
                        </div>
                    ))}
                </div>
            </div>
        );
    }
    return null;
};

const Estatisticas = () => {
    const navigate = useNavigate();
    const { data: progressData, isLoading: isLoadingProgress } = useProgressoAlunos();
    const { data: sessoesData, isLoading: isLoadingSessoes } = useSessoesStats();
    const [selectedStudent, setSelectedStudent] = useState<StudentProgress | null>(null);

    const donutData = [
        { name: 'Ativos', value: 45, color: '#a7f3d0' },
        { name: 'Inativos', value: 5, color: '#fecdd3' },
        { name: 'Em Teste', value: 12, color: '#bae6fd' },
    ];

    return (
        <div className="min-h-screen bg-[#F8F9FA] pb-24">
            {/* Header */}
            <div className="bg-white px-5 pt-12 pb-6 rounded-b-[40px] shadow-[0_4px_20px_rgb(0,0,0,0.02)] mb-6">
                <div className="max-w-lg mx-auto">
                    <button
                        onClick={() => navigate(-1)}
                        className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors mb-6"
                    >
                        <ChevronLeft size={24} strokeWidth={1.5} />
                    </button>
                    <div className="flex justify-between items-end">
                        <div className="space-y-1">
                            <h1 className="text-[32px] font-extrabold text-[#1A1D1E] tracking-tight leading-tight">Estatísticas</h1>
                            <p className="text-[15px] font-medium text-slate-500">Visão geral do sistema</p>
                        </div>
                        <button
                            type="button"
                            className="flex items-center justify-center w-12 h-12 bg-slate-50 rounded-full text-slate-700 hover:bg-slate-100 transition-colors"
                        >
                            <Download size={20} strokeWidth={2} />
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-lg mx-auto px-5 space-y-8">

                {/* Charts */}
                <div className="space-y-6">
                    {/* Donut Chart with Center Text */}
                    <div className="bg-white rounded-[32px] p-6 pt-7 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-[17px] font-extrabold text-[#1A1D1E] tracking-tight">Status dos Alunos</h3>
                            <button className="text-sm font-bold text-slate-400">Ver det.</button>
                        </div>
                        <div className="relative h-[220px] w-full flex items-center justify-center">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={donutData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={65}
                                        outerRadius={90}
                                        paddingAngle={5}
                                        dataKey="value"
                                        stroke="none"
                                        cornerRadius={8}
                                    >
                                        {donutData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<CustomTooltip />} />
                                </PieChart>
                            </ResponsiveContainer>
                            {/* Center Text */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <p className="text-[32px] font-black text-[#1A1D1E] leading-none mb-1">62</p>
                                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total</p>
                            </div>
                        </div>
                        <div className="flex justify-center gap-6 mt-2">
                            {donutData.map((item, i) => (
                                <div key={i} className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                                    <span className="text-xs font-bold text-slate-500">{item.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Bar Chart Grouped (Agendadas x Realizadas) */}
                    <div className="bg-white rounded-[32px] p-6 pt-7 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                        <div className="flex flex-col mb-8 gap-1">
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">SESSÕES AGENDADAS × REALIZADAS</p>
                            <h3 className="text-[17px] font-extrabold text-[#1A1D1E] tracking-tight">Atendimentos Mensais</h3>
                        </div>

                        <div className="h-[250px] w-full">
                            {isLoadingSessoes ? (
                                <div className="h-full flex flex-col items-center justify-center gap-3">
                                    <Loader2 className="animate-spin text-primary/40" size={32} />
                                    <p className="text-xs font-bold text-slate-400">Carregando histórico...</p>
                                </div>
                            ) : sessoesData && sessoesData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={sessoesData} margin={{ top: 0, right: 0, left: -25, bottom: 20 }}>
                                        <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f1f5f9" />
                                        <XAxis
                                            dataKey="name"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#94a3b8', fontSize: 13, fontWeight: 600 }}
                                            dy={10}
                                        />
                                        <YAxis
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#94a3b8', fontSize: 13, fontWeight: 600 }}
                                        />
                                        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc', radius: 12 }} />
                                        <Legend
                                            verticalAlign="bottom"
                                            align="center"
                                            iconType="circle"
                                            wrapperStyle={{ paddingTop: '20px', fontSize: '12px', fontWeight: 700, color: '#64748b' }}
                                        />
                                        <Bar name="Agendadas" dataKey="agendadas" fill="#8C7E6E" radius={[6, 6, 6, 6]} barSize={12} />
                                        <Bar name="Realizadas" dataKey="realizadas" fill="#2E5A31" radius={[6, 6, 6, 6]} barSize={12} />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center gap-3 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-100">
                                    <CalendarCheck className="text-slate-200" size={40} />
                                    <p className="text-sm font-bold text-slate-400">Sem dados de atendimentos</p>
                                </div>
                            )}
                        </div>
                    </div>
                    {/* Progresso dos Alunos */}
                    <div className="bg-white rounded-[32px] p-6 pt-7 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                        <h3 className="text-[17px] font-black text-[#1A1D1E] tracking-tight mb-8">Progresso dos Alunos</h3>

                        <div className="space-y-6">
                            {isLoadingProgress ? (
                                <div className="flex flex-col items-center justify-center py-12 gap-3">
                                    <Loader2 className="animate-spin text-primary/40" size={32} />
                                    <p className="text-xs font-bold text-slate-400">Calculando evoluções...</p>
                                </div>
                            ) : progressData?.map((student) => (
                                <button
                                    key={student.id}
                                    onClick={() => setSelectedStudent(student)}
                                    className="w-full flex items-center gap-4 group active:scale-[0.98] transition-all"
                                >
                                    {/* Avatar */}
                                    <AvatarWithFallback
                                        src={student.avatar_url}
                                        alt={student.nome}
                                        className="w-12 h-12 rounded-2xl shadow-sm border-2 border-white"
                                    />

                                    {/* Info & Bar */}
                                    <div className="flex-1 space-y-2 min-w-0">
                                        <div className="flex justify-between items-center leading-none">
                                            <span className="text-[15px] font-bold text-slate-700 truncate group-hover:text-primary transition-colors">{student.nome}</span>
                                            <div className="flex items-center gap-1">
                                                <span className={`text-[13px] font-black ${student.currentProgress >= 0 ? 'text-[#EAB308]' : 'text-rose-500'}`}>
                                                    {student.currentProgress > 0 ? '+' : ''}{student.currentProgress}%
                                                </span>
                                            </div>
                                        </div>
                                        {/* Progress Track (Fininho) */}
                                        <div className="h-[4px] w-full bg-slate-50 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all duration-1000 ${student.currentProgress >= 0 ? 'bg-[#EAB308]' : 'bg-rose-500'}`}
                                                style={{ width: `${Math.max(5, Math.abs(student.currentProgress))}%` }}
                                            />
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal de Detalhes Clínicos */}
            <Dialog open={!!selectedStudent} onOpenChange={(open) => !open && setSelectedStudent(null)}>
                <DialogContent className="max-w-[calc(100%-40px)] w-[400px] rounded-[32px] p-6 border-none card-shadow">
                    {selectedStudent && (
                        <>
                            <DialogHeader className="mb-6">
                                <div className="flex items-center gap-4 text-left">
                                    <AvatarWithFallback
                                        src={selectedStudent.avatar_url}
                                        className="w-14 h-14 rounded-3xl"
                                    />
                                    <div>
                                        <DialogTitle className="text-xl font-black text-slate-800">{selectedStudent.nome}</DialogTitle>
                                        <p className="text-sm font-bold text-[#EAB308]">Média das últimas avaliações</p>
                                    </div>
                                </div>
                            </DialogHeader>

                            <div className="space-y-5">
                                <ClinicalCategory label="Cognitivo" icon={Brain} value={selectedStudent.averages.cognitivo} />
                                <ClinicalCategory label="Pedagógico" icon={BookOpen} value={selectedStudent.averages.pedagogico} />
                                <ClinicalCategory label="Social" icon={Users} value={selectedStudent.averages.social} />
                                <ClinicalCategory label="Emocional" icon={Heart} value={selectedStudent.averages.emocional} />
                                <ClinicalCategory label="Agitação" icon={Activity} value={selectedStudent.averages.agitacao} />
                                <ClinicalCategory label="Interação" icon={MessageCircle} value={selectedStudent.averages.interacao} />
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};

const ClinicalCategory = ({ label, icon: Icon, value }: { label: string, icon: any, value: number }) => (
    <div className="space-y-2">
        <div className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase tracking-wider">
            <div className="flex items-center gap-2">
                <Icon size={14} className="text-slate-400" />
                <span>{label}</span>
            </div>
            <span className="text-slate-700">{value}/5</span>
        </div>
        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
            <div
                className="h-full bg-[#EAB308] rounded-full transition-all duration-700"
                style={{ width: `${(value / 5) * 100}%` }}
            />
        </div>
    </div>
);

export default Estatisticas;
