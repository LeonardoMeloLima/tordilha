import { avisos } from "@/data/mockData";
import { AlertTriangle, PartyPopper, Info } from "lucide-react";

const icons = {
  alerta: <AlertTriangle size={20} className="text-destructive" />,
  evento: <PartyPopper size={20} className="text-accent" />,
  info: <Info size={20} className="text-primary" />,
};

const bgColors = {
  alerta: "bg-destructive/8",
  evento: "bg-accent/10",
  info: "bg-primary/8",
};

export const PaisAvisos = () => {
  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-xl font-extrabold text-foreground">Avisos</h1>
        <p className="text-sm text-muted-foreground font-medium mt-0.5">{avisos.length} avisos recentes</p>
      </div>
      <div className="space-y-3">
        {avisos.map((a) => (
          <div key={a.id} className="p-5 bg-card rounded-3xl card-shadow">
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-2xl ${bgColors[a.tipo]} flex items-center justify-center flex-shrink-0`}>
                {icons[a.tipo]}
              </div>
              <div className="flex-1">
                <p className="text-sm font-extrabold text-foreground">{a.titulo}</p>
                <p className="text-xs text-muted-foreground font-medium mt-1 leading-relaxed">{a.mensagem}</p>
                <p className="text-[10px] text-muted-foreground font-semibold mt-2">{a.data}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
