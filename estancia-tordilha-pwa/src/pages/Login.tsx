import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { LogIn, Mail, Lock, User, Briefcase, Users, UserCircle, Phone, Cake, Check, AlertCircle, FileText, Eye, EyeOff } from "lucide-react";
import logoMarrom from "@/assets/logo-marrom.png";
import { Checkbox } from "@/components/ui/checkbox";
import { ActionSheet } from "@/components/ui/ActionSheet";
import { ImageRightsForm } from "@/components/auth/ImageRightsForm";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const Login = () => {
    const [mode, setMode] = useState<"signIn" | "signUp" | "forgotPassword" | "changePassword">("signIn");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showNewConfirmPassword, setShowNewConfirmPassword] = useState(false);
    const [newPassword, setNewPassword] = useState("");
    const [newConfirmPassword, setNewConfirmPassword] = useState("");
    const [fullName, setFullName] = useState("");
    const [selectedRole, setSelectedRole] = useState<"gestor" | "professor" | "pais" | "">("");
    const [alunos, setAlunos] = useState<{ nome: string; idade: string; diagnostico: string }[]>([{ nome: "", idade: "", diagnostico: "" }]);
    const [patrocinador, setPatrocinador] = useState("");
    const [telefone, setTelefone] = useState("");
    const [rg, setRg] = useState("");
    const [cpf, setCpf] = useState("");
    const [endereco, setEndereco] = useState("");
    const [cidade, setCidade] = useState("");
    const [estado, setEstado] = useState("");
    const [autorizaImagem, setAutorizaImagem] = useState(true);
    const [lgpd, setLgpd] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showImageRights, setShowImageRights] = useState(false);
    const [imageRightsConfirmed, setImageRightsConfirmed] = useState(false);
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();
    const navigate = useNavigate();

    // Close image rights sheet when leaving signUp mode
    useEffect(() => {
        if (mode !== "signUp") {
            setShowImageRights(false);
        }
    }, [mode]);

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
            } else if (mode === "changePassword") {
                if (newPassword !== newConfirmPassword) {
                    toast({ variant: "destructive", title: "Senhas não conferem", description: "A nova senha e a confirmação devem ser iguais." });
                    setLoading(false);
                    return;
                }
                if (newPassword.length < 6) {
                    toast({ variant: "destructive", title: "Senha muito curta", description: "A senha deve ter pelo menos 6 caracteres." });
                    setLoading(false);
                    return;
                }
                const { error: updateError } = await supabase.auth.updateUser({
                    password: newPassword,
                    data: { needs_password_change: false }
                });
                if (updateError) throw updateError;
                toast({ title: "Senha criada!", description: "Seu acesso está configurado. Bem-vindo!" });
                navigate("/");
                return;
            } else if (mode === "signIn") {
                const { data, error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;

                if (data.session) {
                    const needsChange = data.user?.user_metadata?.needs_password_change;
                    if (needsChange) {
                        setMode("changePassword");
                        setNewPassword("");
                        setNewConfirmPassword("");
                        return;
                    }
                    toast({ title: "Login realizado", description: "Bem-vindo de volta!" });
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
                const { error: signUpError } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        emailRedirectTo: window.location.origin,
                        data: {
                            nome_completo: fullName,
                            role: selectedRole,
                            telefone,
                            lgpd_assinado: lgpd,
                            cidade: cidade,
                            estado: estado,
                        }
                    }
                });

                const isAlreadyRegistered = signUpError?.message.includes('already been registered');

                // If user already exists, we continue to sync their profile data
                if (signUpError && !isAlreadyRegistered) {
                    throw signUpError;
                }
                if (mode === "signUp" && selectedRole === "pais") {
                    // 1. Create/Get Responsavel record
                    let { data: resp } = await supabase
                        .from('responsaveis')
                        .select('id')
                        .eq('email', email)
                        .maybeSingle();

                    let responsavelId = resp?.id;

                    if (!responsavelId) {
                        const { data: newResp, error: createError } = await supabase
                            .from('responsaveis')
                            .insert({
                                nome: fullName,
                                email: email,
                                telefone: telefone,
                                cpf: cpf,
                                rg: rg,
                                endereco: endereco,
                                cidade: cidade,
                                estado: estado
                            })
                            .select('id')
                            .single();

                        if (!createError) responsavelId = newResp.id;
                    } else {
                        // Update existing record with any new info
                        await supabase
                            .from('responsaveis')
                            .update({
                                nome: fullName,
                                telefone: telefone,
                                cpf: cpf,
                                rg: rg,
                                endereco: endereco,
                                cidade: cidade,
                                estado: estado
                            })
                            .eq('id', responsavelId);
                    }

                    // 2. Create Students and Link them (With De-duplication check)
                    if (responsavelId) {
                        // Fetch all aluno_ids already linked to this responsavel
                        const { data: linkedAlunos } = await supabase
                            .from('aluno_responsavel')
                            .select('aluno_id')
                            .eq('responsavel_id', responsavelId);
                        const linkedIds = new Set((linkedAlunos ?? []).map(l => l.aluno_id));

                        for (const aluno of alunos.filter(a => a.nome.trim() !== "")) {
                            // Check if student exists globally by name
                            const { data: globalAluno } = await supabase
                                .from('alunos')
                                .select('id')
                                .eq('nome', aluno.nome.trim())
                                .maybeSingle();

                            let alunoId = globalAluno?.id;

                            if (!alunoId) {
                                // Create new student with all fields
                                const { data: newAluno, error: alunoError } = await supabase
                                    .from('alunos')
                                    .insert({
                                        nome: aluno.nome.trim(),
                                        idade: aluno.idade ? parseInt(aluno.idade) : null,
                                        diagnostico: aluno.diagnostico.trim() || null,
                                        autoriza_imagem: autorizaImagem,
                                        data_autorizacao_imagem: autorizaImagem ? new Date().toISOString() : null,
                                    })
                                    .select('id')
                                    .single();

                                if (!alunoError && newAluno) {
                                    alunoId = newAluno.id;
                                }
                            } else {
                                // Update autoriza_imagem on existing record
                                await supabase
                                    .from('alunos')
                                    .update({
                                        autoriza_imagem: autorizaImagem,
                                        data_autorizacao_imagem: autorizaImagem ? new Date().toISOString() : null,
                                    })
                                    .eq('id', alunoId);
                            }

                            // Link only if not already linked
                            if (alunoId && !linkedIds.has(alunoId)) {
                                await supabase
                                    .from('aluno_responsavel')
                                    .insert({
                                        aluno_id: alunoId,
                                        responsavel_id: responsavelId,
                                        parentesco: 'Responsável'
                                    });
                            }
                        }
                    }
                }

                toast({
                    title: isAlreadyRegistered ? "Dados atualizados!" : "Conta criada com sucesso!",
                    description: isAlreadyRegistered 
                        ? "Seus dados foram sincronizados. Você já pode fazer login."
                        : "Agora você já pode fazer o seu login.",
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
                    <div className="flex items-center justify-center mx-auto mb-6">
                        <img src={logoMarrom} alt="Estância Tordilha" className="h-24 object-contain" />
                    </div>
                    <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Estância Tordilha</h1>
                    <p className="text-slate-500 font-medium">
                        {mode === "signIn" ? "Faça login para acessar o sistema" :
                            mode === "signUp" ? "Crie sua conta para começar" :
                            mode === "changePassword" ? "Crie sua senha definitiva para continuar" :
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
                                        className="h-14 pl-11 rounded-2xl bg-slate-50 border-slate-200 shadow-sm focus:ring-2 focus:ring-[#4E593F] focus:border-[#4E593F] text-slate-800 transition-all font-medium focus:bg-white"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="space-y-2 hidden">
                                <label className="text-sm font-medium text-slate-700 ml-1">Selecione seu Perfil</label>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setSelectedRole("gestor")}
                                        className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all ${selectedRole === "gestor" ? "border-[#4E593F] bg-[#4E593F]/10 text-[#4E593F]" : "border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200"}`}
                                    >
                                        <Briefcase size={24} strokeWidth={1.5} className="mb-2" />
                                        <span className="text-xs font-bold">Gestor</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedRole("professor")}
                                        className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all ${selectedRole === "professor" ? "border-[#4E593F] bg-[#4E593F]/10 text-[#4E593F]" : "border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200"}`}
                                    >
                                        <UserCircle size={24} strokeWidth={1.5} className="mb-2" />
                                        <span className="text-xs font-bold">Terapeuta</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelectedRole("pais");
                                            if (!imageRightsConfirmed) {
                                                setShowImageRights(true);
                                            }
                                        }}
                                        className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all ${selectedRole === "pais" ? "border-[#4E593F] bg-[#4E593F]/10 text-[#4E593F]" : "border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200"}`}
                                    >
                                        <Users size={24} strokeWidth={1.5} className="mb-2" />
                                        <span className="text-xs font-bold">Responsável</span>
                                        {imageRightsConfirmed && <Check size={12} className="mt-1" />}
                                    </button>
                                </div>
                            </div>

                            {selectedRole === "pais" && (
                                <>
                                    <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                                        <div className="flex items-center justify-between ml-1">
                                            <label className="text-sm font-bold text-slate-700">Praticante(s) Sob sua Responsabilidade</label>
                                            <button
                                                type="button"
                                                onClick={addAluno}
                                                className="text-[10px] font-bold uppercase tracking-wider text-[#4E593F] bg-[#4E593F]/10 px-2.5 py-1.5 rounded-lg hover:bg-[#4E593F]/20 transition-all"
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
                                                    <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                                                        <div className="sm:col-span-3 relative group transition-all">
                                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                                <User size={18} strokeWidth={1.5} className="text-slate-400 group-focus-within:text-[#4E593F] transition-colors" />
                                                            </div>
                                                            <Input
                                                                type="text"
                                                                placeholder="Nome do Praticante"
                                                                value={aluno.nome}
                                                                onChange={(e) => updateAlunoField(index, "nome", e.target.value)}
                                                                className="h-14 pl-11 rounded-2xl bg-white border-slate-200 shadow-sm focus:ring-2 focus:ring-[#4E593F] focus:border-[#4E593F] text-slate-800 transition-all font-medium"
                                                                required={index === 0}
                                                            />
                                                        </div>
                                                        <div className="sm:col-span-2 relative group transition-all">
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <div className="w-full">
                                                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                                                                            <Cake size={18} strokeWidth={1.5} className="text-slate-400 group-focus-within:text-[#4E593F] transition-colors" />
                                                                        </div>
                                                                        <Input
                                                                            type="number"
                                                                            placeholder="Idade do Praticante"
                                                                            value={aluno.idade}
                                                                            onChange={(e) => updateAlunoField(index, "idade", e.target.value)}
                                                                            onInvalid={(e: any) => e.target.setCustomValidity('A IDADE do aluno precisa ser preenchida.')}
                                                                            onInput={(e: any) => e.target.setCustomValidity('')}
                                                                            className="h-14 pl-11 rounded-2xl bg-white border-slate-200 shadow-sm focus:ring-2 focus:ring-[#4E593F] focus:border-[#4E593F] text-slate-800 transition-all font-medium [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                                            required={index === 0}
                                                                        />
                                                                    </div>
                                                                </TooltipTrigger>
                                                                <TooltipContent side="top" className="bg-slate-800 text-white border-none shadow-lg">
                                                                    <p className="text-xs font-semibold">Esta informação é usada para adequar as atividades ao nível de desenvolvimento do aluno.</p>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </div>
                                                    </div>
                                                    <div className="relative group transition-all">
                                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                            <Briefcase size={18} strokeWidth={1.5} className="text-slate-400 group-focus-within:text-[#4E593F] transition-colors" />
                                                        </div>
                                                        <Input
                                                            type="text"
                                                            placeholder="Diagnóstico (Ex: TDAH, TEA...)"
                                                            value={aluno.diagnostico}
                                                            onChange={(e) => updateAlunoField(index, "diagnostico", e.target.value)}
                                                            className="h-14 pl-11 rounded-2xl bg-white border-slate-200 shadow-sm focus:ring-2 focus:ring-[#4E593F] focus:border-[#4E593F] text-slate-800 transition-all font-medium"
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
                                                className="h-14 pl-11 rounded-2xl bg-slate-50 border-slate-200 shadow-sm focus:ring-2 focus:ring-[#4E593F] focus:border-[#4E593F] text-slate-800 transition-all font-medium focus:bg-white"
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
                                                className="h-14 pl-11 rounded-2xl bg-slate-50 border-slate-200 shadow-sm focus:ring-2 focus:ring-[#4E593F] focus:border-[#4E593F] text-slate-800 transition-all font-medium focus:bg-white"
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
                                            className="h-5 w-5 rounded-lg border-2 border-slate-300 data-[state=checked]:bg-[#4E593F] data-[state=checked]:border-[#4E593F]"
                                        />
                                        <div className="grid gap-1.5 leading-none">
                                            <label
                                                htmlFor="lgpd"
                                                className="text-[13px] font-medium text-slate-600 leading-tight cursor-pointer select-none"
                                            >
                                                Autorizo o uso de dados conforme a Lei Geral de Proteção de Dados (LGPD).
                                            </label>
                                        </div>
                                    </div>

                                    {selectedRole === "pais" && (
                                        imageRightsConfirmed ? (
                                            <div className="p-4 bg-[#4E593F]/5 rounded-2xl border border-[#4E593F]/20 flex items-center justify-between animate-in fade-in duration-300">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-full bg-[#4E593F] flex items-center justify-center">
                                                        <Check size={16} className="text-white" />
                                                    </div>
                                                    <span className="text-xs font-bold text-[#4E593F]">Autorização de Imagem Concluída</span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setShowImageRights(true)}
                                                    className="text-[10px] font-bold uppercase underline text-[#4E593F]"
                                                >
                                                    Editar
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => setShowImageRights(true)}
                                                className="w-full p-4 bg-amber-50 border-2 border-amber-200 rounded-2xl flex items-center gap-3 text-left animate-in fade-in duration-300 hover:bg-amber-100 transition-colors"
                                            >
                                                <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                                                    <FileText size={18} className="text-amber-600" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-amber-800">Autorização de Imagem pendente</p>
                                                    <p className="text-xs text-amber-600 font-medium">Obrigatório para concluir o cadastro</p>
                                                </div>
                                                <AlertCircle size={18} className="text-amber-500 ml-auto shrink-0" />
                                            </button>
                                        )
                                    )}
                                </>
                            )}
                        </>
                    )}

                    <ActionSheet
                        isOpen={showImageRights}
                        onClose={() => setShowImageRights(false)}
                        title="Autorização de Imagem"
                        subtitle="Preencha todos os campos para continuar"
                        preventClose
                    >
                        <ImageRightsForm 
                            responsibleName={fullName}
                            rg={rg}
                            setRg={setRg}
                            cpf={cpf}
                            setCpf={setCpf}
                            address={endereco}
                            setAddress={setEndereco}
                            city={cidade}
                            setCity={setCidade}
                            state={estado}
                            setState={setEstado}
                            setResponsibleName={setFullName}
                            studentNames={alunos.filter(a => a.nome.trim() !== "").map(a => a.nome).join(", ")}
                            authorized={autorizaImagem}
                            setAuthorized={setAutorizaImagem}
                            onConfirm={() => {
                                setImageRightsConfirmed(true);
                                setShowImageRights(false);
                            }}
                        />
                    </ActionSheet>

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
                                className="h-14 pl-11 rounded-2xl bg-slate-50 border-slate-200 shadow-sm focus:ring-2 focus:ring-[#4E593F] focus:border-[#4E593F] text-slate-800 transition-all font-medium focus:bg-white"
                                required
                            />
                        </div>
                    </div>

                    {mode !== "forgotPassword" && mode !== "changePassword" && (
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700 ml-1">Senha</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Lock size={20} strokeWidth={1.5} className="text-slate-400" />
                                </div>
                                <Input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="h-14 pl-11 pr-12 rounded-2xl bg-slate-50 border-slate-200 shadow-sm focus:ring-2 focus:ring-[#4E593F] focus:border-[#4E593F] text-slate-800 transition-all font-medium focus:bg-white"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    {showPassword ? <EyeOff size={20} strokeWidth={1.5} /> : <Eye size={20} strokeWidth={1.5} />}
                                </button>
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
                                    type={showConfirmPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className={`h-14 pl-11 pr-12 rounded-2xl bg-slate-50 border-slate-200 shadow-sm focus:ring-2 focus:ring-[#4E593F] focus:border-[#4E593F] text-slate-800 transition-all font-medium focus:bg-white ${confirmPassword && password !== confirmPassword ? 'border-red-300 ring-red-100 focus:ring-red-500 focus:border-red-500' : ''}`}
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    {showConfirmPassword ? <EyeOff size={20} strokeWidth={1.5} /> : <Eye size={20} strokeWidth={1.5} />}
                                </button>
                            </div>
                        </div>
                    )}

                    {mode === "changePassword" && (
                        <>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700 ml-1">Nova Senha</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Lock size={20} strokeWidth={1.5} className="text-slate-400" />
                                    </div>
                                    <Input
                                        type={showNewPassword ? "text" : "password"}
                                        placeholder="••••••••"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="h-14 pl-11 pr-12 rounded-2xl bg-slate-50 border-slate-200 shadow-sm focus:ring-2 focus:ring-[#4E593F] focus:border-[#4E593F] text-slate-800 transition-all font-medium focus:bg-white"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowNewPassword(!showNewPassword)}
                                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                                    >
                                        {showNewPassword ? <EyeOff size={20} strokeWidth={1.5} /> : <Eye size={20} strokeWidth={1.5} />}
                                    </button>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700 ml-1">Confirme a Nova Senha</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Lock size={20} strokeWidth={1.5} className="text-slate-400" />
                                    </div>
                                    <Input
                                        type={showNewConfirmPassword ? "text" : "password"}
                                        placeholder="••••••••"
                                        value={newConfirmPassword}
                                        onChange={(e) => setNewConfirmPassword(e.target.value)}
                                        className={`h-14 pl-11 pr-12 rounded-2xl bg-slate-50 border-slate-200 shadow-sm focus:ring-2 focus:ring-[#4E593F] focus:border-[#4E593F] text-slate-800 transition-all font-medium focus:bg-white ${newConfirmPassword && newPassword !== newConfirmPassword ? 'border-red-300 ring-red-100 focus:ring-red-500 focus:border-red-500' : ''}`}
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowNewConfirmPassword(!showNewConfirmPassword)}
                                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                                    >
                                        {showNewConfirmPassword ? <EyeOff size={20} strokeWidth={1.5} /> : <Eye size={20} strokeWidth={1.5} />}
                                    </button>
                                </div>
                            </div>
                        </>
                    )}

                    <Button
                        type="submit"
                        disabled={loading || (mode === "signUp" && selectedRole === "pais" && !imageRightsConfirmed)}
                        className="w-full h-14 rounded-full bg-[#4E593F] hover:bg-[#3E4732] text-white font-bold text-lg mt-6 shadow-lg shadow-[#4E593F]/20 transition-all active:scale-[0.98]"
                    >
                        {loading ? "Processando..." : (
                            <span className="flex items-center gap-2">
                                {mode === "signIn" ? "Entrar" : mode === "signUp" ? "Criar Conta" : mode === "changePassword" ? "Salvar Senha" : "Enviar Email"} <LogIn size={20} strokeWidth={2} className="text-white" />
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
                                    onClick={() => {
                                        setMode("signUp");
                                        setSelectedRole("pais");
                                        if (!imageRightsConfirmed) {
                                            setShowImageRights(true);
                                        }
                                    }}
                                    className="text-slate-700 font-bold hover:text-[#4E593F] transition-colors"
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
                                    className="text-slate-700 font-bold hover:text-[#4E593F] transition-colors"
                                >
                                    Fazer Login
                                </button>
                            </>
                        )}
                    </p>

                    {mode === "signIn" && (
                        <p className="text-sm text-slate-500 font-medium pt-2">
                            Esqueceu sua senha?{" "}
                            <button type="button" onClick={() => setMode("forgotPassword")} className="text-slate-700 font-bold hover:text-[#4E593F] transition-colors">
                                Recuperar
                            </button>
                        </p>
                    )}

                    {mode === "forgotPassword" && (
                        <p className="text-sm text-slate-500 font-medium pt-2">
                            Lembrou a senha?{" "}
                            <button type="button" onClick={() => setMode("signIn")} className="text-slate-700 font-bold hover:text-[#4E593F] transition-colors">
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
