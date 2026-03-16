import { useState, useEffect } from "react";
import { useProfessores } from "@/hooks/useProfessores";
import { Mail, User, ChevronRight, Search, Loader2, ShieldCheck, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { ActionSheet } from "@/components/ui/ActionSheet";
import { AvatarWithFallback } from "@/components/ui/AvatarWithFallback";
import { supabase } from "@/lib/supabase";

export const GestorAdminPanel = () => {
  const { professores, isLoading, refetch } = useProfessores(); 
  const [searchTerm, setSearchTerm] = useState("");
  const [activeType, setActiveType] = useState<"professor" | "gestor">("professor");
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<"professor" | "gestor">("professor");
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const handleOpenForm = (e: any) => {
      const type = e.detail?.type || (e.type === 'open-form-gestor' ? 'gestor' : 'professor');
      setFormType(type);
      setShowForm(true);
    };

    window.addEventListener('open-form-professor', handleOpenForm);
    window.addEventListener('open-form-gestor', handleOpenForm);
    return () => {
      window.removeEventListener('open-form-professor', handleOpenForm);
      window.removeEventListener('open-form-gestor', handleOpenForm);
    };
  }, []);

  const filteredUsers = professores.filter(p => 
    p.role === activeType && 
    p.email?.toLowerCase() !== "leonardo.informatica@gmail.com" &&
    (
      p.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.email?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const { error } = await supabase.functions.invoke('create-user', {
        body: { 
          action: 'create',
          email: newUserEmail, 
          fullName: newUserName, 
          role: formType 
        },
      });

      if (error) {
        const body = await (error as any).context?.json().catch(() => ({}));
        throw new Error(body?.error || error.message);
      }

      toast({
        title: "Sucesso!",
        description: `Usuário criado. Senha temporária: Tordilha@2026. Peça para ele confirmar o e-mail.`,
      });
      
      setNewUserName("");
      setNewUserEmail("");
      setShowForm(false);
      setTimeout(() => refetch?.(), 1000);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao criar",
        description: error.message,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async (userId: string, name: string) => {
    if (!confirm(`Tem certeza que deseja remover permanentemente o acesso de ${name}?`)) return;

    try {
      setSubmitting(true);
      toast({ 
        title: "Removendo...", 
        description: "Aguarde enquanto processamos a exclusão." 
      });

      const { error } = await supabase.functions.invoke('create-user', {
        body: { action: 'delete', userId },
      });

      if (error) {
        const body = await (error as any).context?.json().catch(() => ({}));
        throw new Error(body?.error || error.message);
      }

      toast({
        title: "Usuário Removido",
        description: "O registro foi excluído com sucesso do sistema.",
      });

      // Atualizar os dados localmente
      await refetch?.();
      
      // Delay extra para garantir consistência visual no Supabase
      setTimeout(() => {
        refetch?.();
      }, 1200);

    } catch (err: any) {
      console.error("Erro ao excluir:", err);
      toast({
        variant: "destructive",
        title: "Falha na Exclusão",
        description: err.message || "Ocorreu um erro ao tentar remover o usuário.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Administração</h2>
        
        <div className="flex bg-slate-100 p-1 rounded-2xl w-full">
          <button
            onClick={() => setActiveType("professor")}
            className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${
              activeType === "professor" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
            }`}
          >
            Professores
          </button>
          <button
            onClick={() => setActiveType("gestor")}
            className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${
              activeType === "gestor" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
            }`}
          >
            Gestores
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <Input
            placeholder={`Buscar ${activeType}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-12 rounded-2xl bg-white border-slate-200 shadow-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="animate-spin text-[#4E593F]" size={32} />
            <p className="text-sm font-medium text-slate-500">Carregando...</p>
          </div>
        ) : filteredUsers.length > 0 ? (
          filteredUsers.map((user) => (
            <div 
              key={user.id}
              className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between group active:scale-[0.98] transition-all"
            >
              <div className="flex items-center gap-4">
                <AvatarWithFallback
                  src={user.avatar_url}
                  alt={user.full_name || "Usuário"}
                  className="w-12 h-12 rounded-2xl border-2 border-slate-50"
                  type="user"
                />
                <div>
                  <h3 className="font-bold text-slate-900 leading-tight">{user.full_name}</h3>
                  {user.email && <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">{user.email}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  disabled={submitting}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteUser(user.id, user.full_name || "");
                  }}
                  className="p-2.5 rounded-xl hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="animate-spin" size={18} /> : <Trash2 size={18} />}
                </button>
                <ChevronRight size={20} className="text-slate-300 group-hover:text-slate-500 transition-colors" />
              </div>
            </div>
          ))
        ) : (
          <div className="bg-slate-50 rounded-3xl p-8 border border-dashed border-slate-200 text-center">
            <p className="text-sm text-slate-500">Nenhum {activeType === 'professor' ? 'professor' : 'gestor'} encontrado.</p>
          </div>
        )}
      </div>

      <ActionSheet 
        isOpen={showForm} 
        onClose={() => setShowForm(false)}
        title={formType === 'professor' ? "Novo Professor" : "Novo Gestor"}
        subtitle="O usuário receberá um convite por e-mail"
      >
        <form onSubmit={handleCreateUser} className="space-y-4 py-2">
          {/* ... campos de nome e email permanecem os mesmos ... */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 ml-1">Nome Completo</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <Input
                placeholder="Nome do usuário"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                className="pl-10 h-12 rounded-2xl bg-slate-50 border-transparent focus:bg-white"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 ml-1">E-mail de Acesso</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <Input
                type="email"
                placeholder="email@exemplo.com"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                className="pl-10 h-12 rounded-2xl bg-slate-50 border-transparent focus:bg-white"
                required
              />
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-2xl flex gap-3 mt-4">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
              <ShieldCheck size={18} className="text-blue-600" />
            </div>
            <div>
              <p className="text-xs font-bold text-blue-900">Configuração de Senha</p>
              <p className="text-[11px] text-blue-700 leading-tight mt-0.5">
                O usuário receberá um link por e-mail para criar sua senha e ativar o acesso.
              </p>
            </div>
          </div>

          <Button 
            disabled={submitting}
            className="w-full h-12 rounded-full bg-[#4E593F] hover:bg-[#3E4732] text-white font-bold mt-4 shadow-lg shadow-[#4E593F]/20"
          >
            {submitting ? "Processando..." : `Convidar ${formType === 'professor' ? "Professor" : "Gestor"}`}
          </Button>
        </form>
      </ActionSheet>
    </div>
  );
};
