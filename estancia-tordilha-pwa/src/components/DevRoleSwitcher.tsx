import { ShieldAlert } from "lucide-react";
import type { Role } from "@/hooks/supabase/useRoleSession";

interface DevRoleSwitcherProps {
    isSuperUser: boolean;
    activeRole: Role | null;
    onRoleChange: (role: Role) => void;
}

export function DevRoleSwitcher({ isSuperUser, activeRole, onRoleChange }: DevRoleSwitcherProps) {
    if (!isSuperUser || !activeRole) return null;

    return (
        <div className="flex items-center gap-1 border-2 border-dashed border-red-200 bg-red-50/50 rounded-full px-2 py-0.5 select-none" title="God Mode: Trocar Perfil">
            <ShieldAlert size={12} className="text-red-400" strokeWidth={2} />
            <select
                value={activeRole}
                onChange={(e) => onRoleChange(e.target.value as Role)}
                className="bg-transparent text-[9px] font-bold text-red-500 outline-none cursor-pointer appearance-none uppercase tracking-wider"
            >
                <option value="gestor">DEV: GESTOR</option>
                <option value="professor">DEV: PROFESSOR</option>
                <option value="pais">DEV: RESPONSÁVEL</option>
            </select>
        </div>
    );
}
