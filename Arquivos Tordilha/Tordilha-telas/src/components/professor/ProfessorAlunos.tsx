import { alunos } from "@/data/mockData";
import { User, Phone } from "lucide-react";

export const ProfessorAlunos = () => {
  const meusAlunos = alunos.slice(0, 3);

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-xl font-extrabold text-foreground">Meus Alunos</h1>
        <p className="text-sm text-muted-foreground font-medium mt-0.5">{meusAlunos.length} alunos atribuídos</p>
      </div>
      <div className="space-y-3">
        {meusAlunos.map((a) => (
          <div key={a.id} className="bg-card rounded-3xl card-shadow p-5">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-secondary/10 flex items-center justify-center">
                <User size={22} className="text-secondary" />
              </div>
              <div className="flex-1">
                <p className="text-base font-bold text-foreground">{a.nome}</p>
                <p className="text-xs text-muted-foreground font-medium mt-0.5">{a.diagnostico} · {a.idade} anos</p>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-3 p-3.5 rounded-2xl bg-background">
              <Phone size={14} className="text-muted-foreground" />
              <span className="text-xs font-semibold text-muted-foreground">{a.contatoEmergencia}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
