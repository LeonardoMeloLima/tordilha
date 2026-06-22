import React, { memo } from "react";
import { LayoutDashboard, Users, Calendar, BookOpen, TrendingUp, Plus, ChessKnight, UserPlus, CalendarPlus, ClipboardCheck, Inbox } from "lucide-react";
import type { Role } from "@/hooks/supabase/useRoleSession";
import { useSolicitacoes, useSolicitacoesPendentesCount } from "@/hooks/useSolicitacoes";

const PAIS_LAST_SEEN_KEY = "pais_solicitacoes_last_seen";

interface NavItem {
  label: string;
  icon: React.ReactNode;
  activeIcon: React.ReactNode;
  id: string;
}

const navConfig: Record<string, NavItem[]> = {
  gestor: [
    { label: "Dashboard", icon: <LayoutDashboard size={22} strokeWidth={1.5} />, activeIcon: <LayoutDashboard size={22} strokeWidth={1.5} />, id: "dashboard" },
    { label: "Praticantes", icon: <Users size={22} strokeWidth={1.5} />, activeIcon: <Users size={22} strokeWidth={1.5} />, id: "alunos" },
    { label: "Cavalos", icon: <ChessKnight size={22} strokeWidth={1.5} />, activeIcon: <ChessKnight size={22} strokeWidth={1.5} />, id: "cavalos" },
    { label: "Agenda", icon: <Calendar size={22} strokeWidth={1.5} />, activeIcon: <Calendar size={22} strokeWidth={1.5} />, id: "agenda" },
    { label: "Pendências", icon: <ClipboardCheck size={22} strokeWidth={1.5} />, activeIcon: <ClipboardCheck size={22} strokeWidth={1.5} />, id: "pendencias" },
  ],
  professor: [
    { label: "Agenda", icon: <Calendar size={22} strokeWidth={1.5} />, activeIcon: <Calendar size={22} strokeWidth={1.5} />, id: "agenda" },
    { label: "Praticantes", icon: <Users size={22} strokeWidth={1.5} />, activeIcon: <Users size={22} strokeWidth={1.5} />, id: "alunos" },
    { label: "Evolução", icon: <TrendingUp size={22} strokeWidth={1.5} />, activeIcon: <TrendingUp size={22} strokeWidth={1.5} />, id: "evolucao" },
    { label: "Cavalos", icon: <ChessKnight size={22} strokeWidth={1.5} />, activeIcon: <ChessKnight size={22} strokeWidth={1.5} />, id: "cavalos" },
    { label: "Pendências", icon: <ClipboardCheck size={22} strokeWidth={1.5} />, activeIcon: <ClipboardCheck size={22} strokeWidth={1.5} />, id: "pendencias" },
  ],
  pais: [
    { label: "Mural", icon: <BookOpen size={22} strokeWidth={1.5} />, activeIcon: <BookOpen size={22} strokeWidth={1.5} />, id: "mural" },
    { label: "Agenda", icon: <Calendar size={22} strokeWidth={1.5} />, activeIcon: <Calendar size={22} strokeWidth={1.5} />, id: "agenda" },
    { label: "Praticante", icon: <Users size={22} strokeWidth={1.5} />, activeIcon: <Users size={22} strokeWidth={1.5} />, id: "aluno" },
    { label: "Cavalos", icon: <ChessKnight size={22} strokeWidth={1.5} />, activeIcon: <ChessKnight size={22} strokeWidth={1.5} />, id: "cavalos" },
    { label: "Solicitações", icon: <Inbox size={22} strokeWidth={1.5} />, activeIcon: <Inbox size={22} strokeWidth={1.5} />, id: "solicitacoes" },
  ],
};

interface BottomNavProps {
  role: Role;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onFabClick?: () => void;
}

const ContextualFAB = ({ activeTab, onClick }: { activeTab: string, onClick?: () => void }) => {
  let Icon = Plus;
  if (activeTab === 'alunos' || activeTab === 'aluno') Icon = UserPlus;
  if (activeTab === 'agenda') Icon = CalendarPlus;

  return (
    <div className="relative -top-5 mx-1">
      <button
        onClick={onClick}
        aria-label="Ação rápida"
        className="w-16 h-16 rounded-full bg-[#4E593F] text-white flex items-center justify-center shadow-xl hover:scale-105 active:scale-95 transition-all duration-200"
      >
        <Icon size={28} strokeWidth={2.5} />
      </button>
    </div>
  );
};

