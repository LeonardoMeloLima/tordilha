import { useCavalos } from "@/hooks/useCavalos";
import { Heart, Weight, Activity, Sparkles, Loader2 } from "lucide-react";
import { AvatarWithFallback } from "@/components/ui/AvatarWithFallback";

export const PaisCavalos = () => {
  const { cavalos, isLoading } = useCavalos();
  const meuCavalo = cavalos?.[0];

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <Loader2 className="w-8 h-8 text-[#EAB308] animate-spin" />
        <p className="text-sm font-medium text-muted-foreground">Conhecendo os cavalos...</p>
      </div>
    );
  }

  if (!meuCavalo) {
    return (
      <div className="p-12 text-center bg-white rounded-[40px] border-2 border-dashed border-slate-100 flex flex-col items-center gap-4">
        <Sparkles size={48} className="text-slate-100" />
        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Nenhum cavalo atribuído ainda</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-24">
      <div>
        <h1 className="text-xl font-extrabold text-foreground tracking-tight">O Cavalo Terapeuta</h1>
        <p className="text-sm text-muted-foreground font-medium mt-0.5">Conheça o parceiro das atividades</p>
      </div>

      <div className="bg-card rounded-[40px] card-shadow overflow-hidden group border-2 border-transparent hover:border-amber-50 transition-all">
        <div className="h-64 bg-slate-100 relative overflow-hidden">
          <AvatarWithFallback
            src={meuCavalo.foto_url}
            className="w-full h-full"
            type="horse"
          />
          <div className="absolute top-6 right-6 px-4 py-2 rounded-2xl bg-white/90 backdrop-blur-md text-[10px] font-black text-[#EAB308] uppercase tracking-widest flex items-center gap-2 shadow-sm border border-white">
            <Sparkles size={14} fill="#EAB308" />
            Terapeuta
          </div>
        </div>
        <div className="p-8 space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">{meuCavalo.nome}</h2>
            <p className="text-base text-slate-400 font-bold uppercase tracking-widest mt-1">{meuCavalo.raca || "Raça não informada"}</p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col items-center gap-2 p-5 rounded-3xl bg-emerald-50 border border-emerald-100 transition-transform hover:scale-105">
              <Activity size={24} className="text-emerald-600" />
              <div className="flex flex-col items-center">
                <span className="text-xs font-black text-slate-900 uppercase tracking-tight">{meuCavalo.status}</span>
                <span className="text-[10px] text-emerald-600/60 font-bold uppercase mt-0.5">Status</span>
              </div>
            </div>
            <div className="flex flex-col items-center gap-2 p-5 rounded-3xl bg-amber-50 border border-amber-100 transition-transform hover:scale-105">
              <Weight size={24} className="text-amber-600" />
              <div className="flex flex-col items-center">
                <span className="text-xs font-black text-slate-900 uppercase tracking-tight">Dócil</span>
                <span className="text-[10px] text-amber-600/60 font-bold uppercase mt-0.5">Humor</span>
              </div>
            </div>
            <div className="flex flex-col items-center gap-2 p-5 rounded-3xl bg-rose-50 border border-rose-100 transition-transform hover:scale-105">
              <Heart size={24} className="text-rose-600" fill="currentColor" />
              <div className="flex flex-col items-center">
                <span className="text-xs font-black text-slate-900 uppercase tracking-tight">Cuidado</span>
                <span className="text-[10px] text-rose-600/60 font-bold uppercase mt-0.5">Perfil</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 p-6 rounded-[24px] border border-slate-100">
            <p className="text-sm text-slate-600 text-center leading-relaxed font-medium italic">
              "{meuCavalo.nome} é um cavalo terapêutico experiente e muito gentil. Ele adora interagir e é conhecido por sua calma e paciência extrema durante as sessões."
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
