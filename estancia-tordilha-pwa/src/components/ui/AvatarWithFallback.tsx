import { useState } from "react";
import { User, CircleUser } from "lucide-react";
import { cn } from "@/lib/utils";

interface AvatarWithFallbackProps {
    src?: string | null;
    alt?: string;
    className?: string;
    type?: "horse" | "user";
}

export const AvatarWithFallback = ({ src, alt, className, type = "user" }: AvatarWithFallbackProps) => {
    const [error, setError] = useState(false);
    const [loading, setLoading] = useState(true);

    const FallbackIcon = type === "horse" ? CircleUser : User;

    return (
        <div className={cn("relative overflow-hidden bg-secondary/10 flex items-center justify-center transition-all", className)}>
            {src && !error ? (
                <img
                    src={src}
                    alt={alt}
                    className={cn("w-full h-full object-cover transition-opacity duration-300", loading ? "opacity-0" : "opacity-100")}
                    onLoad={() => setLoading(false)}
                    onError={() => {
                        setError(true);
                        setLoading(false);
                    }}
                />
            ) : (
                <FallbackIcon className="text-[#8B4513] w-1/2 h-1/2 opacity-40" strokeWidth={1.5} />
            )}

            {loading && src && !error && (
                <div className="absolute inset-0 animate-pulse bg-slate-200" />
            )}
        </div>
    );
};
