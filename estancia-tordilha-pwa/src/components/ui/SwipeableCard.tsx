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
    threshold = 80,
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
        setIsSwiping(true);
    }, []);

    const handleTouchMove = useCallback(
        (e: React.TouchEvent) => {
            const dx = e.touches[0].clientX - startXRef.current;
            const dy = e.touches[0].clientY - startYRef.current;

            if (isHorizontalRef.current === null && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
                isHorizontalRef.current = Math.abs(dx) > Math.abs(dy);
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
            className="relative overflow-hidden rounded-3xl"
        >
            {/* ── Delete background ── */}
            <div
                className={`absolute inset-0 flex items-center justify-end pr-5 rounded-3xl transition-opacity duration-200 ${isOpen ? "opacity-100" : "opacity-70"}`}
                style={{ backgroundColor: "#EF4444" }}
            >
                <button
                    type="button"
                    onClick={handleDeleteClick}
                    className="flex flex-col items-center gap-1 text-white active:scale-90 transition-transform"
                >
                    <Trash2 size={22} strokeWidth={2} />
                    <span className="text-[11px] font-bold tracking-wide">{deleteLabel}</span>
                </button>
            </div>

            {/* ── Swipeable content ── */}
            <div
                className="relative"
                style={{
                    transform: `translateX(${offsetX}px)`,
                    transition: isSwiping ? "none" : "transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
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
