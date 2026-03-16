import { useRef, useState, useEffect, useCallback } from "react";
import { X, Camera, SwitchCamera, Loader2 } from "lucide-react";

interface CameraCaptureModalProps {
    open: boolean;
    onClose: () => void;
    onCapture: (blob: Blob) => void;
    defaultFacingMode?: "user" | "environment";
}

export function CameraCaptureModal({ open, onClose, onCapture, defaultFacingMode = "user" }: CameraCaptureModalProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [facingMode, setFacingMode] = useState<"user" | "environment">(defaultFacingMode);
    const [captured, setCaptured] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    const stopCamera = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
    }, []);

    const startCamera = useCallback(async (facing: "user" | "environment") => {
        setIsLoading(true);
        setError(null);
        stopCamera();

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: facing, width: { ideal: 720 }, height: { ideal: 720 } },
                audio: false,
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
            }
        } catch (err: any) {
            if (err.name === "NotAllowedError") {
                setError("Permissão da câmera negada. Habilite nas configurações do navegador.");
            } else if (err.name === "NotFoundError") {
                setError("Nenhuma câmera encontrada neste dispositivo.");
            } else {
                setError("Erro ao acessar a câmera. Tente novamente.");
            }
        } finally {
            setIsLoading(false);
        }
    }, [stopCamera]);

    useEffect(() => {
        if (open) {
            setCaptured(false);
            setPreviewUrl(null);
            startCamera(facingMode);
        }
        return () => stopCamera();
    }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleSwitchCamera = () => {
        const newMode = facingMode === "user" ? "environment" : "user";
        setFacingMode(newMode);
        setCaptured(false);
        setPreviewUrl(null);
        startCamera(newMode);
    };

    const handleCapture = () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas) return;

        // Square crop centered on the video
        const size = Math.min(video.videoWidth, video.videoHeight);
        canvas.width = size;
        canvas.height = size;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const offsetX = (video.videoWidth - size) / 2;
        const offsetY = (video.videoHeight - size) / 2;

        // Mirror horizontally if using front camera
        if (facingMode === "user") {
            ctx.translate(size, 0);
            ctx.scale(-1, 1);
        }

        ctx.drawImage(video, offsetX, offsetY, size, size, 0, 0, size, size);

        // Show preview
        const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
        setPreviewUrl(dataUrl);
        setCaptured(true);
        stopCamera();
    };

    const handleRetake = () => {
        setCaptured(false);
        setPreviewUrl(null);
        startCamera(facingMode);
    };

    const handleConfirm = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        canvas.toBlob(
            (blob) => {
                if (blob) {
                    onCapture(blob);
                    onClose();
                }
            },
            "image/jpeg",
            0.9
        );
    };

    const handleClose = () => {
        stopCamera();
        setCaptured(false);
        setPreviewUrl(null);
        onClose();
    };

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-[200] flex items-center justify-center p-4"
            style={{ backgroundColor: "rgba(0,0,0,0.8)", backdropFilter: "blur(4px)" }}
        >
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-[360px] overflow-hidden animate-in fade-in zoom-in-95 duration-200 transform translate-y-20 max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-5 pt-5 pb-2">
                    <h3 className="text-lg font-bold text-slate-800">Tirar Foto</h3>
                    <button
                        type="button"
                        onClick={handleClose}
                        className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors active:scale-95"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Camera / Preview Area */}
                <div className="px-5 pb-4 overflow-y-auto overflow-x-hidden flex-1 scrollbar-none">
                    <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-slate-900">
                        {/* Loading state */}
                        {isLoading && !error && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/80">
                                <Loader2 className="w-8 h-8 animate-spin" />
                                <span className="text-sm font-medium">Abrindo câmera...</span>
                            </div>
                        )}

                        {/* Error state */}
                        {error && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
                                <div className="w-14 h-14 rounded-full bg-red-500/20 flex items-center justify-center">
                                    <Camera size={28} className="text-red-400" />
                                </div>
                                <p className="text-white/80 text-sm font-medium leading-relaxed">{error}</p>
                                <button
                                    type="button"
                                    onClick={() => startCamera(facingMode)}
                                    className="mt-1 px-4 py-2 rounded-full bg-white/10 text-white text-sm font-semibold hover:bg-white/20 transition-colors"
                                >
                                    Tentar novamente
                                </button>
                            </div>
                        )}

                        {/* Live video feed */}
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className={`w-full h-full object-cover ${facingMode === "user" ? "scale-x-[-1]" : ""} ${captured ? "hidden" : ""}`}
                        />

                        {/* Captured preview */}
                        {captured && previewUrl && (
                            <img
                                src={previewUrl}
                                alt="Preview"
                                className="w-full h-full object-cover"
                            />
                        )}

                        {/* Circular overlay guide */}
                        {!captured && !isLoading && !error && (
                            <div className="absolute inset-0 pointer-events-none">
                                <div
                                    className="absolute inset-[10%] rounded-full border-2 border-white/30"
                                    style={{ boxShadow: "0 0 0 9999px rgba(0,0,0,0.25)" }}
                                />
                            </div>
                        )}

                        {/* Switch camera button */}
                        {!captured && !isLoading && !error && (
                            <button
                                type="button"
                                onClick={handleSwitchCamera}
                                className="absolute top-3 right-3 w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/60 transition-colors active:scale-95"
                            >
                                <SwitchCamera size={18} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Buttons */}
                <div className="px-5 pb-6">
                    {!captured ? (
                        <button
                            type="button"
                            onClick={handleCapture}
                            disabled={isLoading || !!error}
                            className="w-full h-14 rounded-full bg-[#4E593F] hover:bg-[#3E4732] disabled:bg-slate-300 text-white font-bold text-base flex items-center justify-center gap-2 shadow-lg shadow-[#4E593F]/20 transition-all active:scale-[0.98]"
                        >
                            <Camera size={20} className="text-white" />
                            Capturar
                        </button>
                    ) : (
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={handleRetake}
                                className="flex-1 h-14 rounded-full bg-white border border-slate-200 text-slate-700 font-bold text-base transition-all active:scale-[0.98] hover:bg-slate-50"
                            >
                                Tirar Outra
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirm}
                                className="flex-1 h-14 rounded-full bg-[#4E593F] hover:bg-[#3E4732] text-white font-bold text-base shadow-lg shadow-[#4E593F]/20 transition-all active:scale-[0.98]"
                            >
                                Usar Foto
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Hidden canvas for capture */}
            <canvas ref={canvasRef} className="hidden" />
        </div>
    );
}
