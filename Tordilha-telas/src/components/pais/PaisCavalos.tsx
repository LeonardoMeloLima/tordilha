import { cavalos } from "@/data/mockData";
import { Heart, Weight, Activity, Sparkles } from "lucide-react";

export const PaisCavalos = () => {
  const meuCavalo = cavalos[0];

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-xl font-extrabold text-foreground">O Cavalo Terapeuta</h1>
        <p className="text-sm text-muted-foreground font-medium mt-0.5">Conheça o parceiro do Lucas</p>
      </div>

      <div className="bg-card rounded-3xl card-shadow overflow-hidden">
        <div className="h-48 bg-gradient-to-br from-secondary/15 via-primary/8 to-accent/10 flex items-center justify-center relative">
          <span className="text-7xl">🐴</span>
          <div className="absolute top-4 right-4 px-3 py-1.5 rounded-full bg-card/80 backdrop-blur text-[10px] font-extrabold text-primary flex items-center gap-1">
            <Sparkles size={12} />
            Terapeuta
          </div>
        </div>
        <div className="p-6 space-y-5">
          <div className="text-center">
            <h2 className="text-2xl font-extrabold text-foreground">{meuCavalo.nome}</h2>
            <p className="text-sm text-muted-foreground font-semibold">{meuCavalo.raca}</p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-primary/8">
              <Activity size={20} className="text-primary" />
              <span className="text-xs font-extrabold text-foreground">{meuCavalo.status}</span>
              <span className="text-[10px] text-muted-foreground font-semibold">Status</span>
            </div>
            <div className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-secondary/8">
              <Weight size={20} className="text-secondary" />
              <span className="text-xs font-extrabold text-foreground">{meuCavalo.pesoMax}kg</span>
              <span className="text-[10px] text-muted-foreground font-semibold">Peso Máx</span>
            </div>
            <div className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-accent/10">
              <Heart size={20} className="text-accent" />
              <span className="text-xs font-extrabold text-foreground">Dócil</span>
              <span className="text-[10px] text-muted-foreground font-semibold">Temperamento</span>
            </div>
          </div>

          <p className="text-sm text-muted-foreground text-center leading-relaxed font-medium">
            {meuCavalo.nome} é um cavalo terapêutico experiente e muito gentil. Ele adora interagir com as crianças e é conhecido por sua calma e paciência durante as sessões.
          </p>
        </div>
      </div>
    </div>
  );
};
