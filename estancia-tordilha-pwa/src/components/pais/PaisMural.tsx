import { useMural } from "@/hooks/useMural";
import { Lock, Award, Camera, Heart } from "lucide-react";

export const PaisMural = () => {
  const { posts, isLoading } = useMural();

  return (
    <div className="space-y-6 animate-fade-in pb-24">
      <div>
        <h1 className="text-xl font-extrabold text-foreground tracking-tight">Mural</h1>
        <p className="text-sm text-muted-foreground font-medium mt-0.5">Momentos especiais do seu pequeno</p>
      </div>

      {/* LGPD Glassmorphism card */}
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
          <button type="button" className="w-full px-6 py-4 bg-white text-slate-900 rounded-2xl text-xs font-black uppercase tracking-widest active:scale-[0.98] transition-all shadow-sm">
            Gerenciar Consentimento
          </button>
        </div>
      </div>

      <div className="space-y-4">
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
          posts.map((post) => (
            <div key={post.id} className="bg-card rounded-[32px] card-shadow overflow-hidden group">
              {post.tipo === "foto" ? (
                <div className="aspect-square bg-slate-100 relative overflow-hidden">
                  {post.media_url ? (
                    <img src={post.media_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Camera size={40} className="text-slate-200" />
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-2 bg-[#EAB308]" />
              )}
              <div className="p-6">
                <p className="text-base font-medium text-slate-800 leading-relaxed">{post.descricao}</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-4">
                  {post.criado_em ? new Date(post.criado_em).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' }) : ""}
                </p>
                {post.badge && (
                  <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-amber-50 rounded-full border border-amber-100">
                    <Award size={14} className="text-[#EAB308]" />
                    <span className="text-[10px] font-black text-[#B45309] uppercase tracking-tight">{post.badge}</span>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
