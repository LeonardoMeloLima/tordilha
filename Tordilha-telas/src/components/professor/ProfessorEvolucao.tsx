import { useState } from "react";
import { alunos } from "@/data/mockData";
import { CheckCircle, Mic, Save } from "lucide-react";

export const ProfessorEvolucao = () => {
  const [selectedAluno, setSelectedAluno] = useState(alunos[0]);
  const [checkedIn, setCheckedIn] = useState(false);
  const [notas, setNotas] = useState("");
  const [agitacao, setAgitacao] = useState(0);
  const [interacao, setInteracao] = useState(0);

  const scaleLabels = ["", "Muito Baixo", "Baixo", "Médio", "Alto", "Muito Alto"];

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-xl font-extrabold text-foreground">Evolução</h1>
        <p className="text-sm text-muted-foreground font-medium mt-0.5">Registrar progresso da sessão</p>
      </div>

      {/* Aluno selector */}
      <div className="bg-card rounded-3xl p-5 card-shadow">
        <label className="text-xs font-extrabold text-muted-foreground block mb-3">ALUNO</label>
        <select
          value={selectedAluno.id}
          onChange={(e) => setSelectedAluno(alunos.find((a) => a.id === e.target.value) || alunos[0])}
          className="w-full p-4 rounded-2xl bg-background text-sm font-bold border-0 focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          {alunos.slice(0, 3).map((a) => (
            <option key={a.id} value={a.id}>{a.nome}</option>
          ))}
        </select>
      </div>

      {/* Check-in button */}
      <button
        onClick={() => setCheckedIn(!checkedIn)}
        className={`w-full py-5 rounded-3xl font-extrabold text-base touch-target transition-all flex items-center justify-center gap-3 ${
          checkedIn
            ? "bg-primary/10 text-primary border-2 border-primary"
            : "bg-primary text-primary-foreground"
        }`}
        style={!checkedIn ? { boxShadow: '0 8px 24px hsla(146, 51%, 36%, 0.35)' } : {}}
      >
        <CheckCircle size={24} />
        {checkedIn ? "Check-in Realizado ✓" : "Realizar Check-in"}
      </button>

      {/* Session Notes */}
      <div className="bg-card rounded-3xl p-5 card-shadow space-y-3">
        <label className="text-xs font-extrabold text-muted-foreground">NOTAS DA SESSÃO</label>
        <div className="relative">
          <textarea
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="Descreva o progresso do aluno nesta sessão..."
            rows={4}
            className="w-full p-4 pr-14 rounded-2xl bg-background text-sm font-medium resize-none border-0 focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <button className="absolute right-3 bottom-3 w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
            <Mic size={18} />
          </button>
        </div>
      </div>

      {/* Behavior scales */}
      <div className="bg-card rounded-3xl p-5 card-shadow space-y-6">
        <h3 className="text-sm font-extrabold text-foreground">Comportamento</h3>

        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-xs font-extrabold text-muted-foreground">AGITAÇÃO</label>
            {agitacao > 0 && <span className="text-xs font-bold text-accent-foreground">{scaleLabels[agitacao]}</span>}
          </div>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => setAgitacao(n)}
                className={`flex-1 py-4 rounded-full font-extrabold text-sm touch-target transition-all ${
                  agitacao === n
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "bg-background text-muted-foreground border-2 border-transparent hover:border-primary/20"
                }`}
                style={agitacao === n ? { boxShadow: '0 4px 16px hsla(146, 51%, 36%, 0.3)' } : {}}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-xs font-extrabold text-muted-foreground">INTERAÇÃO</label>
            {interacao > 0 && <span className="text-xs font-bold text-primary">{scaleLabels[interacao]}</span>}
          </div>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => setInteracao(n)}
                className={`flex-1 py-4 rounded-full font-extrabold text-sm touch-target transition-all ${
                  interacao === n
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "bg-background text-muted-foreground border-2 border-transparent hover:border-primary/20"
                }`}
                style={interacao === n ? { boxShadow: '0 4px 16px hsla(146, 51%, 36%, 0.3)' } : {}}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      </div>

      <button
        className="w-full py-5 bg-primary text-primary-foreground rounded-3xl font-extrabold text-base touch-target flex items-center justify-center gap-3"
        style={{ boxShadow: '0 8px 24px hsla(146, 51%, 36%, 0.35)' }}
      >
        <Save size={20} />
        Salvar Evolução
      </button>
    </div>
  );
};
