import React, { memo } from "react";
import { LayoutDashboard, Users, Calendar, BookOpen, Bell, TrendingUp, Plus, ChessKnight, UserPlus, CalendarPlus } from "lucide-react";
import type { Role } from "@/hooks/supabase/useRoleSession";

interface NavItem {
  label: string;
  icon: React.ReactNode;
  activeIcon: React.ReactNode;
  id: string;
}

const navConfig: Record<string, NavItem[]> = {
  gestor: [
    { label: "Dashboard", icon: <LayoutDashboard size={22} strokeWidth={1.5} />, activeIcon: <LayoutDashboard size={22} strokeWidth={1.5} />, id: "dashboard" },
    { label: "Alunos", icon: <Users size={22} strokeWidth={1.5} />, activeIcon: <Users size={22} strokeWidth={1.5} />, id: "alunos" },
    { label: "Cavalos", icon: <ChessKnight size={22} strokeWidth={1.5} />, activeIcon: <ChessKnight size={22} strokeWidth={1.5} />, id: "cavalos" },
    { label: "Agenda", icon: <Calendar size={22} strokeWidth={1.5} />, activeIcon: <Calendar size={22} strokeWidth={1.5} />, id: "agenda" },
  ],
  professor: [
    { label: "Agenda", icon: <Calendar size={22} strokeWidth={1.5} />, activeIcon: <Calendar size={22} strokeWidth={1.5} />, id: "agenda" },
    { label: "Alunos", icon: <Users size={22} strokeWidth={1.5} />, activeIcon: <Users size={22} strokeWidth={1.5} />, id: "alunos" },
    { label: "Evolução", icon: <TrendingUp size={22} strokeWidth={1.5} />, activeIcon: <TrendingUp size={22} strokeWidth={1.5} />, id: "evolucao" },
    { label: "Avisos", icon: <Bell size={22} strokeWidth={1.5} />, activeIcon: <Bell size={22} strokeWidth={1.5} />, id: "avisos" },
  ],
  pais: [
    { label: "Mural", icon: <BookOpen size={22} strokeWidth={1.5} />, activeIcon: <BookOpen size={22} strokeWidth={1.5} />, id: "mural" },
    { label: "Agenda", icon: <Calendar size={22} strokeWidth={1.5} />, activeIcon: <Calendar size={22} strokeWidth={1.5} />, id: "agenda" },
    { label: "Avisos", icon: <Bell size={22} strokeWidth={1.5} />, activeIcon: <Bell size={22} strokeWidth={1.5} />, id: "avisos" },
    { label: "Cavalos", icon: <ChessKnight size={22} strokeWidth={1.5} />, activeIcon: <ChessKnight size={22} strokeWidth={1.5} />, id: "cavalos" },
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
  if (activeTab === 'alunos') Icon = UserPlus;
  if (activeTab === 'agenda') Icon = CalendarPlus;

  return (
    <div className="relative -top-5 mx-1">
      <button
        onClick={onClick}
        className="w-16 h-16 rounded-full bg-[#EAB308] text-white flex items-center justify-center shadow-xl hover:scale-105 active:scale-95 transition-all duration-200"
      >
        <Icon size={28} strokeWidth={2.5} />
      </button>
    </div>
  );
};

export const BottomNav = memo(({ role, activeTab, onTabChange, onFabClick }: BottomNavProps) => {
  const items = navConfig[role];

  return (
    <nav
      className="fixed left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-md z-40 bg-white rounded-[32px] card-shadow-lg px-2 flex justify-between items-center h-20"
      style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)" }}
    >
      <div className="flex flex-1 justify-around">
        {items.slice(0, 2).map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`flex flex-col items-center justify-center gap-1.5 min-w-[56px] transition-all duration-300 relative ${isActive
                ? "text-[#EAB308]"
                : "text-slate-400 hover:text-slate-600"
                }`}
            >
              <div className={`${isActive ? 'scale-110 -translate-y-0.5' : 'scale-100'} transition-all duration-300 flex flex-col items-center`}>
                {isActive ? item.activeIcon : item.icon}
                {isActive && (
                  <span className="absolute -bottom-1 w-1 h-1 rounded-full bg-[#EAB308] animate-in zoom-in duration-300" />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {(() => {
        if (role === 'pais') return ['agenda', 'mural'].includes(activeTab);
        if (role === 'professor') return !['alunos', 'cavalos'].includes(activeTab);
        return true; // gestor
      })() && (
          <ContextualFAB activeTab={activeTab} onClick={onFabClick} />
        )}

      <div className="flex flex-1 justify-around">
        {items.slice(2, 4).map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`flex flex-col items-center justify-center gap-1.5 min-w-[56px] transition-all duration-300 relative ${isActive
                ? "text-[#EAB308]"
                : "text-slate-400 hover:text-slate-600"
                }`}
            >
              <div className={`${isActive ? 'scale-110 -translate-y-0.5' : 'scale-100'} transition-all duration-300 flex flex-col items-center`}>
                {isActive ? item.activeIcon : item.icon}
                {isActive && (
                  <span className="absolute -bottom-1 w-1 h-1 rounded-full bg-[#EAB308] animate-in zoom-in duration-300" />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </nav>
  );
});

BottomNav.displayName = "BottomNav";
