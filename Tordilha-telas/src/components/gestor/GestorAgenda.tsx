import { useState } from "react";
import { sessoes, alunos, cavalos } from "@/data/mockData";
import { Clock, User } from "lucide-react";

const days = [
  { date: "2026-03-04", day: "4", weekday: "Qua" },
  { date: "2026-03-05", day: "5", weekday: "Qui" },
  { date: "2026-03-06", day: "6", weekday: "Sex" },
  { date: "2026-03-07", day: "7", weekday: "Sáb" },
  { date: "2026-03-08", day: "8", weekday: "Dom" },
  { date: "2026-03-09", day: "9", weekday: "Seg" },
  { date: "2026-03-10", day: "10", weekday: "Ter" },
];

export const GestorAgenda = () => {
  const [selectedDay, setSelectedDay] = useState("2026-03-05");
  const daySessoes = sessoes.filter((s) => s.data === selectedDay);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-extrabold text-foreground">Agenda</h1>
        <p className="text-sm text-muted-foreground font-medium mt-0.5">Março 2026</p>
      </div>

      {/* Horizontal calendar */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-none">
        {days.map((d) => (
          <button
            key={d.date}
            onClick={() => setSelectedDay(d.date)}
            className={`flex flex-col items-center justify-center min-w-[56px] h-[72px] rounded-2xl transition-all font-bold ${
              selectedDay === d.date
                ? "bg-primary text-primary-foreground shadow-md"
                : "bg-card card-shadow text-foreground"
            }`}
            style={selectedDay === d.date ? { boxShadow: '0 6px 20px hsla(146, 51%, 36%, 0.3)' } : {}}
          >
            <span className={`text-[10px] font-semibold ${selectedDay === d.date ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{d.weekday}</span>
            <span className="text-lg font-extrabold">{d.day}</span>
          </button>
        ))}
      </div>

      {/* Sessions */}
      <div className="space-y-3">
        {daySessoes.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-sm font-semibold">Nenhuma sessão neste dia</p>
          </div>
        )}
        {daySessoes.map((s) => {
          const aluno = alunos.find((a) => a.id === s.alunoId);
          const cavalo = cavalos.find((c) => c.id === s.cavaloId);
          return (
            <div key={s.id} className="flex items-center gap-4 p-5 bg-card rounded-3xl card-shadow">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                <User size={20} className="text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-foreground">{aluno?.nome}</p>
                <p className="text-xs text-muted-foreground font-medium">c/ {cavalo?.nome}</p>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1.5 text-sm font-bold text-foreground">
                  <Clock size={14} />
                  {s.hora}
                </div>
                <span className={`text-[10px] font-extrabold ${s.status === "confirmada" ? "text-primary" : "text-accent-foreground"}`}>
                  {s.status === "confirmada" ? "Confirmada" : "Pendente"}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
