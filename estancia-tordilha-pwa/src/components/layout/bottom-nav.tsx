import * as React from "react"
import { Home, NotebookText, Trophy, User, Inbox, Bell } from "lucide-react"
import { useNavigate } from "react-router-dom"

import { cn } from "@/lib/utils"
import { useRole } from "@/contexts/RoleContext"
import { useSolicitacoes, useSolicitacoesPendentesCount } from "@/hooks/useSolicitacoes"

const PAIS_LAST_SEEN_KEY = "pais_solicitacoes_last_seen"

export interface BottomNavProps extends React.HTMLAttributes<HTMLElement> { }

const BottomNav = React.forwardRef<HTMLElement, BottomNavProps>(
    ({ className, ...props }, ref) => {
        const navigate = useNavigate()
        const { role } = useRole()

        // --- Pais: badge "novidades" (solicitações decididas após o último acesso) ---
        const isPais = role === "pais"
        const isGestor = role === "gestor"

        const [ultimoAcesso, setUltimoAcesso] = React.useState<string | null>(() => {
            if (typeof window === "undefined") return null
            return window.localStorage.getItem(PAIS_LAST_SEEN_KEY)
        })

        const { data: solicitacoes } = useSolicitacoes()
        const novasDecisoes = React.useMemo(() => {
            if (!isPais || !solicitacoes) return 0
            return solicitacoes.filter((s) => {
                if (!s.decidido_em) return false
                if (!ultimoAcesso) return true
                return new Date(s.decidido_em).getTime() > new Date(ultimoAcesso).getTime()
            }).length
        }, [isPais, solicitacoes, ultimoAcesso])

        const handlePaisSolicitacoesClick = () => {
            const now = new Date().toISOString()
            try {
                window.localStorage.setItem(PAIS_LAST_SEEN_KEY, now)
            } catch {
                // ignore (Safari private mode etc.)
            }
            setUltimoAcesso(now)
            navigate("/pais/solicitacoes")
        }

        // --- Gestor: badge de pendências ---
        const { data: pendentesCount = 0 } = useSolicitacoesPendentesCount()

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

                    {isPais && (
                        <NavItem
                            icon={Inbox}
                            label="Solicitações"
                            badge={novasDecisoes}
                            onClick={handlePaisSolicitacoesClick}
                        />
                    )}

                    {isGestor && (
                        <NavItem
                            icon={Bell}
                            label="Pendências"
                            badge={pendentesCount}
                            onClick={() => navigate("/gestor/pendencias")}
                        />
                    )}

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
    badge?: number
}

function NavItem({ icon: Icon, label, isActive, onClick, badge }: NavItemProps) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "relative flex flex-col items-center justify-center space-y-1 w-16 p-2 rounded-2xl transition-colors",
                isActive
                    ? "text-accent-primary"
                    : "text-text-secondary hover:bg-accent-secondary/5"
            )}
        >
            <div className="relative">
                <Icon className="h-6 w-6 stroke-[1.5]" />
                {badge !== undefined && badge > 0 && (
                    <span
                        className="absolute -top-1.5 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none"
                        aria-label={`${badge} novidades`}
                    >
                        {badge > 99 ? "99+" : badge}
                    </span>
                )}
            </div>
            <span className="text-[10px] font-bold">{label}</span>
        </button>
    )
}

export { BottomNav }
