import { useRef, useState } from "react";
import { Camera, Upload, Loader2, X } from "lucide-react";
import { CameraCaptureModal } from "@/components/CameraCaptureModal";
import { supabase } from "@/lib/supabase";
import { useToast } from "./use-toast";

interface ImageUploadFieldProps {
    /** The Supabase Storage bucket name (e.g. 'cavalos', 'alunos', 'avatars') */
    bucket: string;
    /** Current image URL to display as preview */
    value?: string | null;
    /** Callback when a new image URL is set */
    onChange: (url: string) => void;
    /** Default camera facing mode: 'user' for selfie, 'environment' for rear */
    defaultFacingMode?: "user" | "environment";
    /** Shape of the preview: 'circle' for avatar, 'rounded' for horse/student cards */
    shape?: "circle" | "rounded";
    /** Label to display above the field */
    label?: string;
    /** Callback when uploading state changes */
    onUploadingChange?: (isUploading: boolean) => void;
    /** If true, the field is read-only */
    disabled?: boolean;
}

export function ImageUploadField({
    bucket,
    value,
    onChange,
    defaultFacingMode = "environment",
    shape = "rounded",
    label = "Foto",
    onUploadingChange,
    disabled = false,
}: ImageUploadFieldProps) {
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isCameraOpen, setIsCameraOpen] = useState(false);

    const uploadFile = async (fileOrBlob: File | Blob, extension = "jpg") => {
        try {
            setIsUploading(true);
            onUploadingChange?.(true);

            const { data: { session }, error: refreshError } = await supabase.auth.getSession();
            if (refreshError || !session) {
                throw new Error("Sessão expirada. Faça login novamente.");
            }

            const userId = session.user.id;
            const fileExt = fileOrBlob instanceof File
                ? fileOrBlob.name.split('.').pop() || extension
                : extension;
            const filePath = `${userId}_${Date.now()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from(bucket)
                .upload(filePath, fileOrBlob, {
                    upsert: true,
                    contentType: fileOrBlob instanceof File ? fileOrBlob.type : `image/${extension}`,
                });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from(bucket)
                .getPublicUrl(filePath);

            onChange(`${publicUrl}?t=${Date.now()}`);
        } catch (error: any) {
            console.error("Upload error:", error);
            toast({
                variant: "destructive",
                title: "Erro no upload",
                description: "Não foi possível salvar a imagem. Verifique sua conexão ou tente novamente.",
            });
            throw error;
        } finally {
            setIsUploading(false);
            onUploadingChange?.(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        await uploadFile(file);
    };

    const handleCameraCapture = async (blob: Blob) => {
        await uploadFile(blob, "jpg");
    };

    const handleRemove = () => {
        onChange("");
    };

    const shapeClass = shape === "circle" ? "rounded-full" : "rounded-2xl";
    const hasPhoto = !!value;

    return (
        <div className="space-y-1.5">
            {label && (
                <label className="text-sm font-medium text-slate-700 ml-1">{label}</label>
            )}

            {hasPhoto ? (
                /* ── Photo Preview ── */
                <div className={`relative w-full h-32 ${shapeClass} overflow-hidden bg-slate-100 shadow-sm border border-slate-100`}>
                    <img src={value} alt="Preview" className="w-full h-full object-cover" />

                    {/* Remove button */}
                    {!isUploading && !disabled && (
                        <button
                            type="button"
                            onClick={handleRemove}
                            className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm text-white flex items-center justify-center shadow-md hover:bg-red-500 active:scale-90 transition-all"
                        >
                            <X size={14} strokeWidth={3} />
                        </button>
                    )}

                    {/* Uploading overlay */}
                    {isUploading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
                            <Loader2 className="w-6 h-6 text-white animate-spin" />
                        </div>
                    )}
                </div>
            ) : (
                /* ── Empty State – dashed area with action buttons ── */
                <div className="w-full h-24 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 flex flex-col items-center justify-center gap-2 transition-all hover:bg-slate-50">
                    {isUploading ? (
                        <div className="flex flex-col items-center gap-1.5">
                            <Loader2 className="w-6 h-6 text-[#4E593F] animate-spin" />
                            <span className="text-xs font-medium text-slate-500">Enviando...</span>
                        </div>
                    ) : disabled ? (
                        <div className="flex flex-col items-center gap-1.5 grayscale opacity-50">
                            <Camera size={20} className="text-slate-300 mb-0.5" />
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sem foto cadastrada</span>
                        </div>
                    ) : (
                        <>
                            <Camera size={20} className="text-slate-300 mb-0.5" />
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setIsCameraOpen(true)}
                                    className="flex items-center gap-1.5 h-9 px-4 rounded-full bg-[#4E593F] text-white font-bold text-[13px] shadow-sm shadow-[#4E593F]/20 hover:bg-[#3E4732] transition-all active:scale-[0.97]"
                                >
                                    <Camera size={13} className="text-white" />
                                    Tirar Foto
                                </button>
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="flex items-center gap-1.5 h-9 px-4 rounded-full bg-white text-slate-600 font-bold text-[13px] border border-slate-200 shadow-sm hover:bg-slate-50 transition-all active:scale-[0.97]"
                                >
                                    <Upload size={13} />
                                    Galeria
                                </button>
                            </div>
                        </>
                    )}
                </div>
            )}

            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept="image/*"
                className="hidden"
            />

            <CameraCaptureModal
                open={isCameraOpen}
                onClose={() => setIsCameraOpen(false)}
                onCapture={handleCameraCapture}
                defaultFacingMode={defaultFacingMode}
            />
        </div>
    );
}
