import { Trash2 } from "lucide-react";

interface ConfirmDeleteModalProps {
    isOpen: boolean;
    title: string;
    description: string;
    confirmLabel?: string;
    isLoading?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

export function ConfirmDeleteModal({
    isOpen,
    title,
    description,
    confirmLabel = "Sim, remover",
    isLoading = false,
    onConfirm,
    onCancel,
}: ConfirmDeleteModalProps) {
    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4"
            style={{ backgroundColor: "rgba(15,23,42,0.5)", backdropFilter: "blur(6px)" }}
            onClick={onCancel}
        >
            <div
                className="w-full max-w-[380px] bg-white rounded-3xl shadow-2xl p-6 space-y-5 animate-in slide-in-from-bottom-4 duration-300"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Icon */}
                <div className="flex justify-center">
                    <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center">
                        <Trash2 size={28} className="text-red-500" strokeWidth={1.5} />
                    </div>
                </div>

                {/* Text */}
                <div className="text-center space-y-1.5">
                    <h3 className="text-xl font-black text-slate-900">{title}</h3>
                    <p className="text-sm text-slate-500 font-medium leading-relaxed">{description}</p>
                </div>

                {/* Buttons */}
                <div className="flex flex-col gap-2.5 pt-1">
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={isLoading}
                        className="w-full h-13 py-3.5 bg-red-500 hover:bg-red-600 text-white rounded-full font-bold text-base flex items-center justify-center gap-2 shadow-lg shadow-red-500/20 active:scale-[0.98] transition-all disabled:opacity-60"
                    >
                        {isLoading ? (
                            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <Trash2 size={17} strokeWidth={2.5} />
                        )}
                        {isLoading ? "Removendo..." : confirmLabel}
                    </button>

                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={isLoading}
                        className="w-full h-13 py-3.5 bg-white text-slate-700 rounded-full font-bold text-base border border-slate-200 hover:bg-slate-50 active:scale-[0.98] transition-all"
                    >
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
    );
}
