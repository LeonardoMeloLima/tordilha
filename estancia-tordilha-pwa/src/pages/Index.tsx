import { useState, useEffect } from "react";
import { useRoleSession } from "@/hooks/supabase/useRoleSession";
import { ProfileHeader } from "@/components/ProfileHeader";
import { BottomNav } from "@/components/BottomNav";
import { GestorDashboard } from "@/components/gestor/GestorDashboard";
import { GestorAlunos } from "@/components/gestor/GestorAlunos";
import { GestorCavalos } from "@/components/gestor/GestorCavalos";
import { GestorAgenda } from "@/components/gestor/GestorAgenda";
import { ProfessorAgenda } from "@/components/professor/ProfessorAgenda";
import { ProfessorAlunos } from "@/components/professor/ProfessorAlunos";
import { ProfessorEvolucao } from "@/components/professor/ProfessorEvolucao";
import { ProfessorAvisos } from "@/components/professor/ProfessorAvisos";
import { PaisMural } from "@/components/pais/PaisMural";
import { PaisAgenda } from "@/components/pais/PaisAgenda";
import { PaisAvisos } from "@/components/pais/PaisAvisos";
import { PaisCavalos } from "@/components/pais/PaisCavalos";
import { CalendarPlus, UserPlus, HeartPulse } from "lucide-react";
import { ActionSheet } from "@/components/ui/ActionSheet";

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
    avisos: <ProfessorAvisos />,
  },
  pais: {
    mural: <PaisMural />,
    agenda: <PaisAgenda />,
    avisos: <PaisAvisos />,
    cavalos: <PaisCavalos />,
  },
};

const Index = () => {
  const { role, userName, avatarUrl, loading, isSuperUser, setDevRole } = useRoleSession();
  const safeRole = role || "gestor";
  const [activeTab, setActiveTab] = useState(defaultTabs[safeRole]);
  const [showQuickActions, setShowQuickActions] = useState(false);

  useEffect(() => {
    setActiveTab(defaultTabs[safeRole]);
  }, [safeRole]); // Only reset tab when the user's role changes, NOT on every session refresh

  useEffect(() => {
    const handleFAB = () => {
      if (safeRole === 'gestor') {
        if (activeTab === 'dashboard') {
          setShowQuickActions(true);
        } else if (activeTab === 'alunos') {
          window.dispatchEvent(new CustomEvent('open-form-aluno'));
        } else if (activeTab === 'cavalos') {
          window.dispatchEvent(new CustomEvent('open-form-cavalo'));
        } else if (activeTab === 'agenda') {
          window.dispatchEvent(new CustomEvent('open-form-sessao'));
        } else {
          setShowQuickActions(true);
        }
      } else {
        window.dispatchEvent(new CustomEvent('fab-click-local'));
      }
    };

    const handleIniciarSessao = (e: Event) => {
      const { sessaoId } = (e as CustomEvent).detail;
      setActiveTab('evolucao');
      // Small delay to let the tab render before pre-selecting
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('sessao-preselect', { detail: { sessaoId } }));
      }, 100);
    };

    const handleChangeTab = (e: Event) => {
      const { tab } = (e as CustomEvent).detail;
      if (tab) setActiveTab(tab);
    };

    window.addEventListener('fab-click', handleFAB);
    window.addEventListener('iniciar-sessao', handleIniciarSessao);
    window.addEventListener('change-tab', handleChangeTab);
    return () => {
      window.removeEventListener('fab-click', handleFAB);
      window.removeEventListener('iniciar-sessao', handleIniciarSessao);
      window.removeEventListener('change-tab', handleChangeTab);
    };
  }, [safeRole, activeTab]);

  const handleQuickAction = (action: string) => {
    setShowQuickActions(false);
    if (action === 'sessao') {
      setActiveTab('agenda');
      setTimeout(() => window.dispatchEvent(new CustomEvent('open-form-sessao')), 100);
    } else if (action === 'aluno') {
      setActiveTab('alunos');
      setTimeout(() => window.dispatchEvent(new CustomEvent('open-form-aluno')), 100);
    } else if (action === 'cavalo') {
      setActiveTab('cavalos');
      setTimeout(() => window.dispatchEvent(new CustomEvent('open-form-cavalo')), 100);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Carregando perfil...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] w-full max-w-lg mx-auto relative overflow-x-hidden" style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 96px)" }}>
      <header className="sticky top-0 z-30 bg-[#F8F9FA]/95 backdrop-blur-md px-5 pt-8 pb-4">
        <ProfileHeader
          userName={userName}
          avatarUrl={avatarUrl}
          role={safeRole}
          isSuperUser={isSuperUser}
          onDevRoleChange={setDevRole}
        />
      </header>

      <main className="px-5 pt-2 pb-8">
        {screens[safeRole]?.[activeTab]}
      </main>

      {/* Global Quick Actions (Gestor only) - Replicating User Print exactly */}
      <ActionSheet
        isOpen={showQuickActions}
        onClose={() => setShowQuickActions(false)}
        title="Ações Rápidas"
        subtitle="O que você deseja criar agora?"
      >
        <div className="flex flex-col gap-3 py-2">
          <button
            type="button"
            onClick={() => handleQuickAction('sessao')}
            className="w-full flex items-center gap-3 p-3 rounded-[20px] bg-[#F8F9FA] hover:bg-[#F2F4F7] transition-all group active:scale-[0.98] text-left"
          >
            <div className="w-10 h-10 rounded-full bg-[#FFFBF2] flex items-center justify-center shadow-sm shrink-0">
              <CalendarPlus size={20} className="text-amber-500" strokeWidth={1.5} />
            </div>
            <span className="font-bold text-base text-slate-900 tracking-tight">Nova Sessão</span>
          </button>

          <button
            type="button"
            onClick={() => handleQuickAction('aluno')}
            className="w-full flex items-center gap-3 p-3 rounded-[20px] bg-[#F8F9FA] hover:bg-[#F2F4F7] transition-all group active:scale-[0.98] text-left"
          >
            <div className="w-10 h-10 rounded-full bg-[#FFF5F5] flex items-center justify-center shadow-sm shrink-0">
              <UserPlus size={20} className="text-pink-600" strokeWidth={1.5} />
            </div>
            <span className="font-bold text-base text-slate-900 tracking-tight">Novo Aluno</span>
          </button>

          <button
            type="button"
            onClick={() => handleQuickAction('cavalo')}
            className="w-full flex items-center gap-3 p-3 rounded-[20px] bg-[#F8F9FA] hover:bg-[#F2F4F7] transition-all group active:scale-[0.98] text-left"
          >
            <div className="w-10 h-10 rounded-full bg-[#FFFBF2] flex items-center justify-center shadow-sm shrink-0">
              <HeartPulse size={20} className="text-amber-500" strokeWidth={1.5} />
            </div>
            <span className="font-bold text-base text-slate-900 tracking-tight">Novo Cavalo</span>
          </button>
        </div>
      </ActionSheet>

      <BottomNav
        role={safeRole}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onFabClick={() => window.dispatchEvent(new CustomEvent('fab-click'))}
      />
    </div>
  );
};

export default Index;
