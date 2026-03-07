import { useState } from "react";
import { sessoes, alunos, cavalos } from "@/data/mockData";
import { WifiOff, Clock, User, Play } from "lucide-react";

const days = [
  { date: "2026-03-04", day: "4", weekday: "Qua" },
  { date: "2026-03-05", day: "5", weekday: "Qui" },
  { date: "2026-03-06", day: "6", weekday: "Sex" },
  { date: "2026-03-07", day: "7", weekday: "Sáb" },
];

export const ProfessorAgenda = () => {
  const [selectedDay, setSelectedDay] = useState("2026-03-05");
  const todaySessoes = sessoes.filter((s) => s.data === selectedDay && s.professorId === "1");

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-foreground">Minha Agenda</h1>
          <p className="text-sm text-muted-foreground font-medium mt-0.5">Quinta-feira, 5 de Março</p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-accent/15 text-accent-foreground text-[10px] font-extrabold">
          <WifiOff size={12} />
          Offline
        </div>
      </div>

      {/* Horizontal calendar */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
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

      <div className="space-y-3">
        {todaySessoes.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-sm font-semibold">Nenhuma sessão neste dia</p>
          </div>
        )}
        {todaySessoes.map((s) => {
          const aluno = alunos.find((a) => a.id === s.alunoId);
          const cavalo = cavalos.find((c) => c.id === s.cavaloId);
          return (
            <div key={s.id} className="bg-card rounded-3xl card-shadow p-5">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <User size={22} className="text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-base font-bold text-foreground">{aluno?.nome}</p>
                  <p className="text-xs text-muted-foreground font-medium mt-0.5">c/ {cavalo?.nome} · {aluno?.diagnostico}</p>
                </div>
                <div className="flex items-center gap-1.5 text-sm font-bold text-muted-foreground">
                  <Clock size={14} />
                  {s.hora}
                </div>
              </div>
              <button className="w-full mt-4 py-3.5 bg-primary text-primary-foreground rounded-2xl font-extrabold text-sm flex items-center justify-center gap-2 touch-target" style={{ boxShadow: '0 6px 20px hsla(146, 51%, 36%, 0.25)' }}>
                <Play size={16} />
                Iniciar Sessão
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
