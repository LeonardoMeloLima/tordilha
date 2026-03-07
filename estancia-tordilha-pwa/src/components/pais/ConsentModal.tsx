import { useState, useEffect } from "react";
import { Check, Shield, Info, Lock } from "lucide-react";
import { ActionSheet } from "../ui/ActionSheet";
import { ImageUploadField } from "@/components/ui/ImageUploadField";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabase";

interface ConsentModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ConsentModal = ({ isOpen, onClose }: ConsentModalProps) => {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [aluno, setAluno] = useState<any>(null);
    const [consentGiven, setConsentGiven] = useState(false);
    const [tempAvatarUrl, setTempAvatarUrl] = useState("");

    // Fetch the student linked to this parent
    useEffect(() => {
        if (isOpen) {
            fetchStudent();
        }
    }, [isOpen]);

    const fetchStudent = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            // First find the student linked in aluno_responsavel via email
            const { data, error: fetchError } = await supabase
                .from('alunos')
                .select(`
                    *,
                    aluno_responsavel!inner (
                        responsaveis!inner (email)
                    )
                `)
                .eq('aluno_responsavel.responsaveis.email', session.user.email!)
                .maybeSingle();

            if (fetchError) {
                console.error("Erro ao buscar vínculo do aluno:", fetchError);
                return;
            }

            if (data) {
                setAluno(data);
                setTempAvatarUrl(data.avatar_url || "");
                setConsentGiven(!!data.lgpd_assinado);
            } else {
                // Fallback for "not implemented in management yet" 
                // We'll show a message but allow them to see the structure
                console.log("Nenhum aluno vinculado ao perfil atual.");
            }
        } catch (e) {
            console.error("Erro ao buscar aluno:", e);
        }
    };

    const handleSave = async () => {
        if (!aluno) {
            toast({
                variant: "destructive",
                title: "Acesso Negado",
                description: "Você ainda não tem um aluno vinculado ao seu perfil. Entre em contato com a gestão.",
            });
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase
                .from('alunos')
                .update({
                    lgpd_assinado: consentGiven,
                    avatar_url: tempAvatarUrl
                })
                .eq('id', aluno.id);

            if (error) throw error;

            toast({
                title: "Sucesso!",
                description: "Consentimento e foto atualizados.",
            });

            // Notify parent component to refresh
            window.dispatchEvent(new CustomEvent('consent-updated'));
            onClose();
        } catch (e: any) {
            toast({
                variant: "destructive",
                title: "Erro ao salvar",
                description: e.message,
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <ActionSheet
            isOpen={isOpen}
            onClose={onClose}
            title="Consentimento de Imagem"
            subtitle="Identificação e termos de privacidade"
        >
            <div className="space-y-6">
                {/* LGPD Explanation */}
                <div className="p-5 rounded-[24px] bg-slate-50 border border-slate-100 flex gap-4">
                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shrink-0 shadow-sm text-primary">
                        <Lock size={20} className="text-[#EAB308]" />
                    </div>
                    <div className="flex-1 space-y-1">
                        <h4 className="text-sm font-black text-slate-900 tracking-tight">Privacidade & Imagem</h4>
                        <p className="text-xs text-slate-500 font-medium leading-relaxed">
                            O Responsável pela criança declara estar ciente e autoriza o uso da imagem e fotos da criança para os propósitos pedagógicos e de acompanhamento existentes no aplicativo Estância Tordilha.
                        </p>
                    </div>
                </div>

                {!aluno ? (
                    <div className="py-8 text-center space-y-3">
                        <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mx-auto text-slate-300">
                            <Info size={32} />
                        </div>
                        <div className="space-y-1">
                            <p className="font-bold text-slate-900">Aguardando Vínculo</p>
                            <p className="text-xs text-slate-500 max-w-[200px] mx-auto leading-relaxed">
                                Seu perfil ainda não foi vinculado a um aluno pela gestão da Estância.
                            </p>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Student Name */}
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Criança / Aluno(a)</label>
                            <div className="w-full h-14 px-4 rounded-2xl bg-white border border-slate-200 text-slate-900 text-base font-bold flex items-center shadow-sm">
                                {aluno.nome}
                            </div>
                        </div>

                        {/* Photo Upload */}
                        <ImageUploadField
                            bucket="alunos"
                            value={tempAvatarUrl}
                            onChange={setTempAvatarUrl}
                            label="Foto de Perfil"
                            shape="circle"
                            defaultFacingMode="user"
                        />

                        {/* Consent Toggle */}
                        <label className={`flex items-center gap-4 p-5 rounded-[24px] border transition-all cursor-pointer ${consentGiven ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200 shadow-sm'}`}>
                            <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${consentGiven ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300'}`}>
                                {consentGiven && <Check size={14} className="text-white" strokeWidth={4} />}
                            </div>
                            <input
                                type="checkbox"
                                checked={consentGiven}
                                onChange={(e) => setConsentGiven(e.target.checked)}
                                className="hidden"
                            />
                            <div className="flex-1">
                                <p className="text-[15px] font-bold text-slate-900">Eu autorizo o uso de imagem</p>
                                <p className="text-xs text-slate-500 font-medium">Aceito os termos da clínica</p>
                            </div>
                        </label>
                    </>
                )}

                {/* Action Button */}
                <button
                    type="button"
                    onClick={handleSave}
                    disabled={loading || !aluno}
                    className="w-full h-16 bg-[#EAB308] text-white rounded-full font-black text-base shadow-lg shadow-[#EAB308]/20 flex items-center justify-center gap-3 active:scale-[0.98] transition-all disabled:opacity-30 disabled:grayscale"
                >
                    {loading ? (
                        <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                        <Shield size={20} className="text-white" />
                    )}
                    Salvar Consentimento
                </button>
            </div>
        </ActionSheet>
    );
};