function NavItemButton({
  item,
  isActive,
  onClick,
  badge,
}: {
  item: NavItem;
  isActive: boolean;
  onClick: () => void;
  badge?: number;
}) {
  return (
    <button
      key={item.id}
      onClick={onClick}
      aria-label={item.label}
      aria-current={isActive ? "page" : undefined}
      className={`flex flex-col items-center justify-center gap-1.5 min-w-[48px] transition-all duration-300 relative ${
        isActive ? "text-[#4E593F]" : "text-slate-400 hover:text-slate-600"
      }`}
    >
      <div className={`${isActive ? "scale-110 -translate-y-0.5" : "scale-100"} transition-all duration-300 flex flex-col items-center relative`}>
        {isActive ? item.activeIcon : item.icon}
        {badge !== undefined && badge > 0 && (
          <span
            className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center leading-none"
            aria-label={`${badge} novidades`}
          >
            {badge > 99 ? "99+" : badge}
          </span>
        )}
        {isActive && (
          <span className="absolute -bottom-1 w-1 h-1 rounded-full bg-[#4E593F] animate-in zoom-in duration-300" />
        )}
      </div>
    </button>
  );
}

export const BottomNav = memo(({ role, activeTab, onTabChange, onFabClick }: BottomNavProps) => {
  const items = navConfig[role];

  // Badges das solicitações
  const { data: pendentesCount = 0 } = useSolicitacoesPendentesCount();
  const { data: solicitacoesPais } = useSolicitacoes();
  const [ultimoAcesso, setUltimoAcesso] = React.useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(PAIS_LAST_SEEN_KEY);
  });
  const novasDecisoesPais = React.useMemo(() => {
    if (role !== "pais" || !solicitacoesPais) return 0;
    return solicitacoesPais.filter((s) => {
      if (!s.decidido_em) return false;
      if (!ultimoAcesso) return true;
      return new Date(s.decidido_em).getTime() > new Date(ultimoAcesso).getTime();
    }).length;
  }, [role, solicitacoesPais, ultimoAcesso]);

  const handleTabClick = (id: string) => {
    if (role === "pais" && id === "solicitacoes") {
      const now = new Date().toISOString();
      try {
        window.localStorage.setItem(PAIS_LAST_SEEN_KEY, now);
      } catch {
        // ignore (Safari private mode etc.)
      }
      setUltimoAcesso(now);
    }
    onTabChange(id);
  };

  const badgeFor = (id: string): number | undefined => {
    if (role === "gestor" && id === "pendencias") return pendentesCount;
    // DÍVIDA: useSolicitacoesPendentesCount não filtra por "quem precisa
    // aprovar". Pro terapeuta o RLS já filtra pra solicitações dos seus
    // praticantes — mas ainda pode contar novo_cadastro (que ele não decide)
    // ou alguma própria que ele criou pendente da contraparte. Aceitável
    // por enquanto; melhorar com hook dedicado depois.
    if (role === "professor" && id === "pendencias") return pendentesCount;
    if (role === "pais" && id === "solicitacoes") return novasDecisoesPais;
    return undefined;
  };

  // Split: metade dos itens à esquerda do FAB, resto à direita.
  // 4 itens → 2|FAB|2. 5 itens → 2|FAB|3.
  const leftCount = Math.min(2, Math.floor(items.length / 2));
  const leftItems = items.slice(0, leftCount);
  const rightItems = items.slice(leftCount);

  const showFab = (() => {
    if (role === "pais") return ["agenda", "mural", "aluno"].includes(activeTab);
    if (role === "professor") return !["alunos", "cavalos", "pendencias"].includes(activeTab);
    return !["pendencias"].includes(activeTab); // gestor
  })();

  return (
    <nav
      className="fixed left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-md z-40 bg-white rounded-[32px] card-shadow-lg px-2 flex justify-between items-center h-20"
      style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)" }}
    >
      <div className="flex flex-1 justify-around">
        {leftItems.map((item) => (
          <NavItemButton
            key={item.id}
            item={item}
            isActive={activeTab === item.id}
            onClick={() => handleTabClick(item.id)}
            badge={badgeFor(item.id)}
          />
        ))}
      </div>

      {showFab && <ContextualFAB activeTab={activeTab} onClick={onFabClick} />}

      <div className="flex flex-1 justify-around">
        {rightItems.map((item) => (
          <NavItemButton
            key={item.id}
            item={item}
            isActive={activeTab === item.id}
            onClick={() => handleTabClick(item.id)}
            badge={badgeFor(item.id)}
          />
        ))}
      </div>
    </nav>
  );
});

BottomNav.displayName = "BottomNav";
