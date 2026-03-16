import { useRef, useState, useCallback, type ReactNode } from "react";
import { Trash2 } from "lucide-react";

interface SwipeableCardProps {
    /** Render children normally OR as a function that receives { isOpen } to hide elements when swiped. */
    children: ReactNode | ((props: { isOpen: boolean }) => ReactNode);
    onDelete: () => void;
    /** How many pixels the user must swipe before the action zone snaps open. Default: 80 */
    threshold?: number;
    deleteLabel?: string;
}

export function SwipeableCard({
    children,
    onDelete,
    threshold = 60,
    deleteLabel = "Remover",
}: SwipeableCardProps) {
    const [offsetX, setOffsetX] = useState(0);
    const [isSwiping, setIsSwiping] = useState(false);
    const startXRef = useRef(0);
    const startYRef = useRef(0);
    const isHorizontalRef = useRef<boolean | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const MAX_SWIPE = 110;

    const isOpen = offsetX <= -threshold;

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        startXRef.current = e.touches[0].clientX;
        startYRef.current = e.touches[0].clientY;
        isHorizontalRef.current = null;
    }, []);

    const handleTouchMove = useCallback(
        (e: React.TouchEvent) => {
            const dx = e.touches[0].clientX - startXRef.current;
            const dy = e.touches[0].clientY - startYRef.current;

            if (isHorizontalRef.current === null && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
                isHorizontalRef.current = Math.abs(dx) > Math.abs(dy);
                if (isHorizontalRef.current) {
                    setIsSwiping(true);
                }
            }

            if (!isHorizontalRef.current) return;

            if (dx > 0) {
                setOffsetX(0);
                return;
            }

            e.preventDefault();
            setOffsetX(Math.max(dx, -MAX_SWIPE));
        },
        []
    );

    const handleTouchEnd = useCallback(() => {
        setIsSwiping(false);
        if (offsetX <= -threshold) {
            setOffsetX(-MAX_SWIPE); // snap open
        } else {
            setOffsetX(0); // snap closed
        }
    }, [offsetX, threshold]);

    const handleDeleteClick = useCallback((e: React.MouseEvent) => {
        e.stopPropagation(); // prevent wrapper click from firing
        setOffsetX(0);
        // Small delay so the card animates closed before modal opens
        setTimeout(() => onDelete(), 150);
    }, [onDelete]);

    // Tap on the sliding content while open → close it
    const handleContentClick = useCallback((e: React.MouseEvent) => {
        if (isOpen) {
            e.preventDefault();
            e.stopPropagation();
            setOffsetX(0);
        }
    }, [isOpen]);

    return (
        <div
            ref={containerRef}
            className="relative overflow-hidden rounded-3xl bg-[#4E593F]"
            style={{ touchAction: "pan-y" }}
        >
            {/* ── Background Layer (Red Area revealed during swipe) ── */}
            <div
                className="absolute inset-0 flex items-center justify-end pr-5 transition-opacity duration-150"
                style={{ 
                    backgroundColor: "#EF4444",
                    opacity: Math.max(0, Math.min(1, (Math.abs(offsetX) / threshold) * 0.8)) 
                }}
            >
                <div 
                    className="flex flex-col items-center gap-1 text-white transition-transform duration-200"
                    style={{ 
                        transform: `scale(${Math.max(0.5, Math.min(1, Math.abs(offsetX) / threshold))})`,
                        opacity: Math.abs(offsetX) > 20 ? 1 : 0
                    }}
                >
                    <Trash2 size={22} strokeWidth={2.5} />
                    <span className="text-[10px] font-black uppercase tracking-wider">{deleteLabel}</span>
                </div>
            </div>

            {/* ── Real Delete Button (only clickable when revealed) ── */}
            {isOpen && (
                <button
                    type="button"
                    onClick={handleDeleteClick}
                    className="absolute right-0 top-0 bottom-0 w-24 z-10"
                    aria-label={deleteLabel}
                />
            )}

            {/* ── Swipeable content ── */}
            <div
                className="relative z-20"
                style={{
                    transform: `translateX(${offsetX}px)`,
                    transition: isSwiping ? "none" : "transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
                    willChange: "transform",
                }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onClick={handleContentClick}
            >
                {typeof children === "function" ? children({ isOpen }) : children}
            </div>
        </div>
    );
}
