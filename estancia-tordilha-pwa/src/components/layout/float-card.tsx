import * as React from "react"
import { cn } from "@/lib/utils"

export interface FloatCardProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode
}

const FloatCard = React.forwardRef<HTMLDivElement, FloatCardProps>(
    ({ className, children, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={cn(
                    "bg-background-card rounded-3xl shadow-card m-4 p-6 text-text-primary",
                    className
                )}
                {...props}
            >
                {children}
            </div>
        )
    }
)
FloatCard.displayName = "FloatCard"

export { FloatCard }
