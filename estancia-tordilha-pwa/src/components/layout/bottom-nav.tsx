import * as React from "react"
import { Home, NotebookText, Trophy, User } from "lucide-react"

import { cn } from "@/lib/utils"

export interface BottomNavProps extends React.HTMLAttributes<HTMLElement> { }

const BottomNav = React.forwardRef<HTMLElement, BottomNavProps>(
    ({ className, ...props }, ref) => {
        return (
            <nav
                ref={ref}
                className={cn(
                    "fixed bottom-0 z-50 w-full border-t bg-background-card pb-safe",
                    className
                )}
                {...props}
            >
                <div className="flex h-20 items-center justify-around px-2">
                    <NavItem icon={Home} label="Início" isActive />
                    <NavItem icon={NotebookText} label="Diário" />
                    <NavItem icon={Trophy} label="Conquistas" />
                    <NavItem icon={User} label="Perfil" />
                </div>
            </nav>
        )
    }
)
BottomNav.displayName = "BottomNav"

interface NavItemProps {
    icon: React.ElementType
    label: string
    isActive?: boolean
    onClick?: () => void
}

function NavItem({ icon: Icon, label, isActive, onClick }: NavItemProps) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "flex flex-col items-center justify-center space-y-1 w-16 p-2 rounded-2xl transition-colors",
                isActive
                    ? "text-accent-primary"
                    : "text-text-secondary hover:bg-accent-secondary/5"
            )}
        >
            <Icon className="h-6 w-6 stroke-[1.5]" />
            <span className="text-[10px] font-bold">{label}</span>
        </button>
    )
}

export { BottomNav }
