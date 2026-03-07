import { sessoes, cavalos } from "@/data/mockData";
import { Calendar, Clock, AlertTriangle } from "lucide-react";

export const PaisAgenda = () => {
  const minhasSessoes = sessoes.filter((s) => s.alunoId === "1");

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-xl font-extrabold text-foreground">Agenda</h1>
        <p className="text-sm text-muted-foreground font-medium mt-0.5">Próximas sessões de Lucas</p>
      </div>

      <div className="space-y-3">
        {minhasSessoes.map((s) => {
          const cavalo = cavalos.find((c) => c.id === s.cavaloId);
          return (
            <div key={s.id} className="p-5 bg-card rounded-3xl card-shadow">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Calendar size={18} className="text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-base font-bold text-foreground">Sessão com {cavalo?.nome}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-muted-foreground font-medium">{s.data}</span>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground font-medium">
                      <Clock size={12} />
                      {s.hora}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <button
        className="w-full py-5 bg-destructive text-destructive-foreground rounded-3xl font-extrabold text-base touch-target flex items-center justify-center gap-3"
        style={{ boxShadow: '0 8px 24px hsla(0, 72%, 51%, 0.25)' }}
      >
        <AlertTriangle size={20} />
        Avisar Falta / Cancelar
      </button>
    </div>
  );
};
