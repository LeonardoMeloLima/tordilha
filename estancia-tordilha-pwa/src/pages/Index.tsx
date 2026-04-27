import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoleSession } from "@/hooks/supabase/useRoleSession";
import { ProfileHeader } from "@/components/ProfileHeader";
import { BottomNav } from "@/components/BottomNav";
import { PendingApprovalScreen } from "@/components/pais/PendingApprovalScreen";
import { supabase } from "@/lib/supabase";
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
import { PaisAlunoPerfil } from "@/components/pais/PaisAlunoPerfil";
import { PaisCavalos } from "@/components/pais/PaisCavalos";
import { CalendarPlus, HeartPulse, ShieldCheck, UserCog } from "lucide-react";
import { ActionSheet } from "@/components/ui/ActionSheet";
import { GestorAdminPanel } from "@/components/gestor/GestorAdminPanel";
import { ProfessorPasswordPrompt } from "@/components/professor/ProfessorPasswordPrompt";
import { PWAInstallBanner } from "@/components/ui/PWAInstallBanner";

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
    admin: <GestorAdminPanel />,
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
    aluno: <PaisAlunoPerfil />,
    cavalos: <PaisCavalos />,
  },
};

const Index = () => {
  const { role, userName, avatarUrl, loading, isSuperUser, isMaster, setDevRole } = useRoleSession();
  const safeRole = role || "gestor";

  // Verificar status de aprovação para responsáveis
  const { data: responsavelStatus, isLoading: statusLoading } = useQuery({
    queryKey: ["responsavel-status"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.email) return null;
      const { data } = await supabase
        .from("responsaveis")
        .select("status")
        .eq("email", session.user.email)
        .maybeSingle();
      return data?.status ?? null;
    },
    enabled: role === "pais",
    staleTime: 30000,
  });
  const [activeTab, setActiveTab] = useState(defaultTabs[safeRole]);
  const [showQuickActions, setShowQuickActions] = useState(false);

  useEffect(() => {
    setActiveTab(defaultTabs[safeRole]);
  }, [safeRole]); // Only reset tab when the user's role changes, NOT on every session refresh

  useEffect(() => {
    const handleFAB = () => {
      console.log(`FAB clicked Profile: ${safeRole}, Tab: ${activeTab}`);
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
        // Parents and Professors
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
    } else if (action === 'professor') {
      setActiveTab('admin');
      setTimeout(() => window.dispatchEvent(new CustomEvent('open-form-professor')), 100);
    } else if (action === 'novo-gestor') {
      setActiveTab('admin');
      setTimeout(() => window.dispatchEvent(new CustomEvent('open-form-gestor')), 100);
    }
  };

  if (loading || (role === "pais" && statusLoading)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Carregando perfil...</p>
      </div>
    );
  }

  // Bloquear acesso de responsáveis não aprovados
  if (role === "pais" && responsavelStatus && responsavelStatus !== "aprovado") {
    return <PendingApprovalScreen status={responsavelStatus} />;
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] w-full max-w-lg mx-auto relative overflow-x-hidden" style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 96px)" }}>
      <header className="sticky top-0 z-30 bg-[#F8F9FA]/95 backdrop-blur-md px-5 pt-8 pb-4">
        <ProfileHeader
          userName={userName}
          avatarUrl={avatarUrl}
          role={safeRole}
          isSuperUser={isSuperUser}
          isMaster={isMaster}
          onDevRoleChange={setDevRole}
          onAdminClick={() => setActiveTab('admin')}
        />
      </header>

      <main className="px-5 pt-2 pb-8">
        {screens[safeRole]?.[activeTab]}
        <ProfessorPasswordPrompt />
      </main>

      {/* Global Quick Actions (Gestor only) - Replicating User Print exactly */}
      <ActionSheet
        isOpen={showQuickActions}
        onClose={() => setShowQuickActions(false)}
        title="Ações Rápidas"
        subtitle="O que você deseja criar agora?"
      >
        <div className="flex flex-col gap-3 py-2">
          {/* Nova Sessão — temporariamente desativado
          <button
            type="button"
            onClick={() => handleQuickAction('sessao')}
            className="w-full flex items-center gap-3 p-3 rounded-[20px] bg-[#F8F9FA] hover:bg-[#F2F4F7] transition-all group active:scale-[0.98] text-left"
          >
            <div className="w-10 h-10 rounded-full bg-[#FFFBF2] flex items-center justify-center shadow-sm shrink-0">
              <CalendarPlus size={20} className="text-[#4E593F]" strokeWidth={1.5} />
            </div>
            <span className="font-bold text-base text-slate-900 tracking-tight">Nova Sessão</span>
          </button>
          */}

          {isMaster ? (
            <>
              <button
                type="button"
                onClick={() => handleQuickAction('professor')}
                className="w-full flex items-center gap-3 p-3 rounded-[20px] bg-[#F8F9FA] hover:bg-[#F2F4F7] transition-all group active:scale-[0.98] text-left"
              >
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shadow-sm shrink-0">
                  <UserCog size={20} className="text-blue-600" strokeWidth={1.5} />
                </div>
                <span className="font-bold text-base text-slate-900 tracking-tight">Novo Terapeuta</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickAction('novo-gestor')}
                className="w-full flex items-center gap-3 p-3 rounded-[20px] bg-[#F8F9FA] hover:bg-[#F2F4F7] transition-all group active:scale-[0.98] text-left"
              >
                <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center shadow-sm shrink-0">
                  <ShieldCheck size={20} className="text-indigo-600" strokeWidth={1.5} />
                </div>
                <span className="font-bold text-base text-slate-900 tracking-tight">Novo Gestor</span>
              </button>
            </>
          ) : (
            /* Non-master gestors don't create students anymore, but they might need something else? 
               For now, following instructions to remove Novo Aluno and add roles for master.
               The user said "cadastro de alunos não será mais uma incumbência de gestão".
            */
            null
          )}

          <button
            type="button"
            onClick={() => handleQuickAction('cavalo')}
            className="w-full flex items-center gap-3 p-3 rounded-[20px] bg-[#F8F9FA] hover:bg-[#F2F4F7] transition-all group active:scale-[0.98] text-left"
          >
            <div className="w-10 h-10 rounded-full bg-[#FFFBF2] flex items-center justify-center shadow-sm shrink-0">
              <HeartPulse size={20} className="text-[#4E593F]" strokeWidth={1.5} />
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

      <PWAInstallBanner />
    </div>
  );
};

export default Index;
