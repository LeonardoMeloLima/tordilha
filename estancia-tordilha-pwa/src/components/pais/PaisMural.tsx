import { Award, Heart, MessageCircle, Send, Trash2, Lock, Sparkles } from "lucide-react";
import { useState, useEffect } from "react";
import { useMural } from "@/hooks/useMural";
import { MuralPostModal } from "./MuralPostModal";
import { supabase } from "@/lib/supabase";
import { useMuralInteractions } from "@/hooks/useMuralInteractions";
import { ActionSheet } from "../ui/ActionSheet";
import { AvatarWithFallback } from "../ui/AvatarWithFallback";
import { ConsentModal } from "./ConsentModal"; // Keep ConsentModal as it's used later

export const PaisMural = () => {
  const [alunoId, setAlunoId] = useState<string | undefined>();
  const [alunoNome, setAlunoNome] = useState("");
  const { posts, isLoading } = useMural(alunoId);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [hasConsented, setHasConsented] = useState(false);
  const [activePost, setActivePost] = useState<any | null>(null);

  useEffect(() => {
    const handleOpenComments = (e: any) => {
      const post = posts.find((p: any) => p.id === e.detail.postId);
      if (post) setActivePost(post);
    };
    window.addEventListener('open-mural-comments', handleOpenComments);
    return () => window.removeEventListener('open-mural-comments', handleOpenComments);
  }, [posts]);

  useEffect(() => {
    fetchStudentInfo();
    const handleUpdate = () => fetchStudentInfo();
    const handleFAB = () => setIsPostModalOpen(true);

    window.addEventListener('consent-updated', handleUpdate);
    window.addEventListener('fab-click-local', handleFAB);

    return () => {
      window.removeEventListener('consent-updated', handleUpdate);
      window.removeEventListener('fab-click-local', handleFAB);
    };
  }, []);

  const fetchStudentInfo = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.email) return;

    const { data, error } = await supabase
      .from('aluno_responsavel')
      .select('aluno_id, alunos (nome, lgpd_assinado), responsaveis!inner (email)')
      .eq('responsaveis.email', session.user.email);

    if (error) {
      console.error("Erro ao buscar vínculo do aluno:", error);
      return;
    }

    if (data && data.length > 0) {
      const activeLink = data[0];
      setAlunoId(activeLink.aluno_id);
      setAlunoNome((activeLink as any).alunos?.nome || "");
      if ((activeLink as any).alunos?.lgpd_assinado) {
        setHasConsented(true);
      } else {
        setHasConsented(false);
      }
    }
  };


  return (
    <div className="space-y-6 animate-fade-in pb-24">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-foreground tracking-tight">Mural</h1>
          <p className="text-sm text-muted-foreground font-medium mt-0.5">Momentos especiais do seu pequeno</p>
        </div>
        <button
          onClick={() => setIsPostModalOpen(true)}
          className="h-12 px-5 bg-[#EAB308] text-white rounded-2xl flex items-center gap-2 font-bold text-sm shadow-lg shadow-[#EAB308]/20 active:scale-95 transition-all"
        >
          <Send size={18} strokeWidth={2.5} />
          Postar
        </button>
      </div>

      {/* LGPD Glassmorphism card */}
      {!hasConsented && (
        <div className="relative rounded-[32px] overflow-hidden card-shadow">
          <div className="absolute inset-0 bg-gradient-to-br from-[#EAB308]/10 via-amber-50/5 to-orange-50/10 backdrop-blur-sm" />
          <div className="relative p-7 space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-white/80 backdrop-blur flex items-center justify-center shadow-sm">
              <Lock size={24} className="text-[#EAB308]" strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 tracking-tight">Privacidade & Imagem</h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed mt-1">
                Para visualizar novas fotos, confirme o consentimento de imagem conforme a LGPD.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowConsentModal(true)}
              className="w-full px-6 py-4 bg-white text-slate-900 rounded-2xl text-xs font-black uppercase tracking-widest active:scale-[0.98] transition-all shadow-sm"
            >
              Gerenciar Consentimento
            </button>
          </div>
        </div>
      )}

      <ConsentModal
        isOpen={showConsentModal}
        onClose={() => setShowConsentModal(false)}
      />

      {alunoId && (
        <MuralPostModal
          isOpen={isPostModalOpen}
          onClose={() => setIsPostModalOpen(false)}
          alunoId={alunoId}
          alunoNome={alunoNome}
        />
      )}

      <div className="space-y-6">
        {isLoading ? (
          [1, 2].map(i => (
            <div key={i} className="bg-card rounded-[32px] card-shadow overflow-hidden animate-pulse">
              <div className="h-48 bg-slate-100" />
              <div className="p-5 space-y-3">
                <div className="h-4 bg-slate-100 rounded w-full" />
                <div className="h-4 bg-slate-100 rounded w-2/3" />
                <div className="h-3 bg-slate-100 rounded w-1/4 pt-2" />
              </div>
            </div>
          ))
        ) : posts.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-[40px] border-2 border-dashed border-slate-100 flex flex-col items-center gap-4">
            <Heart size={48} className="text-slate-100" />
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Nenhuma postagem ainda</p>
          </div>
        ) : (
          posts.map((post: any, index: number) => (
            <div
              key={post.id}
              onClick={() => setActivePost(post)}
              className={`bg-card rounded-[32px] card-shadow overflow-hidden group active:scale-[0.98] transition-all duration-300 cursor-pointer border border-slate-100/50 ${index === 0 ? 'ring-2 ring-amber-400 ring-offset-4 ring-offset-slate-50 mb-4' : ''
                }`}
            >
              {post.media_url ? (
                <div className={`bg-slate-100 relative overflow-hidden ${index === 0 ? 'aspect-[16/10]' : 'aspect-video'}`}>
                  <img
                    src={post.media_url}
                    alt=""
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  {index === 0 && (
                    <div className="absolute top-4 right-4 px-3 py-1.5 bg-white/90 backdrop-blur-md rounded-full border border-white/50 flex items-center gap-2 shadow-sm">
                      <Sparkles size={12} className="text-amber-500" />
                      <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Destaque do Dia</span>
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
                </div>
              ) : post.tipo === "texto" ? (
                <div className="p-1 bg-gradient-to-r from-amber-400 to-orange-400" />
              ) : (
                <div className="h-2 bg-[#EAB308]" />
              )}

              <div className="p-6">
                <div className="flex justify-between items-start gap-4">
                  <p className="text-base font-semibold text-slate-800 leading-relaxed">
                    {post.descricao}
                  </p>
                </div>

                <div className="flex items-center justify-between mt-5">
                  <MuralPostActions postId={post.id} />

                  <div className="flex items-center gap-2">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                      {post.criado_em ? new Date(post.criado_em).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' }) : ""}
                    </p>
                    {post.badge && (
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-50 rounded-full border border-amber-100">
                        <Award size={12} className="text-[#EAB308]" />
                        <span className="text-[9px] font-black text-[#B45309] uppercase tracking-tight">{post.badge}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {activePost && (
        <MuralCommentsModal
          isOpen={!!activePost}
          onClose={() => setActivePost(null)}
          post={activePost}
        />
      )}
    </div>
  );
};

const MuralPostActions = ({ postId }: { postId: string }) => {
  const { likesInfo, toggleLike, comments } = useMuralInteractions(postId);

  return (
    <div className="flex items-center gap-4" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => toggleLike.mutate({ currentStatus: likesInfo.isLiked })}
        className="flex items-center gap-1.5 group"
      >
        <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${likesInfo.isLiked ? 'bg-rose-50 text-rose-500' : 'bg-slate-50 text-slate-400 group-hover:bg-rose-50 group-hover:text-rose-400'}`}>
          <Heart size={18} fill={likesInfo.isLiked ? "currentColor" : "none"} />
        </div>
        <span className="text-xs font-bold text-slate-500">{likesInfo.count}</span>
      </button>

      <button
        onClick={() => {
          window.dispatchEvent(new CustomEvent('open-mural-comments', { detail: { postId } }));
        }}
        className="flex items-center gap-1.5 group"
      >
        <div className="w-8 h-8 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center group-hover:bg-blue-50 group-hover:text-blue-400 transition-all">
          <MessageCircle size={18} />
        </div>
        <span className="text-xs font-bold text-slate-500">{comments.length}</span>
      </button>
    </div>
  );
};

const MuralCommentsModal = ({ isOpen, onClose, post }: { isOpen: boolean, onClose: () => void, post: any }) => {
  const { comments, addComment, deleteComment, isLoadingComments, error: commentsError } = useMuralInteractions(post.id) as any;
  const [newComment, setNewComment] = useState("");
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id || null));
  }, []);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newComment.trim()) return;

    await addComment.mutateAsync(newComment);
    setNewComment("");
  };

  return (
    <ActionSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Comentários"
    >
      <div className="flex flex-col h-[70vh]">
        {/* Post Preview inside comments */}
        <div className="mb-6 p-4 rounded-3xl bg-slate-50 border border-slate-100 flex gap-4">
          {post.media_url && (
            <div className="w-16 h-16 rounded-2xl overflow-hidden shrink-0 shadow-sm border border-white">
              <img src={post.media_url} alt="" className="w-full h-full object-cover" />
            </div>
          )}
          <div className="flex-1">
            <p className="text-sm font-bold text-slate-900 leading-tight">Postado {post.data === new Date().toISOString().split('T')[0] ? 'hoje' : 'recentemente'}</p>
            <p className="text-xs text-slate-500 font-medium line-clamp-2 mt-1">{post.descricao}</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-2 space-y-6">
          {isLoadingComments ? (
            <div className="flex justify-center py-10"><span className="w-6 h-6 border-2 border-primary border-t-transparent animate-spin rounded-full" /></div>
          ) : commentsError ? (
            <div className="py-20 text-center text-rose-500 text-sm font-medium">Erro ao carregar comentários 😕</div>
          ) : comments.length === 0 ? (
            <div className="py-20 text-center text-slate-400 text-sm font-medium">Nenhum comentário ainda. Seja o primeiro! ❤️</div>
          ) : (
            comments.map((c: any) => (
              <div key={c.id} className="flex gap-3">
                <AvatarWithFallback src={c.profiles?.avatar_url} className="w-8 h-8 rounded-full shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="bg-slate-50 rounded-2xl px-4 py-2.5 relative group">
                    <p className="text-[11px] font-black text-slate-900 leading-none mb-1">{c.profiles?.full_name}</p>
                    <p className="text-sm text-slate-700 font-medium leading-relaxed">{c.conteudo}</p>

                    {userId === c.user_id && (
                      <button
                        onClick={() => deleteComment.mutate(c.id)}
                        className="absolute -right-2 -top-2 w-6 h-6 rounded-full bg-white shadow-sm border border-slate-100 flex items-center justify-center text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                  <p className="text-[9px] text-slate-400 font-bold uppercase mt-1.5 ml-1">
                    {c.criado_em ? new Date(c.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ""}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        <form onSubmit={handleSubmit} className="pt-4 pb-2 flex gap-2">
          <input
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Escreva um comentário..."
            className="flex-1 h-12 px-4 rounded-xl bg-slate-50 border border-slate-100 placeholder:text-slate-400 text-sm focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all outline-none"
          />
          <button
            disabled={!newComment.trim() || addComment.isPending}
            className="w-12 h-12 rounded-xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/20 active:scale-95 transition-all disabled:opacity-30 disabled:grayscale"
          >
            {addComment.isPending ? <span className="w-4 h-4 border-2 border-white/30 border-t-white animate-spin rounded-full" /> : <Send size={18} />}
          </button>
        </form>
      </div>
    </ActionSheet>
  );
};
