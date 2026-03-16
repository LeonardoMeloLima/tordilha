import React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ActionSheetProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    subtitle?: string;
    children: React.ReactNode;
    footer?: React.ReactNode;
    className?: string;
}

export const ActionSheet = ({
    isOpen,
    onClose,
    title,
    subtitle,
    children,
    footer,
    className,
}: ActionSheetProps) => {
    const [mouseDownTarget, setMouseDownTarget] = React.useState<EventTarget | null>(null);

    if (!isOpen) return null;

    return createPortal(
        <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-[2px] z-[80] flex items-end justify-center p-0 animate-in fade-in duration-200"
            onPointerDown={(e) => setMouseDownTarget(e.target)}
            onClick={(e) => {
                if (e.target === e.currentTarget && mouseDownTarget === e.currentTarget) {
                    onClose();
                }
            }}
        >
            <div
                className={cn(
                    "bg-white w-full max-w-[420px] rounded-t-[32px] shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom duration-300 max-h-[92vh] mx-auto",
                    className
                )}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header - Sticky */}
                <div className="flex items-start justify-between p-6 sm:p-8 pb-4 border-b border-slate-50 shrink-0 bg-white/80 backdrop-blur-md z-10 sticky top-0">
                    <div className="space-y-1">
                        <h2 className="font-black text-2xl text-slate-900 tracking-tight leading-none">{title}</h2>
                        {subtitle && (
                            <p className="text-sm text-slate-500 font-medium tracking-tight">{subtitle}</p>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 active:scale-90 transition-all border border-slate-100/50"
                    >
                        <X size={20} strokeWidth={2} />
                    </button>
                </div>

                {/* Body - Scrollable */}
                <div className="flex-1 overflow-y-auto px-6 sm:px-8 py-4 scrollbar-none">
                    {children}
                </div>

                {/* Footer - Sticky */}
                {footer && (
                    <div className="p-6 sm:p-8 pt-4 border-t border-slate-50 shrink-0 bg-white/80 backdrop-blur-md z-10 sticky bottom-0">
                        {footer}
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
};
