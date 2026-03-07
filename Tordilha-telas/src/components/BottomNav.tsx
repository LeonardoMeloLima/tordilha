import { useRole } from "@/contexts/RoleContext";
import { LayoutDashboard, Users, Calendar, BookOpen, Bell, TrendingUp } from "lucide-react";
import { GiHorseshoe } from "./icons/HorseIcon";

interface NavItem {
  label: string;
  icon: React.ReactNode;
  activeIcon: React.ReactNode;
  id: string;
}

const navConfig: Record<string, NavItem[]> = {
  gestor: [
    { label: "Dashboard", icon: <LayoutDashboard size={22} />, activeIcon: <LayoutDashboard size={22} />, id: "dashboard" },
    { label: "Alunos", icon: <Users size={22} />, activeIcon: <Users size={22} />, id: "alunos" },
    { label: "Cavalos", icon: <GiHorseshoe />, activeIcon: <GiHorseshoe />, id: "cavalos" },
    { label: "Agenda", icon: <Calendar size={22} />, activeIcon: <Calendar size={22} />, id: "agenda" },
  ],
  professor: [
    { label: "Agenda", icon: <Calendar size={22} />, activeIcon: <Calendar size={22} />, id: "agenda" },
    { label: "Alunos", icon: <Users size={22} />, activeIcon: <Users size={22} />, id: "alunos" },
    { label: "Evolução", icon: <TrendingUp size={22} />, activeIcon: <TrendingUp size={22} />, id: "evolucao" },
    { label: "Cavalos", icon: <GiHorseshoe />, activeIcon: <GiHorseshoe />, id: "cavalos" },
  ],
  pais: [
    { label: "Mural", icon: <BookOpen size={22} />, activeIcon: <BookOpen size={22} />, id: "mural" },
    { label: "Agenda", icon: <Calendar size={22} />, activeIcon: <Calendar size={22} />, id: "agenda" },
    { label: "Avisos", icon: <Bell size={22} />, activeIcon: <Bell size={22} />, id: "avisos" },
    { label: "Cavalos", icon: <GiHorseshoe />, activeIcon: <GiHorseshoe />, id: "cavalos" },
  ],
};

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const BottomNav = ({ activeTab, onTabChange }: BottomNavProps) => {
  const { role } = useRole();
  const items = navConfig[role];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40">
      <div className="max-w-lg mx-auto px-4 pb-2">
        <div className="bg-card rounded-3xl card-shadow-lg border border-border/50 px-2 py-2">
          <div className="flex justify-around items-center">
            {items.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`flex flex-col items-center justify-center gap-1 py-2.5 px-4 rounded-2xl transition-all ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {isActive ? item.activeIcon : item.icon}
                  <span className="text-[10px] font-bold">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
};
