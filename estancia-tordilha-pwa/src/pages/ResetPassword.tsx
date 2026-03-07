import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { Lock } from "lucide-react";

const ResetPassword = () => {
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();
    const navigate = useNavigate();

    useEffect(() => {
        // Check if there's a session established from the recovery link
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!session) {
                toast({
                    variant: "destructive",
                    title: "Link inválido ou expirado",
                    description: "Por favor, solicite a recuperação de senha novamente.",
                });
                navigate("/login");
            }
        });
    }, [navigate, toast]);

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            toast({
                title: "Senhas não conferem",
                description: "A senha e a confirmação devem ser iguais.",
                variant: "destructive",
            });
            return;
        }

        setLoading(true);

        try {
            const { error } = await supabase.auth.updateUser({ password });
            if (error) throw error;

            toast({
                title: "Senha atualizada!",
                description: "Sua senha foi redefinida com sucesso. Você já pode acessar o sistema.",
            });
            navigate("/");
        } catch (error: any) {
            console.error("Reset error:", error);
            toast({
                variant: "destructive",
                title: "Erro ao redefinir senha",
                description: error.message || "Tente novamente mais tarde.",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center p-6">
            <div className="w-full max-w-[400px] bg-white rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.04)] p-8 sm:p-10 text-center space-y-8">
                <div className="space-y-3">
                    <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm border border-slate-100">
                        <span className="text-4xl hover:scale-110 transition-transform cursor-default">🔐</span>
                    </div>
                    <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Nova Senha</h1>
                    <p className="text-slate-500 font-medium">Digite sua nova senha abaixo</p>
                </div>

                <form onSubmit={handleReset} className="space-y-5 text-left">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700 ml-1">Nova Senha</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Lock size={20} strokeWidth={1.5} className="text-slate-400" />
                            </div>
                            <Input
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="h-14 pl-11 rounded-2xl bg-slate-50 border-slate-200 shadow-sm focus:ring-2 focus:ring-[#EAB308] focus:border-[#EAB308] text-slate-800 transition-all font-medium focus:bg-white"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700 ml-1">Confirme a Nova Senha</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Lock size={20} strokeWidth={1.5} className="text-slate-400" />
                            </div>
                            <Input
                                type="password"
                                placeholder="••••••••"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className={`h-14 pl-11 rounded-2xl bg-slate-50 border-slate-200 shadow-sm focus:ring-2 focus:ring-[#EAB308] focus:border-[#EAB308] text-slate-800 transition-all font-medium focus:bg-white ${confirmPassword && password !== confirmPassword ? 'border-red-300 ring-red-100 focus:ring-red-500 focus:border-red-500' : ''}`}
                                required
                            />
                        </div>
                    </div>

                    <Button
                        type="submit"
                        disabled={loading}
                        className="w-full h-14 rounded-full bg-[#EAB308] hover:bg-[#D97706] text-white font-bold text-lg mt-6 shadow-lg shadow-[#EAB308]/20 transition-all active:scale-[0.98]"
                    >
                        {loading ? "Processando..." : "Redefinir Senha"}
                    </Button>
                </form>
            </div>
        </div>
    );
};

export default ResetPassword;
