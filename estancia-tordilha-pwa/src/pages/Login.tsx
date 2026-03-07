import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { LogIn, Mail, Lock, User, Briefcase, Users, UserCircle } from "lucide-react";

const Login = () => {
    const [mode, setMode] = useState<"signIn" | "signUp" | "forgotPassword">("signIn");
    const [fullName, setFullName] = useState("");
    const [selectedRole, setSelectedRole] = useState<"gestor" | "professor" | "pais" | "">("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();
    const navigate = useNavigate();

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (mode === "forgotPassword") {
                const { error } = await supabase.auth.resetPasswordForEmail(email, {
                    redirectTo: `${window.location.origin}/reset-password`,
                });
                if (error) throw error;
                toast({
                    title: "Email de recuperação enviado",
                    description: "Verifique sua caixa de entrada para redefinir a senha.",
                });
                setMode("signIn");
                return;
            } else if (mode === "signIn") {
                const { data, error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;

                if (data.session) {
                    toast({
                        title: "Login realizado",
                        description: "Bem-vindo de volta!",
                    });
                    navigate("/");
                }
            } else {
                if (!selectedRole) {
                    toast({
                        variant: "destructive",
                        title: "Erro no cadastro",
                        description: "Por favor, selecione um perfil.",
                    });
                    setLoading(false);
                    return;
                }
                if (password !== confirmPassword) {
                    toast({
                        title: "Senhas não conferem",
                        description: "A senha e a confirmação devem ser iguais.",
                        variant: "destructive",
                    });
                    setLoading(false);
                    return;
                }
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            nome_completo: fullName,
                            role: selectedRole,
                        }
                    }
                });
                if (error) throw error;
                toast({
                    title: "Conta criada!",
                    description: "Verifique seu e-mail para confirmar o cadastro.",
                });
            }
        } catch (error: any) {
            console.error("Auth error:", error);
            toast({
                variant: "destructive",
                title: mode === "forgotPassword" ? "Erro ao recuperar senha" : mode === "signIn" ? "Erro no login" : "Erro no cadastro",
                description: error.message || "Ocorreu um erro inesperado.",
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
                        <span className="text-4xl hover:scale-110 transition-transform cursor-default">🏇</span>
                    </div>
                    <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Estância Tordilha</h1>
                    <p className="text-slate-500 font-medium">
                        {mode === "signIn" ? "Faça login para acessar o sistema" :
                            mode === "signUp" ? "Crie sua conta para começar" :
                                "Recupere o acesso à sua conta"}
                    </p>
                </div>

                <form onSubmit={handleAuth} className="space-y-5 text-left">
                    {mode === "signUp" && (
                        <>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700 ml-1">Nome Completo</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <User size={20} strokeWidth={1.5} className="text-slate-400" />
                                    </div>
                                    <Input
                                        type="text"
                                        placeholder="Seu nome completo"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        className="h-14 pl-11 rounded-2xl bg-slate-50 border-slate-200 shadow-sm focus:ring-2 focus:ring-[#EAB308] focus:border-[#EAB308] text-slate-800 transition-all font-medium focus:bg-white"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700 ml-1">Selecione seu Perfil</label>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setSelectedRole("gestor")}
                                        className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all ${selectedRole === "gestor" ? "border-[#EAB308] bg-[#EAB308]/10 text-[#EAB308]" : "border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200"}`}
                                    >
                                        <Briefcase size={24} strokeWidth={1.5} className="mb-2" />
                                        <span className="text-xs font-bold">Gestor</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedRole("professor")}
                                        className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all ${selectedRole === "professor" ? "border-[#EAB308] bg-[#EAB308]/10 text-[#EAB308]" : "border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200"}`}
                                    >
                                        <UserCircle size={24} strokeWidth={1.5} className="mb-2" />
                                        <span className="text-xs font-bold">Professor</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedRole("pais")}
                                        className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all ${selectedRole === "pais" ? "border-[#EAB308] bg-[#EAB308]/10 text-[#EAB308]" : "border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200"}`}
                                    >
                                        <Users size={24} strokeWidth={1.5} className="mb-2" />
                                        <span className="text-xs font-bold">Responsável</span>
                                    </button>
                                </div>
                            </div>
                        </>
                    )}

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700 ml-1">E-mail</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Mail size={20} strokeWidth={1.5} className="text-slate-400" />
                            </div>
                            <Input
                                type="email"
                                placeholder="seu@email.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="h-14 pl-11 rounded-2xl bg-slate-50 border-slate-200 shadow-sm focus:ring-2 focus:ring-[#EAB308] focus:border-[#EAB308] text-slate-800 transition-all font-medium focus:bg-white"
                                required
                            />
                        </div>
                    </div>

                    {mode !== "forgotPassword" && (
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700 ml-1">Senha</label>
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
                    )}

                    {mode === "signUp" && (
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700 ml-1">Confirme a Senha</label>
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
                    )}

                    <Button
                        type="submit"
                        disabled={loading}
                        className="w-full h-14 rounded-full bg-[#EAB308] hover:bg-[#D97706] text-white font-bold text-lg mt-6 shadow-lg shadow-[#EAB308]/20 transition-all active:scale-[0.98]"
                    >
                        {loading ? "Processando..." : (
                            <span className="flex items-center gap-2">
                                {mode === "signIn" ? "Entrar" : mode === "signUp" ? "Criar Conta" : "Enviar Email"} <LogIn size={20} strokeWidth={2} className="text-white" />
                            </span>
                        )}
                    </Button>
                </form>

                <div className="pt-2 space-y-4">
                    <p className="text-sm text-slate-500 font-medium">
                        {mode === "signIn" ? (
                            <>
                                Não tem uma conta?{" "}
                                <button
                                    type="button"
                                    onClick={() => setMode("signUp")}
                                    className="text-slate-700 font-bold hover:text-[#EAB308] transition-colors"
                                >
                                    Cadastre-se
                                </button>
                            </>
                        ) : (
                            <>
                                Já tem uma conta?{" "}
                                <button
                                    type="button"
                                    onClick={() => setMode("signIn")}
                                    className="text-slate-700 font-bold hover:text-[#EAB308] transition-colors"
                                >
                                    Fazer Login
                                </button>
                            </>
                        )}
                    </p>

                    {mode === "signIn" && (
                        <p className="text-sm text-slate-500 font-medium pt-2">
                            Esqueceu sua senha?{" "}
                            <button type="button" onClick={() => setMode("forgotPassword")} className="text-slate-700 font-bold hover:text-[#EAB308] transition-colors">
                                Recuperar
                            </button>
                        </p>
                    )}

                    {mode === "forgotPassword" && (
                        <p className="text-sm text-slate-500 font-medium pt-2">
                            Lembrou a senha?{" "}
                            <button type="button" onClick={() => setMode("signIn")} className="text-slate-700 font-bold hover:text-[#EAB308] transition-colors">
                                Voltar ao Login
                            </button>
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Login;
