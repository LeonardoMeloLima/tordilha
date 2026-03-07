import { Users, Calendar, BarChart3, Heart, ChevronRight } from "lucide-react";

const metrics = [
  { label: "Alunos Ativos", value: "24", icon: <Users size={20} />, gradient: "from-primary/10 to-primary/5", iconColor: "text-primary" },
  { label: "Sessões Hoje", value: "8", icon: <Calendar size={20} />, gradient: "from-secondary/10 to-secondary/5", iconColor: "text-secondary" },
  { label: "Taxa de Presença", value: "92%", icon: <BarChart3 size={20} />, gradient: "from-primary/10 to-primary/5", iconColor: "text-primary" },
  { label: "Cavalos Ativos", value: "3/4", icon: <Heart size={20} />, gradient: "from-accent/15 to-accent/5", iconColor: "text-accent-foreground" },
];

const upcomingSessions = [
  { time: "08:00", student: "Lucas Silva", horse: "Tordilho", status: "confirmada" },
  { time: "09:30", student: "Maria Fernanda", horse: "Estrela", status: "confirmada" },
  { time: "14:00", student: "João Pedro", horse: "Tordilho", status: "pendente" },
];

export const GestorDashboard = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-extrabold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground font-medium mt-0.5">Visão geral de hoje</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {metrics.map((m) => (
          <div key={m.label} className="bg-card rounded-3xl p-5 card-shadow">
            <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${m.gradient} flex items-center justify-center mb-4 ${m.iconColor}`}>
              {m.icon}
            </div>
            <p className="text-3xl font-extrabold text-foreground">{m.value}</p>
            <p className="text-xs text-muted-foreground font-semibold mt-1">{m.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-card rounded-3xl p-5 card-shadow">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-extrabold text-base text-foreground">Próximas Sessões</h2>
          <button className="text-xs font-bold text-primary flex items-center gap-0.5">
            Ver todas <ChevronRight size={14} />
          </button>
        </div>
        <div className="space-y-3">
          {upcomingSessions.map((s, i) => (
            <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-background">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Calendar size={18} className="text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-foreground">{s.student}</p>
                <p className="text-xs text-muted-foreground font-medium">c/ {s.horse} · {s.time}</p>
              </div>
              <span className={`px-3 py-1.5 text-[10px] font-extrabold rounded-full ${
                s.status === "confirmada" 
                  ? "bg-primary/10 text-primary" 
                  : "bg-accent/20 text-accent-foreground"
              }`}>
                {s.status === "confirmada" ? "Confirmada" : "Pendente"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
