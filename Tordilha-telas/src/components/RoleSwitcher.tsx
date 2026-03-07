import { useRole, Role } from "@/contexts/RoleContext";
import { Shield, GraduationCap, Users } from "lucide-react";

const roleLabels: Record<Role, { label: string; icon: React.ReactNode }> = {
  gestor: { label: "Gestor", icon: <Shield size={14} /> },
  professor: { label: "Professor", icon: <GraduationCap size={14} /> },
  pais: { label: "Pais", icon: <Users size={14} /> },
};

export const RoleSwitcher = () => {
  const { role, setRole } = useRole();

  return (
    <div className="flex gap-2">
      {(Object.keys(roleLabels) as Role[]).map((r) => (
        <button
          key={r}
          onClick={() => setRole(r)}
          className={`flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-bold transition-all ${
            r === role
              ? "bg-primary text-primary-foreground shadow-md"
              : "bg-card card-shadow text-muted-foreground hover:text-foreground"
          }`}
        >
          {roleLabels[r].icon}
          {roleLabels[r].label}
        </button>
      ))}
    </div>
  );
};
