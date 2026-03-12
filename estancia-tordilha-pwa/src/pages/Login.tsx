import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { LogIn, Mail, Lock, User, Briefcase, Users, UserCircle, Phone, Cake } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

const Login = () => {
    const [mode, setMode] = useState<"signIn" | "signUp" | "forgotPassword">("signIn");
    const [fullName, setFullName] = useState("");
    const [selectedRole, setSelectedRole] = useState<"gestor" | "professor" | "pais" | "">("");
    const [alunos, setAlunos] = useState<{ nome: string; idade: string; diagnostico: string }[]>([{ nome: "", idade: "", diagnostico: "" }]);
    const [patrocinador, setPatrocinador] = useState("");
    const [telefone, setTelefone] = useState("");
    const [lgpd, setLgpd] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();
    const navigate = useNavigate();

    const addAluno = () => setAlunos([...alunos, { nome: "", idade: "", diagnostico: "" }]);
    const updateAlunoField = (index: number, field: "nome" | "idade" | "diagnostico", val: string) => {
        const newAlunos = [...alunos];
        newAlunos[index][field] = val;
        setAlunos(newAlunos);
    };
    const removeAluno = (index: number) => {
        if (alunos.length > 1) {
            setAlunos(alunos.filter((_, i) => i !== index));
        } else {
            setAlunos([{ nome: "", idade: "", diagnostico: "" }]);
        }
    };

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
                        emailRedirectTo: window.location.origin,
                        data: {
                            nome_completo: fullName,
                            role: selectedRole,
                            telefone,
                            lgpd_assinado: lgpd,
                            aluno_nomes: selectedRole === "pais" ? alunos.filter(a => a.nome.trim() !== "").map(a => a.nome).join(", ") : undefined,
                            aluno_idades: selectedRole === "pais" ? alunos.filter(a => a.nome.trim() !== "").map(a => a.idade).join(", ") : undefined,
                            aluno_diagnosticos: selectedRole === "pais" ? alunos.filter(a => a.nome.trim() !== "").map(a => a.diagnostico).join(", ") : undefined,
                            patrocinador: selectedRole === "pais" ? patrocinador : undefined,
                        }
                    }
                });
                if (error) throw error;
                toast({
                    title: "Conta criada com sucesso!",
                    description: "Agora você já pode fazer o seu login.",
                });
                setMode("signIn");
                setEmail("");
                setPassword("");
                setConfirmPassword("");
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

                            {selectedRole === "pais" && (
                                <>
                                    <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                                        <div className="flex items-center justify-between ml-1">
                                            <label className="text-sm font-bold text-slate-700">Aluno(s) Sob sua Responsabilidade</label>
                                            <button
                                                type="button"
                                                onClick={addAluno}
                                                className="text-[10px] font-bold uppercase tracking-wider text-[#EAB308] bg-[#EAB308]/10 px-2.5 py-1.5 rounded-lg hover:bg-[#EAB308]/20 transition-all"
                                            >
                                                + Adicionar
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-1 gap-4">
                                            {alunos.map((aluno, index) => (
                                                <div key={index} className="space-y-3 p-4 bg-slate-50/50 rounded-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none">
                                                            Aluno {index + 1}
                                                        </span>
                                                        {alunos.length > 1 && (
                                                            <button
                                                                type="button"
                                                                onClick={() => removeAluno(index)}
                                                                className="text-slate-300 hover:text-red-500 transition-colors"
                                                            >
                                                                <Users size={16} strokeWidth={1.5} />
                                                            </button>
                                                        )}
                                                    </div>
                                                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                                                        <div className="sm:col-span-3 relative group transition-all">
                                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                                <User size={18} strokeWidth={1.5} className="text-slate-400 group-focus-within:text-[#EAB308] transition-colors" />
                                                            </div>
                                                            <Input
                                                                type="text"
                                                                placeholder="Nome do Aluno"
                                                                value={aluno.nome}
                                                                onChange={(e) => updateAlunoField(index, "nome", e.target.value)}
                                                                className="h-14 pl-11 rounded-2xl bg-white border-slate-200 shadow-sm focus:ring-2 focus:ring-[#EAB308] focus:border-[#EAB308] text-slate-800 transition-all font-medium"
                                                                required={index === 0}
                                                            />
                                                        </div>
                                                        <div className="relative group transition-all">
                                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                                <Cake size={18} strokeWidth={1.5} className="text-slate-400 group-focus-within:text-[#EAB308] transition-colors" />
                                                            </div>
                                                            <Input
                                                                type="number"
                                                                placeholder="Idade"
                                                                value={aluno.idade}
                                                                onChange={(e) => updateAlunoField(index, "idade", e.target.value)}
                                                                className="h-14 pl-11 rounded-2xl bg-white border-slate-200 shadow-sm focus:ring-2 focus:ring-[#EAB308] focus:border-[#EAB308] text-slate-800 transition-all font-medium [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                                required={index === 0}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="relative group transition-all">
                                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                            <Briefcase size={18} strokeWidth={1.5} className="text-slate-400 group-focus-within:text-[#EAB308] transition-colors" />
                                                        </div>
                                                        <Input
                                                            type="text"
                                                            placeholder="Diagnóstico (Ex: TDAH, TEA...)"
                                                            value={aluno.diagnostico}
                                                            onChange={(e) => updateAlunoField(index, "diagnostico", e.target.value)}
                                                            className="h-14 pl-11 rounded-2xl bg-white border-slate-200 shadow-sm focus:ring-2 focus:ring-[#EAB308] focus:border-[#EAB308] text-slate-800 transition-all font-medium"
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                        <label className="text-sm font-medium text-slate-700 ml-1">Patrocinador</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                <Briefcase size={20} strokeWidth={1.5} className="text-slate-400" />
                                            </div>
                                            <Input
                                                type="text"
                                                placeholder="Ex: Prefeitura, Empresa X, Particular..."
                                                value={patrocinador}
                                                onChange={(e) => setPatrocinador(e.target.value)}
                                                className="h-14 pl-11 rounded-2xl bg-slate-50 border-slate-200 shadow-sm focus:ring-2 focus:ring-[#EAB308] focus:border-[#EAB308] text-slate-800 transition-all font-medium focus:bg-white"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                        <label className="text-sm font-medium text-slate-700 ml-1">Telefone / WhatsApp</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                <Phone size={20} strokeWidth={1.5} className="text-slate-400" />
                                            </div>
                                            <Input
                                                type="tel"
                                                placeholder="(00) 00000-0000"
                                                value={telefone}
                                                onChange={(e) => setTelefone(e.target.value)}
                                                className="h-14 pl-11 rounded-2xl bg-slate-50 border-slate-200 shadow-sm focus:ring-2 focus:ring-[#EAB308] focus:border-[#EAB308] text-slate-800 transition-all font-medium focus:bg-white"
                                                required={selectedRole === "pais"}
                                            />
                                        </div>
                                    </div>

                                    <div className="flex items-start items-center space-x-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 animate-in fade-in slide-in-from-top-2">
                                        <Checkbox 
                                            id="lgpd" 
                                            checked={lgpd} 
                                            onCheckedChange={(checked) => setLgpd(checked === true)}
                                            required={selectedRole === "pais"}
                                            className="h-5 w-5 rounded-lg border-2 border-slate-300 data-[state=checked]:bg-[#EAB308] data-[state=checked]:border-[#EAB308]"
                                        />
                                        <div className="grid gap-1.5 leading-none">
                                            <label
                                                htmlFor="lgpd"
                                                className="text-[13px] font-medium text-slate-600 leading-tight cursor-pointer select-none"
                                            >
                                                Autorizo o uso de dados e imagens conforme a Lei Geral de Proteção de Dados (LGPD).
                                            </label>
                                        </div>
                                    </div>
                                </>
                            )}
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
