import { useCavalos } from "@/hooks/useCavalos";
import { Heart, Move, Activity, Sparkles, Loader2 } from "lucide-react";
import { AvatarWithFallback } from "@/components/ui/AvatarWithFallback";

export const PaisCavalos = () => {
  const { cavalos, isLoading } = useCavalos();

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <Loader2 className="w-8 h-8 text-[#4E593F] animate-spin" />
        <p className="text-sm font-medium text-muted-foreground">Conhecendo os cavalos...</p>
      </div>
    );
  }

  if (!cavalos || cavalos.length === 0) {
    return (
      <div className="p-12 text-center bg-white rounded-[40px] border-2 border-dashed border-slate-100 flex flex-col items-center gap-4">
        <Sparkles size={48} className="text-slate-100" />
        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Nenhum cavalo cadastrado no momento</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-24">
      <div>
        <h1 className="text-xl font-extrabold text-foreground tracking-tight">Cavalos Terapeutas</h1>
        <p className="text-sm text-muted-foreground font-medium mt-0.5">Conheça o parceiro das atividades</p>
      </div>

      <div className="space-y-8">
        {cavalos.map((cavalo) => (
          <div key={cavalo.id} className="bg-card rounded-[40px] card-shadow overflow-hidden group border-2 border-transparent hover:border-[#F1F3EF] transition-all">
            <div className="h-64 bg-slate-100 relative overflow-hidden">
              <AvatarWithFallback
                src={cavalo.foto_url}
                className="w-full h-full transition-transform duration-700 group-hover:scale-110"
                type="horse"
              />
              <div className="absolute top-6 right-6 px-4 py-2 rounded-2xl bg-white/90 backdrop-blur-md text-[10px] font-black text-[#4E593F] uppercase tracking-widest flex items-center gap-2 shadow-sm border border-white">
                <Sparkles size={14} fill="#4E593F" />
                Terapeuta
              </div>
            </div>
            <div className="p-8 space-y-8">
              <div className="text-center">
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">{cavalo.nome}</h2>
                <p className="text-base text-slate-400 font-bold uppercase tracking-widest mt-1">{cavalo.raca || "Raça não informada"}</p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col items-center gap-2 p-4 rounded-3xl bg-[#F1F3EF] border border-[#8C9A7A]/10 transition-transform hover:scale-105">
                  <Activity size={24} className="text-[#4E593F]" />
                  <div className="flex flex-col items-center">
                    <span className="text-[11px] font-black text-slate-900 uppercase tracking-tight truncate w-full text-center">
                      {(cavalo.avaliacao_marcha as any)?.qualidade || "Regular"}
                    </span>
                    <span className="text-[9px] text-[#4E593F]/60 font-bold uppercase mt-0.5">Passo</span>
                  </div>
                </div>
                <div className="flex flex-col items-center gap-2 p-4 rounded-3xl bg-[#F1F3EF] border border-[#DDE2D6]/50 transition-transform hover:scale-105">
                  <Move size={24} className="text-[#3E4732]" />
                  <div className="flex flex-col items-center">
                    <span className="text-[11px] font-black text-slate-900 uppercase tracking-tight truncate w-full text-center" title={cavalo.movimento_3d_predominante || "Simétrico"}>
                      {cavalo.movimento_3d_predominante || "Simétrico"}
                    </span>
                    <span className="text-[9px] text-[#3E4732]/60 font-bold uppercase mt-0.5">Movimento 3D</span>
                  </div>
                </div>
                <div className="flex flex-col items-center gap-2 p-4 rounded-3xl bg-[#F1F3EF] border border-[#DDE2D6]/50 transition-transform hover:scale-105">
                  <Heart size={24} className="text-[#4E593F]" />
                  <div className="flex flex-col items-center">
                    <span className="text-[11px] font-black text-slate-900 uppercase tracking-tight truncate w-full text-center">
                      {cavalo.humor || "Dócil"}
                    </span>
                    <span className="text-[9px] text-[#4E593F]/60 font-bold uppercase mt-0.5">Humor</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-6 rounded-[24px] border border-slate-100">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center mb-2">Observações Gerais</div>
                <p className="text-sm text-slate-600 text-center leading-relaxed font-medium italic">
                  {cavalo.comentario ? `"${cavalo.comentario}"` : `"${cavalo.nome} é um parceiro vital nas sessões de equoterapia, trazendo tranquilidade e suporte para cada praticante."`}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
