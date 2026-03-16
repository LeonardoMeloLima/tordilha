import { ActionSheet } from "./ui/ActionSheet";
import { Info, ShieldAlert, Heart, Activity, Calendar, Zap, ClipboardCheck, UserCheck } from "lucide-react";

interface WelcomeSheetProps {
    isOpen: boolean;
    onClose: () => void;
}

export function WelcomeSheet({ isOpen, onClose }: WelcomeSheetProps) {
    return (
        <ActionSheet
            isOpen={isOpen}
            onClose={onClose}
            title="Bem vindo à Estância Tordilha!"
            subtitle="Conheça nosso trabalho e instruções de funcionamento"
        >
            <div className="flex flex-col h-[80vh] overflow-y-auto pr-2 space-y-8 pb-10 custom-scrollbar">
                {/* Intro Section */}
                <section className="space-y-4">
                    <div className="bg-[#8B4513]/5 p-6 rounded-[24px] border border-[#8B4513]/10">
                        <p className="text-slate-700 font-medium leading-relaxed italic">
                            "Nosso maior objetivo é melhorar a qualidade de vida dos praticantes, através da interação com o cavalo, levando-os ao seu desenvolvimento máximo!"
                        </p>
                    </div>
                    <p className="text-slate-600 leading-relaxed font-medium">
                        O cavalo traz a nossa realidade a experiência gostosa de sonhar. Por alguns momentos é
                        possível se achar grande, forte, sem problemas, preconceitos e ao mesmo tempo, o relaxamento
                        que advém disto torna o cérebro mais apto ao aprendizado.
                    </p>
                </section>

                {/* Equoterapia Section */}
                <section className="space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-[#F1F3EF] flex items-center justify-center text-[#3E4732]">
                            <Heart size={20} strokeWidth={2.5} />
                        </div>
                        <h4 className="text-lg font-black text-slate-800 tracking-tight">O que é a Equoterapia?</h4>
                    </div>
                    <p className="text-slate-600 leading-relaxed font-medium">
                        É um método terapêutico que utiliza os recursos oferecidos pelo cavalo,
                        seja sua sensibilidade, força, seu movimento rítmico, que imita a cadência do andar humano, ou
                        pelo convívio e manuseio do animal. O praticante se desenvolve de forma completa, usufruindo de uma melhor
                        qualidade de vida!
                    </p>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 italic font-bold text-slate-700 text-sm">
                            • Trabalho de Solo
                        </div>
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 italic font-bold text-slate-700 text-sm">
                            • Montaria
                        </div>
                    </div>
                    
                    <p className="text-slate-600 leading-relaxed text-sm font-medium">
                        Os atendimentos são individualizados, voltados para a necessidade única de cada um,
                        potencializando o que eles têm de melhor e trabalhando o que precisa ser melhorado.
                    </p>
                </section>

                {/* Details Section */}
                <section className="space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
                            <Zap size={20} strokeWidth={2.5} />
                        </div>
                        <h4 className="text-lg font-black text-slate-800 tracking-tight">Desenvolvimento Completo</h4>
                    </div>
                    <p className="text-slate-600 leading-relaxed font-medium">
                        A Equoterapia exige a participação do corpo inteiro, contribuindo para o
                        desenvolvimento da força muscular, relaxamento, conscientização do próprio corpo e
                        aperfeiçoamento da coordenação motora e do equilíbrio.
                    </p>
                    <p className="text-slate-600 leading-relaxed font-medium">
                        A interação com o cavalo desenvolve, ainda, novas formas de socialização, autoconfiança e
                        autoestima. No trabalho de solo, cada atividade tem sempre um objetivo específico.
                    </p>
                </section>

                {/* Benefits Section */}
                <section className="space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-[#F1F3EF] flex items-center justify-center text-[#4E593F]">
                            <Activity size={20} strokeWidth={2.5} />
                        </div>
                        <h4 className="text-lg font-black text-slate-800 tracking-tight">Principais Benefícios</h4>
                    </div>
                    
                    <div className="space-y-6">
                        <div className="space-y-3">
                            <h5 className="text-[13px] font-black text-[#4E593F] uppercase tracking-widest px-1">Neuromotores</h5>
                            <ul className="grid grid-cols-1 gap-2">
                                {[
                                    "Força muscular e tônus",
                                    "Equilíbrio e flexibilidade",
                                    "Coordenação motora",
                                    "Fala e comunicação"
                                ].map((item, idx) => (
                                    <li key={idx} className="flex items-center gap-3 bg-[#F1F3EF]/30 p-3 rounded-xl border border-[#8C9A7A]/20 text-sm font-bold text-[#4E593F]">
                                        <div className="w-1.5 h-1.5 rounded-full bg-[#4E593F]" />
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="space-y-3">
                            <h5 className="text-[13px] font-black text-blue-700 uppercase tracking-widest px-1">Psicossociais</h5>
                            <ul className="grid grid-cols-1 gap-2">
                                {[
                                    "Inclusão e socialização",
                                    "Concentração e paciência",
                                    "Autoconfiança e coragem",
                                    "Autonomia e liderança",
                                    "Redução de ansiedade e stress"
                                ].map((item, idx) => (
                                    <li key={idx} className="flex items-center gap-3 bg-blue-50/30 p-3 rounded-xl border border-blue-100 text-sm font-bold text-blue-900">
                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </section>

                {/* Funcionamento Section */}
                <section className="space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-[#F1F3EF] flex items-center justify-center text-[#3E4732]">
                            <Calendar size={20} strokeWidth={2.5} />
                        </div>
                        <h4 className="text-lg font-black text-slate-800 tracking-tight">Funcionamento</h4>
                    </div>

                    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                        {[
                            { icon: ShieldAlert, title: "Segurança", text: "Uso obrigatório de capacete, calça comprida (moletom/lycra) e sapato fechado (tênis/bota)." },
                            { icon: ClipboardCheck, title: "Frequência", text: "As aulas são semanais e devem ser prioridade. Avise sobre faltas com antecedência." },
                            { icon: Info, title: "Dia de Banho", text: "Avisaremos com antecedência para virem com roupa apropriada e trazerem troca limpa." },
                            { icon: UserCheck, title: "Participação", text: "Você pode ser solicitado a participar da sessão. Caso contrário, observe da área de espera." },
                            { icon: Calendar, title: "Pontualidade", text: "Atrasos superiores a 15 min resultarão no cancelamento do atendimento." }
                        ].map((item, idx) => (
                            <div key={idx} className={`p-5 flex gap-4 ${idx !== 4 ? 'border-b border-slate-50' : ''}`}>
                                <div className="w-10 h-10 shrink-0 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                                    <item.icon size={18} />
                                </div>
                                <div className="space-y-1">
                                    <h6 className="text-[13px] font-black text-slate-800 uppercase tracking-wider">{item.title}</h6>
                                    <p className="text-xs text-slate-500 font-medium leading-relaxed">{item.text}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="bg-rose-50/50 p-6 rounded-3xl border border-rose-100 space-y-3">
                        <div className="flex items-center gap-2 text-rose-600">
                            <ShieldAlert size={18} strokeWidth={3} />
                            <span className="text-[11px] font-black uppercase tracking-widest">Informação Importante</span>
                        </div>
                        <p className="text-sm text-slate-700 font-bold leading-relaxed">
                            No Centro, só é permitido o cavalo. Outros animais de estimação devem ficar em casa.
                        </p>
                    </div>
                </section>

                {/* Final Note Section */}
                <section className="space-y-4">
                    <div className="bg-slate-900 p-8 rounded-[32px] text-white space-y-4 shadow-xl">
                        <p className="text-slate-300 text-sm leading-relaxed font-bold">
                            "O cavalo é o principal terapeuta! Ele é treinado respeitando suas características. Nossa equipe coloca a segurança do praticante em primeiro lugar."
                        </p>
                        <div className="h-1 w-12 bg-[#F1F3EF]0 rounded-full" />
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">
                            Direção Estância Tordilha
                        </p>
                    </div>
                </section>
            </div>
        </ActionSheet>
    );
}
