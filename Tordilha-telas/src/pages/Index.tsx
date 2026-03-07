import { useState, useEffect } from "react";
import { useRole } from "@/contexts/RoleContext";
import { RoleSwitcher } from "@/components/RoleSwitcher";
import { BottomNav } from "@/components/BottomNav";
import { GestorDashboard } from "@/components/gestor/GestorDashboard";
import { GestorAlunos } from "@/components/gestor/GestorAlunos";
import { GestorCavalos } from "@/components/gestor/GestorCavalos";
import { GestorAgenda } from "@/components/gestor/GestorAgenda";
import { ProfessorAgenda } from "@/components/professor/ProfessorAgenda";
import { ProfessorAlunos } from "@/components/professor/ProfessorAlunos";
import { ProfessorEvolucao } from "@/components/professor/ProfessorEvolucao";
import { ProfessorCavalos } from "@/components/professor/ProfessorCavalos";
import { PaisMural } from "@/components/pais/PaisMural";
import { PaisAgenda } from "@/components/pais/PaisAgenda";
import { PaisAvisos } from "@/components/pais/PaisAvisos";
import { PaisCavalos } from "@/components/pais/PaisCavalos";
import { Bell, Search } from "lucide-react";
import logo from "@/assets/logo.png";

const defaultTabs: Record<string, string> = {
  gestor: "dashboard",
  professor: "agenda",
  pais: "mural",
};

const screens: Record<string, Record<string, React.ReactNode>> = {
  gestor: {
    dashboard: <GestorDashboard />,
    alunos: <GestorAlunos />,
    cavalos: <GestorCavalos />,
    agenda: <GestorAgenda />,
  },
  professor: {
    agenda: <ProfessorAgenda />,
    alunos: <ProfessorAlunos />,
    evolucao: <ProfessorEvolucao />,
    cavalos: <ProfessorCavalos />,
  },
  pais: {
    mural: <PaisMural />,
    agenda: <PaisAgenda />,
    avisos: <PaisAvisos />,
    cavalos: <PaisCavalos />,
  },
};

const greetings: Record<string, string> = {
  gestor: "Olá, Gestor 👋",
  professor: "Olá, Professor 👋",
  pais: "Olá, Família 👋",
};

const Index = () => {
  const { role } = useRole();
  const [activeTab, setActiveTab] = useState(defaultTabs[role]);

  useEffect(() => {
    setActiveTab(defaultTabs[role]);
  }, [role]);

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto">
      <header className="sticky top-0 z-30 glass border-b border-border/50 px-5 py-4">
        <div className="flex items-center justify-between">
          <img src={logo} alt="Estância Tordilha" className="h-10 object-contain mix-blend-multiply" />
          <div className="flex items-center gap-2">
            <button className="w-11 h-11 rounded-2xl bg-card card-shadow flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
              <Search size={18} />
            </button>
            <button className="w-11 h-11 rounded-2xl bg-card card-shadow flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors relative">
              <Bell size={18} />
              <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-destructive rounded-full border-2 border-card" />
            </button>
          </div>
        </div>
        <div className="mt-2">
          <p className="text-xs text-muted-foreground font-semibold">Bem-vindo de volta</p>
          <h2 className="text-lg font-extrabold tracking-tight text-foreground">{greetings[role]}</h2>
        </div>
        <div className="mt-3">
          <RoleSwitcher />
        </div>
      </header>

      <main className="px-5 py-5 pb-28">
        {screens[role]?.[activeTab]}
      </main>

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};

export default Index;
