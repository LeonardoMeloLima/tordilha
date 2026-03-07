import * as React from "react"
import { cn } from "@/lib/utils"

export interface PageLayoutProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode
    hideBottomNav?: boolean
}

const PageLayout = React.forwardRef<HTMLDivElement, PageLayoutProps>(
    ({ className, children, hideBottomNav = false, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={cn(
                    "min-h-screen bg-background text-text-primary",
                    !hideBottomNav && "pb-24 pt-safe",
                    className
                )}
                {...props}
            >
                {children}
            </div>
        )
    }
)
PageLayout.displayName = "PageLayout"

export { PageLayout }
