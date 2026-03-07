import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "./button"

export interface BehaviorOption {
    value: string
    label: string
}

export interface BehaviorScaleProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
    options: BehaviorOption[]
    value?: string
    onChange?: (value: string) => void
}

const BehaviorScale = React.forwardRef<HTMLDivElement, BehaviorScaleProps>(
    ({ className, options, value, onChange, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={cn("flex flex-wrap gap-3", className)}
                {...props}
            >
                {options.map((option) => {
                    const isSelected = value === option.value
                    return (
                        <Button
                            key={option.value}
                            variant={isSelected ? "default" : "outline"}
                            onClick={() => onChange?.(option.value)}
                            className={cn(
                                "flex-1 min-w-[120px]",
                                isSelected
                                    ? "bg-accent-primary text-white"
                                    : "bg-background-app border-none text-text-secondary hover:bg-black/5"
                            )}
                        >
                            {option.label}
                        </Button>
                    )
                })}
            </div>
        )
    }
)
BehaviorScale.displayName = "BehaviorScale"

export { BehaviorScale }
