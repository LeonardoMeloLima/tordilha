import * as React from "react"
import { cn } from "@/lib/utils"

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
    title: string
    icon?: React.ReactNode
    isActive?: boolean
}

const GamificationBadge = React.forwardRef<HTMLDivElement, BadgeProps>(
    ({ className, title, icon, isActive = false, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={cn(
                    "flex flex-col items-center justify-center p-4 rounded-3xl transition-all duration-300",
                    isActive
                        ? "bg-status-gamification/10 text-status-gamification border-2 border-status-gamification shadow-sm"
                        : "bg-background-app text-text-secondary border-2 border-transparent",
                    className
                )}
                {...props}
            >
                <div className="mb-2">
                    {icon ? (
                        <div className={cn("h-12 w-12", isActive ? "opacity-100" : "opacity-50 grayscale")}>
                            {icon}
                        </div>
                    ) : (
                        <div className={cn("h-12 w-12 rounded-full", isActive ? "bg-status-gamification" : "bg-text-secondary/20")} />
                    )}
                </div>
                <span className="text-sm font-bold text-center">{title}</span>
            </div>
        )
    }
)
GamificationBadge.displayName = "GamificationBadge"

export { GamificationBadge }
