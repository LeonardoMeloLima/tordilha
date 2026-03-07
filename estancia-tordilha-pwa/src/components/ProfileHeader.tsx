import { useRef, useState } from "react";
import { Bell, Camera, Upload, LogOut, Loader2 } from "lucide-react";
import { AvatarWithFallback } from "@/components/ui/AvatarWithFallback";
import type { Role } from "@/hooks/supabase/useRoleSession";
import { DevRoleSwitcher } from "@/components/DevRoleSwitcher";
import { CameraCaptureModal } from "@/components/CameraCaptureModal";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/use-toast";

interface ProfileHeaderProps {
    userName: string;
    avatarUrl?: string | null;
    role: Role;
    isSuperUser?: boolean;
    onDevRoleChange?: (role: Role) => void;
    onNotificationClick?: () => void;
}

const roleBadges: Record<Role, { label: string; className: string }> = {
    professor: {
        label: "Professor",
        className: "bg-[#EAB308]/10 text-[#EAB308]",
    },
    pais: {
        label: "Responsável/Aluno",
        className: "bg-[#8B4513]/10 text-[#8B4513]",
    },
    gestor: {
        label: "Gestor",
        className: "bg-slate-100 text-slate-700",
    },
};

export function ProfileHeader({ userName, avatarUrl, role, isSuperUser, onDevRoleChange, onNotificationClick }: ProfileHeaderProps) {
    const badge = roleBadges[role] || roleBadges.gestor;
    const firstName = userName ? userName.split(' ')[0] : "Usuário";
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const { toast } = useToast();

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        window.location.href = "/login";
    };

    /** Shared upload logic — receives a File or Blob */
    const uploadAvatar = async (fileOrBlob: File | Blob, extension = "jpg") => {
        try {
            setIsUploading(true);

            // Force a session refresh to get a valid token
            const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
            if (refreshError || !refreshData.session) {
                throw new Error("Sessão expirada. Faça login novamente.");
            }

            const user = refreshData.session.user;
            const fileExt = fileOrBlob instanceof File
                ? fileOrBlob.name.split('.').pop() || extension
                : extension;
            const filePath = `${user.id}.${fileExt}`;

            // Upload to Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, fileOrBlob, {
                    upsert: true,
                    contentType: fileOrBlob instanceof File ? fileOrBlob.type : `image/${extension}`,
                });

            if (uploadError) throw uploadError;

            // Get public URL (add cache-buster to force refresh)
            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            const avatarUrlWithCacheBust = `${publicUrl}?t=${Date.now()}`;

            // Update user metadata
            const { error: updateError } = await supabase.auth.updateUser({
                data: { avatar_url: avatarUrlWithCacheBust }
            });

            if (updateError) throw updateError;

            toast({
                title: "Foto atualizada",
                description: "Seu avatar foi atualizado com sucesso.",
            });

            setTimeout(() => window.location.reload(), 1500);

        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Erro ao atualizar foto",
                description: error.message || "Tente novamente mais tarde.",
            });
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        await uploadAvatar(file);
    };

    const handleCameraCapture = async (blob: Blob) => {
        await uploadAvatar(blob, "jpg");
    };

    return (
        <>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="focus:outline-none focus:ring-2 focus:ring-[#EAB308] focus:ring-offset-2 rounded-full transition-all active:scale-95 relative group">
                                <AvatarWithFallback
                                    type="user"
                                    src={avatarUrl}
                                    className={`w-16 h-16 rounded-full border-2 border-white shadow-sm ${isUploading ? 'opacity-50' : ''}`}
                                />
                                {isUploading && (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <Loader2 className="w-5 h-5 text-primary animate-spin" />
                                    </div>
                                )}
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-52 bg-white rounded-2xl shadow-lg border-slate-100 p-2">
                            <DropdownMenuItem
                                onClick={() => setIsCameraOpen(true)}
                                disabled={isUploading}
                                className="flex items-center gap-2 px-3 py-2.5 cursor-pointer rounded-xl text-slate-700 font-medium hover:bg-slate-50 transition-colors focus:bg-slate-50"
                            >
                                <Camera size={16} className="text-slate-400" />
                                <span>Tirar Foto</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isUploading}
                                className="flex items-center gap-2 px-3 py-2.5 cursor-pointer rounded-xl text-slate-700 font-medium hover:bg-slate-50 transition-colors focus:bg-slate-50"
                            >
                                <Upload size={16} className="text-slate-400" />
                                <span>{isUploading ? "Enviando..." : "Escolher da Galeria"}</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-slate-100 my-1 font-bold" />
                            <DropdownMenuItem
                                onClick={handleSignOut}
                                className="flex items-center gap-2 px-3 py-2.5 cursor-pointer rounded-xl font-medium text-red-600 focus:bg-red-50 hover:bg-red-50 transition-colors"
                            >
                                <LogOut size={16} />
                                <span>Sair</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <div className="flex flex-col min-w-0">
                        <span className="text-slate-800 font-bold text-lg leading-tight truncate">
                            Olá, {firstName}
                        </span>
                        <div className="mt-0.5">
                            <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${badge.className}`}>
                                {badge.label}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={onNotificationClick}
                        className="w-12 h-12 shrink-0 rounded-full bg-white shadow-sm flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors relative"
                    >
                        <Bell size={28} strokeWidth={1.5} />
                        <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-[#EAB308] rounded-full border-2 border-white" />
                    </button>
                </div>

                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept="image/*"
                    className="hidden"
                />
            </div>

            {/* Dev Switcher - Moved to separate line to avoid crowding */}
            {isSuperUser && onDevRoleChange && (
                <div className="mt-3 flex justify-start">
                    <DevRoleSwitcher
                        isSuperUser={isSuperUser}
                        activeRole={role}
                        onRoleChange={onDevRoleChange}
                    />
                </div>
            )}

            {/* Camera Capture Modal */}
            <CameraCaptureModal
                open={isCameraOpen}
                onClose={() => setIsCameraOpen(false)}
                onCapture={handleCameraCapture}
            />
        </>
    );
}
