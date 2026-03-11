import { muralPosts } from "@/data/mockData";
import { Lock, Award, Camera } from "lucide-react";

export const PaisMural = () => {
  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-xl font-extrabold text-foreground">Mural</h1>
        <p className="text-sm text-muted-foreground font-medium mt-0.5">Momentos especiais do Lucas</p>
      </div>

      {/* LGPD Glassmorphism card */}
      <div className="relative rounded-3xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-secondary/10 to-accent/15 backdrop-blur-sm" />
        <div className="relative p-6 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-card/80 backdrop-blur flex items-center justify-center">
            <Lock size={20} className="text-foreground" />
          </div>
          <h3 className="text-base font-extrabold text-foreground">Consentimento de Imagem</h3>
          <p className="text-xs text-muted-foreground font-medium leading-relaxed">
            Para visualizar novas fotos, confirme o consentimento de imagem conforme a LGPD.
          </p>
          <button className="px-6 py-3.5 bg-card text-foreground rounded-2xl text-xs font-extrabold touch-target card-shadow">
            Gerenciar Consentimento
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {muralPosts.map((post) => (
          <div key={post.id} className="bg-card rounded-3xl card-shadow overflow-hidden">
            {post.tipo === "foto" && (
              <div className="h-44 bg-gradient-to-br from-primary/8 via-secondary/5 to-accent/8 flex items-center justify-center">
                <Camera size={36} className="text-muted-foreground/20" />
              </div>
            )}
            <div className="p-5">
              <p className="text-sm font-semibold text-foreground leading-relaxed">{post.descricao}</p>
              <p className="text-xs text-muted-foreground font-medium mt-2">{post.data}</p>
              {post.badge && (
                <div className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-accent/15 rounded-full">
                  <Award size={14} className="text-accent" />
                  <span className="text-xs font-extrabold text-accent-foreground">{post.badge}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
