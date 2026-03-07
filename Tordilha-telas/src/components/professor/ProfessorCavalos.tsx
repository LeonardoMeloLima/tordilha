import { cavalos } from "@/data/mockData";

export const ProfessorCavalos = () => {
  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-xl font-extrabold text-foreground">Cavalos</h1>
        <p className="text-sm text-muted-foreground font-medium mt-0.5">{cavalos.length} cavalos disponíveis</p>
      </div>
      <div className="space-y-3">
        {cavalos.map((c) => (
          <div key={c.id} className="flex items-center gap-4 p-5 bg-card rounded-3xl card-shadow">
            <div className="w-14 h-14 rounded-2xl bg-secondary/10 flex items-center justify-center text-2xl">🐴</div>
            <div className="flex-1">
              <p className="text-base font-bold text-foreground">{c.nome}</p>
              <p className="text-xs text-muted-foreground font-medium mt-0.5">{c.raca} · Até {c.pesoMax}kg</p>
            </div>
            <span className={`px-3 py-1.5 text-[10px] font-extrabold rounded-full ${c.status === "Ativo" ? "bg-primary/10 text-primary" : "bg-accent/20 text-accent-foreground"}`}>{c.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
