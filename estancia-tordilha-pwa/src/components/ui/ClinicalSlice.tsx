import { type LucideIcon } from "lucide-react";

interface ClinicalSliceProps {
    label: string;
    icon: LucideIcon;
    value: number;
    onChange: (val: number) => void;
    activeColor?: string; // Default: bg-[#2E8B57]
    iconColor?: string; // Default: text-[#8B4513]
}

export function ClinicalSlice({
    label,
    icon: Icon,
    value,
    onChange,
    activeColor = "bg-[#4E593F]",
    iconColor = "text-[#8B4513]",
}: ClinicalSliceProps) {
    return (
        <div className="bg-white rounded-[24px] p-4 card-shadow border border-slate-50 flex flex-col gap-3">
            <div className="flex items-center gap-2 px-1">
                <div className={`p-2 rounded-xl bg-slate-50 flex items-center justify-center`}>
                    <Icon size={18} className={iconColor} strokeWidth={2.5} />
                </div>
                <span className="text-sm font-bold text-slate-700">{label}</span>
                {value > 0 && (
                    <span className="ml-auto font-black text-sm text-slate-400">Nível {value}</span>
                )}
            </div>
            <div className="flex gap-1.5 w-full">
                {[1, 2, 3, 4, 5].map((level) => {
                    const isActive = level <= value;
                    const isCurrent = level === value;
                    return (
                        <button
                            key={level}
                            type="button"
                            onClick={() => onChange(level)}
                            className={`flex-1 h-[44px] rounded-lg transition-all duration-300 touch-target relative ${isActive ? activeColor : "bg-slate-100"
                                } ${isCurrent ? "scale-[1.03] shadow-sm z-10" : "hover:scale-[1.02] active:scale-95"}`}
                        >
                            <span className={`absolute inset-0 flex items-center justify-center font-black text-[15px] ${isActive ? "text-white drop-shadow-sm" : "text-slate-400 group-hover:text-slate-500"
                                }`}>
                                {level}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
