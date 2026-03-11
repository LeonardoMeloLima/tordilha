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
import { useNotifications } from "@/hooks/useNotifications";
import { ActionSheet } from "./ui/ActionSheet";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CheckCircle2, Plus } from "lucide-react";
import { GestorCreateNotification } from "./gestor/GestorCreateNotification";

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

export function ProfileHeader({ userName, avatarUrl, role, isSuperUser, onDevRoleChange }: ProfileHeaderProps) {
    const badge = roleBadges[role] || roleBadges.gestor;
    const firstName = userName ? userName.split(' ')[0] : "Usuário";
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const [isCreateAvisoOpen, setIsCreateAvisoOpen] = useState(false);
    const { notifications, markAsRead, markAllAsRead, isLoading } = useNotifications();
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

    const filteredNotifications = notifications.filter(n =>
        !n.target_role || n.target_role === 'geral' || n.target_role === role
    );
    const activeUnreadCount = filteredNotifications.filter(n => !n.lida).length;

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
                                onClick={() => setIsNotificationsOpen(true)}
                                className="flex items-center gap-2 px-3 py-2.5 cursor-pointer rounded-xl text-slate-700 font-medium hover:bg-slate-50 transition-colors focus:bg-slate-50"
                            >
                                <Bell size={16} className="text-slate-400" />
                                <span>Ver Notificações</span>
                            </DropdownMenuItem>
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
                        onClick={() => setIsNotificationsOpen(true)}
                        className="group relative w-12 h-12 flex items-center justify-center rounded-2xl bg-white border-2 border-slate-50 shadow-xl shadow-slate-200/50 hover:shadow-primary/10 hover:border-primary/20 active:scale-90 transition-all duration-300"
                    >
                        <Bell
                            size={24}
                            className={`transition-colors duration-300 ${activeUnreadCount > 0 ? 'text-primary' : 'text-slate-400 group-hover:text-primary/70'}`}
                            strokeWidth={activeUnreadCount > 0 ? 3 : 2}
                        />

                        {activeUnreadCount > 0 && (
                            <>
                                <span className="absolute -top-1 -right-1 flex h-5 w-5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-40"></span>
                                    <span className="relative inline-flex rounded-full h-5 w-5 bg-primary border-2 border-white items-center justify-center">
                                        <span className="text-[9px] font-black text-white">{activeUnreadCount > 9 ? '9+' : activeUnreadCount}</span>
                                    </span>
                                </span>
                            </>
                        )}
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

            <NotificationsModal
                isOpen={isNotificationsOpen}
                onClose={() => setIsNotificationsOpen(false)}
                notifications={filteredNotifications}
                unreadCount={activeUnreadCount}
                onMarkAsRead={(id: string) => markAsRead.mutate(id)}
                onMarkAllAsRead={() => markAllAsRead.mutate()}
                isLoading={isLoading}
                role={role}
                onCreateClick={() => setIsCreateAvisoOpen(true)}
            />

            <GestorCreateNotification
                isOpen={isCreateAvisoOpen}
                onClose={() => setIsCreateAvisoOpen(false)}
            />
        </>
    );
}

const NotificationsModal = ({ isOpen, onClose, notifications, unreadCount, onMarkAsRead, onMarkAllAsRead, isLoading, role, onCreateClick }: any) => {
    const isGestor = role === 'gestor';

    return (
        <ActionSheet
            isOpen={isOpen}
            onClose={onClose}
            title="Notificações"
            subtitle={`${unreadCount} novas mensagens`}
        >
            <div className="flex flex-col h-[70vh]">
                <div className="flex items-center justify-between pt-2 pb-4">
                    {isGestor ? (
                        <button
                            onClick={onCreateClick}
                            className="flex items-center gap-2.5 px-5 py-2.5 border-2 border-primary/20 bg-primary/5 rounded-full text-[11px] font-black text-primary uppercase tracking-widest hover:border-primary hover:bg-primary/10 active:bg-primary active:text-white active:scale-95 transition-all duration-300 shadow-sm"
                        >
                            <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center -ml-1.5 transition-colors group-active:bg-white/20">
                                <Plus size={14} strokeWidth={3} />
                            </div>
                            Novo Comunicado
                        </button>
                    ) : (
                        <div />
                    )}

                    {unreadCount > 0 && (
                        <button
                            onClick={onMarkAllAsRead}
                            className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 rounded-full border border-amber-100 text-[10px] font-black text-[#B45309] uppercase tracking-wider active:scale-95 transition-all"
                        >
                            <CheckCircle2 size={14} />
                            Marcar lidas
                        </button>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto space-y-4">
                    {isLoading ? (
                        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>
                    ) : notifications.length === 0 ? (
                        <div className="py-24 text-center">
                            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Bell className="w-10 h-10 text-slate-200" />
                            </div>
                            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Nenhuma notificação</p>
                        </div>
                    ) : (
                        notifications.map((n: any) => (
                            <div
                                key={n.id}
                                onClick={() => !n.lida && onMarkAsRead(n.id)}
                                className={`p-4 rounded-[24px] border transition-all active:scale-[0.98] ${n.lida ? 'bg-white border-slate-50 opacity-60' : 'bg-slate-50 border-slate-100 ring-1 ring-primary/5'}`}
                            >
                                <div className="flex gap-3">
                                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border-2 border-primary/20 bg-primary/5 text-primary`}>
                                        <Bell size={18} strokeWidth={2.5} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start gap-2">
                                            <h4 className="text-sm font-black text-slate-900 leading-tight">{n.titulo}</h4>
                                            {!n.lida && <div className="w-2 h-2 bg-[#EAB308] rounded-full shrink-0 mt-1" />}
                                        </div>
                                        <p className="text-sm text-slate-600 font-medium mt-1 leading-relaxed line-clamp-2">{n.mensagem}</p>
                                        <div className="flex items-center gap-2 mt-2">
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                                {n.criado_em ? formatDistanceToNow(new Date(n.criado_em), { addSuffix: true, locale: ptBR }) : ""}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </ActionSheet>
    );
};
