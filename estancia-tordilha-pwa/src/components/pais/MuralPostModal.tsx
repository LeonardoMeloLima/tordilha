import { useState, useEffect } from "react";
import { Send, Sparkles, MessageSquare, Lock } from "lucide-react";
import { ActionSheet } from "../ui/ActionSheet";
import { ImageUploadField } from "@/components/ui/ImageUploadField";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabase";
import { useMural } from "@/hooks/useMural";

interface MuralPostModalProps {
    isOpen: boolean;
    onClose: () => void;
    alunoId: string;
    alunoNome: string;
}

export const MuralPostModal = ({ isOpen, onClose, alunoId, alunoNome }: MuralPostModalProps) => {
    const { toast } = useToast();
    const { createPost } = useMural(alunoId);
    const [loading, setLoading] = useState(false);
    const [descricao, setDescricao] = useState("");
    const [mediaUrl, setMediaUrl] = useState("");
    const [badge, setBadge] = useState("");
    const [isImageUploading, setIsImageUploading] = useState(false);
    const [sessaoId, setSessaoId] = useState<string | null>(null);
    const [canPost, setCanPost] = useState(true);
    const [postError, setPostError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && alunoId) {
            fetchLastSession();
        }
    }, [isOpen, alunoId]);

    const fetchLastSession = async () => {
        try {
            const { data, error } = await supabase
                .from('sessoes')
                .select(`
                    *,
                    cavalo:cavalos(nome),
                    evolucao:evolucao_sessoes(fotos_urls, observacoes)
                `)
                .eq('aluno_id', alunoId)
                .order('data_hora', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (error) throw error;

            if (data) {
                setSessaoId(data.id);

                // Rule 1: One post per session
                const { data: existingPost } = await supabase
                    .from('mural_posts')
                    .select('id')
                    .eq('sessao_id', data.id)
                    .maybeSingle();

                if (existingPost) {
                    setCanPost(false);
                    setPostError("Você já fez a postagem desta aula! 🐴");
                } else {
                    // Rule 2: Check-in done (evolution exists)
                    const evolucao = data.evolucao as any[];
                    const hasCheckin = evolucao && evolucao.length > 0;

                    if (!hasCheckin) {
                        setCanPost(false);
                        setPostError("O professor ainda não realizou o check-in desta aula. Aguarde um pouquinho! ✨");
                    } else {
                        setCanPost(true);
                        setPostError(null);

                        // Pre-fill
                        const dateStr = new Date(data.data_hora).toLocaleDateString('pt-BR');
                        const cavaloNome = (data.cavalo as any)?.nome || "seu cavalo favorito";
                        if (!descricao) setDescricao(`${alunoNome} em sua aula do dia ${dateStr} com o ${cavaloNome}! 🐴✨`);

                        // If there's a photo in evolution, use it if no mediaUrl set
                        if (!mediaUrl && evolucao[0]?.fotos_urls?.length > 0) {
                            setMediaUrl(evolucao[0].fotos_urls[0]);
                        }
                    }
                }
            } else {
                setCanPost(false);
                setPostError("Nenhuma aula encontrada para registrar momento.");
            }
        } catch (e) {
            console.error("Erro ao buscar última sessão:", e);
        }
    };

    const handleSave = async () => {
        if (!descricao.trim()) {
            toast({
                variant: "destructive",
                title: "Campo obrigatório",
                description: "Por favor, escreva uma mensagem para o mural.",
            });
            return;
        }

        setLoading(true);
        try {
            const { data: { session: authSession } } = await supabase.auth.getSession();

            await createPost.mutateAsync({
                aluno_id: alunoId,
                sessao_id: sessaoId,
                user_id: authSession?.user?.id,
                descricao,
                media_url: mediaUrl || null,
                tipo: mediaUrl ? "foto" : "texto",
                data: new Date().toISOString().split('T')[0],
                badge: badge || "Momento Especial"
            });

            // Notify parents
            const { data: responsaveis } = await supabase
                .from('aluno_responsavel')
                .select('responsavel_id, responsaveis!inner(email)')
                .eq('aluno_id', alunoId);

            if (responsaveis && responsaveis.length > 0) {
                for (const resp of responsaveis) {
                    // Find the user id in auth for this email (since user_id in notificacoes is auth.uid)
                    // We can also assume responsavel_id in aluno_responsavel maps to auth.id if it's the user id.
                    // Let's assume responsavel_id is the auth.id since it's linked in the UI.

                    await supabase.from('notificacoes').insert({
                        user_id: resp.responsavel_id,
                        titulo: "Novo Post no Mural! ✨",
                        mensagem: `${alunoNome} tem um novo momento registrado. Venha conferir!`,
                        tipo: 'mural',
                        link: '/mural'
                    });
                }
            }

            toast({
                title: "Postagem criada!",
                description: "Seu momento foi registrado no mural.",
            });

            onClose();
            setDescricao("");
            setMediaUrl("");
            setBadge("");
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
            title="Novo Momento"
            subtitle="Registre uma lembrança especial"
        >
            <div className="space-y-6">
                {!canPost && postError && (
                    <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100 flex gap-3 animate-in fade-in slide-in-from-top-2">
                        <Lock size={18} className="text-rose-500 shrink-0 mt-0.5" />
                        <p className="text-xs text-rose-800 font-bold leading-relaxed">
                            {postError}
                        </p>
                    </div>
                )}

                {/* AI Helper / Suggestion */}
                {canPost && (
                    <div className="p-4 rounded-2xl bg-[#F1F3EF] border border-[#DDE2D6] flex gap-3">
                        <Sparkles size={18} className="text-[#4E593F] shrink-0 mt-0.5" />
                        <p className="text-xs text-[#2E3525] font-medium leading-relaxed">
                            Sugerimos uma mensagem baseada na última aula, mas sinta-se à vontade para personalizar!
                        </p>
                    </div>
                )}

                {/* Message input */}
                <div className={`space-y-2 transition-opacity duration-300 ${!canPost ? 'opacity-40 pointer-events-none' : ''}`}>
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                        <MessageSquare size={12} />
                        Sua Mensagem
                    </label>
                    <textarea
                        value={descricao}
                        onChange={(e) => setDescricao(e.target.value)}
                        placeholder="Como foi a aula hoje?"
                        className="w-full min-h-[120px] p-4 rounded-2xl bg-white border border-slate-200 text-slate-900 text-base font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary/30 outline-none transition-all resize-none shadow-sm"
                    />
                </div>

                {/* Photo Upload */}
                <div className={`space-y-2 transition-opacity duration-300 ${!canPost ? 'opacity-40 pointer-events-none' : ''}`}>
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Foto da Aula</label>
                    <ImageUploadField
                        bucket="mural"
                        value={mediaUrl}
                        onChange={setMediaUrl}
                        onUploadingChange={setIsImageUploading}
                        label="Adicionar Foto"
                        shape="rounded"
                    />
                </div>

                {/* Badge selection (optional) */}
                <div className={`space-y-2 transition-opacity duration-300 ${!canPost ? 'opacity-40 pointer-events-none' : ''}`}>
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Destaque</label>
                    <div className="flex flex-wrap gap-2">
                        {["Superação", "Amizade", "Primeira Vez", "Evolução"].map((b) => (
                            <button
                                key={b}
                                type="button"
                                onClick={() => setBadge(badge === b ? "" : b)}
                                className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-tight transition-all border ${badge === b
                                    ? 'bg-[#4E593F] border-[#4E593F] text-white shadow-md'
                                    : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                                    }`}
                            >
                                {b}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Action Button */}
                {canPost && (
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={loading || createPost.isPending || isImageUploading}
                        className="w-full h-16 bg-[#4E593F] text-white rounded-full font-black text-base shadow-lg shadow-[#4E593F]/20 flex items-center justify-center gap-3 active:scale-[0.98] transition-all disabled:opacity-50"
                    >
                        {loading || isImageUploading ? (
                            <div className="flex items-center gap-2">
                                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                {isImageUploading && <span className="text-xs uppercase tracking-widest font-black">Enviando Foto...</span>}
                            </div>
                        ) : (
                            <Send size={20} className="text-white" />
                        )}
                        Publicar no Mural
                    </button>
                )}
                <div className="h-8" /> {/* Extra spacer for mobile keyboard */}
            </div>
        </ActionSheet >
    );
};
