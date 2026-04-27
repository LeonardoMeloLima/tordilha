import { useState, useEffect } from "react";
import { useProfessores } from "@/hooks/useProfessores";
import { useResponsaveisPendentes } from "@/hooks/useResponsaveisPendentes";
import { useResponsaveisAprovados } from "@/hooks/useResponsaveisAprovados";
import { Mail, User, ChevronRight, Search, Loader2, ShieldCheck, Trash2, Copy, Check, UserCheck, UserX, Clock, Pencil, Users } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { ActionSheet } from "@/components/ui/ActionSheet";
import { AvatarWithFallback } from "@/components/ui/AvatarWithFallback";
import { supabase } from "@/lib/supabase";

export const GestorAdminPanel = () => {
  const { professores, isLoading, refetch } = useProfessores();
  const { pendentes, rejeitados, isLoading: loadingPendentes, aprovar, rejeitar } = useResponsaveisPendentes();
  const { responsaveis: aprovados, isLoading: loadingAprovados, update: updateResp } = useResponsaveisAprovados();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeType, setActiveType] = useState<"professor" | "gestor" | "pendentes" | "responsaveis">("professor");
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<"professor" | "gestor">("professor");
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [selectedResp, setSelectedResp] = useState<any>(null);
  const [respForm, setRespForm] = useState({ nome: "", telefone: "", cpf: "", rg: "", endereco: "", cidade: "", estado: "" });
  const [respVisibleCount, setRespVisibleCount] = useState(10);
  const { toast } = useToast();

  const TEMP_PASSWORD = "Tordilha@2026";

  const handleCopyPassword = () => {
    navigator.clipboard.writeText(TEMP_PASSWORD);
    setCopiedPassword(true);
    setTimeout(() => setCopiedPassword(false), 2000);
  };

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
    (activeType === "professor" || activeType === "gestor") &&
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
        title: "Usuário criado!",
        description: `Compartilhe a senha temporária abaixo com o novo usuário.`,
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
        
        <div className="flex bg-slate-100 p-1 rounded-2xl w-full overflow-x-auto gap-0.5 no-scrollbar">
          {(["professor", "gestor", "responsaveis", "pendentes"] as const).map((tab) => {
            const labels: Record<string, string> = { professor: "Terapeutas", gestor: "Gestores", responsaveis: "Responsáveis", pendentes: "Pendentes" };
            return (
              <button
                key={tab}
                onClick={() => { setActiveType(tab); setSearchTerm(""); setRespVisibleCount(10); }}
                className={`shrink-0 flex-1 min-w-[72px] py-2.5 text-xs font-bold rounded-xl transition-all relative ${activeType === tab ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}
              >
                {labels[tab]}
                {tab === "pendentes" && pendentes.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full text-[9px] font-black text-white flex items-center justify-center">
                    {pendentes.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <Input
            placeholder={activeType === "professor" ? "Buscar terapeuta..." : activeType === "gestor" ? "Buscar gestor..." : activeType === "responsaveis" ? "Buscar responsável..." : "Buscar pendente..."}
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setRespVisibleCount(10); }}
            className="pl-10 h-12 rounded-2xl bg-white border-slate-200 shadow-sm"
          />
        </div>
      </div>

      {/* Aba Pendentes */}
      {activeType === "pendentes" && (
        <div className="space-y-4">
          {loadingPendentes ? (
            <div className="flex justify-center py-12">
              <Loader2 className="animate-spin text-[#4E593F]" size={32} />
            </div>
          ) : pendentes.length === 0 && rejeitados.length === 0 ? (
            <div className="bg-slate-50 rounded-3xl p-8 border border-dashed border-slate-200 text-center">
              <UserCheck size={32} className="mx-auto text-slate-300 mb-3" />
              <p className="text-sm text-slate-500 font-medium">Nenhum cadastro pendente.</p>
            </div>
          ) : (
            <>
              {pendentes.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs font-black text-amber-600 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                    <Clock size={12} /> Aguardando aprovação ({pendentes.length})
                  </p>
                  {pendentes.map((r) => (
                    <div key={r.id} className="bg-white p-4 rounded-3xl border border-amber-100 shadow-sm">
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div>
                          <p className="font-bold text-slate-900">{r.nome}</p>
                          <p className="text-[11px] font-bold text-slate-400 uppercase mt-0.5">{r.email}</p>
                          {r.telefone && <p className="text-xs text-slate-500 mt-0.5">{r.telefone}</p>}
                          {r.criado_em && (
                            <p className="text-[10px] text-slate-400 mt-1">
                              Cadastrado {formatDistanceToNow(new Date(r.criado_em), { addSuffix: true, locale: ptBR })}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          disabled={aprovar.isPending}
                          onClick={() => aprovar.mutate(r.id)}
                          className="flex-1 flex items-center justify-center gap-1.5 h-10 rounded-2xl bg-[#4E593F] text-white text-xs font-black transition-all active:scale-95 disabled:opacity-50"
                        >
                          {aprovar.isPending ? <Loader2 size={14} className="animate-spin" /> : <UserCheck size={14} />}
                          Aprovar
                        </button>
                        <button
                          disabled={rejeitar.isPending}
                          onClick={() => rejeitar.mutate(r.id)}
                          className="flex-1 flex items-center justify-center gap-1.5 h-10 rounded-2xl border-2 border-red-100 text-red-500 text-xs font-black transition-all active:scale-95 disabled:opacity-50"
                        >
                          {rejeitar.isPending ? <Loader2 size={14} className="animate-spin" /> : <UserX size={14} />}
                          Rejeitar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {rejeitados.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs font-black text-red-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                    <UserX size={12} /> Rejeitados ({rejeitados.length})
                  </p>
                  {rejeitados.map((r) => (
                    <div key={r.id} className="bg-white p-4 rounded-3xl border border-red-100 shadow-sm opacity-70">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-bold text-slate-900">{r.nome}</p>
                          <p className="text-[11px] font-bold text-slate-400 uppercase mt-0.5">{r.email}</p>
                        </div>
                        <button
                          disabled={aprovar.isPending}
                          onClick={() => aprovar.mutate(r.id)}
                          className="px-3 py-1.5 rounded-xl bg-[#4E593F]/10 text-[#4E593F] text-xs font-black active:scale-95 transition-all"
                        >
                          Aprovar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Aba Responsáveis aprovados */}
      {activeType === "responsaveis" && (
        <div className="space-y-3">
          {loadingAprovados ? (
            <div className="flex justify-center py-12"><Loader2 className="animate-spin text-[#4E593F]" size={32} /></div>
          ) : (() => {
            const filtered = aprovados.filter(r =>
              r.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
              r.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
              r.telefone?.toLowerCase().includes(searchTerm.toLowerCase())
            );
            const displayed = filtered.slice(0, respVisibleCount);
            if (filtered.length === 0) return (
              <div className="bg-slate-50 rounded-3xl p-8 border border-dashed border-slate-200 text-center">
                <Users size={32} className="mx-auto text-slate-300 mb-3" />
                <p className="text-sm text-slate-500 font-medium">Nenhum responsável encontrado.</p>
              </div>
            );
            return (
              <>
                {displayed.map((r) => (
                  <div
                    key={r.id}
                    onClick={() => {
                      setSelectedResp(r);
                      setRespForm({ nome: r.nome || "", telefone: r.telefone || "", cpf: r.cpf || "", rg: r.rg || "", endereco: r.endereco || "", cidade: r.cidade || "", estado: r.estado || "" });
                    }}
                    className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between group active:scale-[0.98] transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-2xl bg-[#4E593F]/10 flex items-center justify-center shrink-0">
                        <User size={18} className="text-[#4E593F]" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 text-sm truncate">{r.nome}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase truncate">{r.email}</p>
                        {r.telefone && <p className="text-xs text-slate-500 mt-0.5">{r.telefone}</p>}
                      </div>
                    </div>
                    <Pencil size={16} className="text-slate-300 group-hover:text-slate-500 transition-colors shrink-0 ml-2" />
                  </div>
                ))}
                {filtered.length > respVisibleCount && (
                  <div className="pt-2 flex justify-center">
                    <button
                      onClick={() => setRespVisibleCount(prev => prev + 10)}
                      className="px-8 py-3 bg-white border border-slate-100 rounded-2xl shadow-sm text-[#4E593F] font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all"
                    >
                      Carregar mais 10
                    </button>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}

      {(activeType === "professor" || activeType === "gestor") && <div className="grid grid-cols-1 gap-3">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="animate-spin text-[#4E593F]" size={32} />
            <p className="text-sm font-medium text-slate-500">Carregando...</p>
          </div>
        ) : filteredUsers.length > 0 ? (
          filteredUsers.map((user) => (
            <div
              key={user.id}
              onClick={() => setSelectedUser(user)}
              className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between group active:scale-[0.98] transition-all cursor-pointer"
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
            <p className="text-sm text-slate-500">Nenhum {activeType === 'professor' ? 'terapeuta' : 'gestor'} encontrado.</p>
          </div>
        )}
      </div>}

      {/* Detalhe do usuário */}
      <ActionSheet
        isOpen={!!selectedUser}
        onClose={() => setSelectedUser(null)}
        title={selectedUser?.full_name || "Usuário"}
        subtitle={selectedUser?.role === 'professor' ? 'Terapeuta' : 'Gestor'}
      >
        {selectedUser && (
          <div className="space-y-4 py-2">
            <div className="flex flex-col items-center gap-3 pb-4 border-b border-slate-100">
              <AvatarWithFallback
                src={selectedUser.avatar_url}
                alt={selectedUser.full_name || ""}
                className="w-20 h-20 rounded-full border-2 border-slate-100"
                type="user"
              />
              <div className="text-center">
                <p className="font-bold text-slate-900 text-lg">{selectedUser.full_name}</p>
                <p className="text-xs font-bold text-slate-400 uppercase mt-0.5">{selectedUser.role === 'professor' ? 'Terapeuta' : 'Gestor'}</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">E-mail</label>
                <div className="w-full h-12 px-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center">
                  <p className="text-sm font-medium text-slate-700">{selectedUser.email || "Não informado"}</p>
                </div>
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedUser(null);
                handleDeleteUser(selectedUser.id, selectedUser.full_name || "");
              }}
              className="w-full h-12 rounded-full border-2 border-red-100 text-red-500 font-bold text-sm hover:bg-red-50 transition-colors mt-2"
            >
              Remover Acesso
            </button>
          </div>
        )}
      </ActionSheet>

      {/* Editar Responsável aprovado */}
      <ActionSheet
        isOpen={!!selectedResp}
        onClose={() => setSelectedResp(null)}
        title="Editar Responsável"
        subtitle={selectedResp?.email}
        footer={
          <button
            type="button"
            disabled={updateResp.isPending}
            onClick={async () => {
              try {
                await updateResp.mutateAsync({ id: selectedResp.id, ...respForm });
                toast({ title: "Sucesso", description: "Responsável atualizado!" });
                setSelectedResp(null);
              } catch (e: any) {
                toast({ variant: "destructive", title: "Erro", description: e.message });
              }
            }}
            className="w-full h-14 bg-[#4E593F] hover:bg-[#3E4732] text-white rounded-full font-bold text-lg shadow-lg shadow-[#4E593F]/20 flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-70"
          >
            {updateResp.isPending ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check size={20} strokeWidth={2.5} />}
            {updateResp.isPending ? "Salvando..." : "Salvar Alterações"}
          </button>
        }
      >
        {selectedResp && (
          <div className="space-y-4">
            {[
              { label: "Nome Completo", key: "nome" },
              { label: "Telefone", key: "telefone" },
              { label: "CPF", key: "cpf" },
              { label: "RG", key: "rg" },
              { label: "Endereço", key: "endereco" },
              { label: "Cidade", key: "cidade" },
              { label: "Estado", key: "estado" },
            ].map(({ label, key }) => (
              <div key={key} className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700 ml-1">{label}</label>
                <input
                  value={(respForm as any)[key]}
                  onChange={(e) => setRespForm({ ...respForm, [key]: e.target.value })}
                  className="w-full h-14 px-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 text-base font-medium focus:ring-2 focus:ring-[#4E593F] focus:border-[#4E593F] outline-none transition-all shadow-sm focus:bg-white"
                />
              </div>
            ))}
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700 ml-1">E-mail</label>
              <input
                readOnly
                value={selectedResp.email || ""}
                className="w-full h-14 px-4 rounded-2xl bg-slate-100 border border-slate-100 text-slate-500 text-base font-medium outline-none"
              />
            </div>
            <div className="h-32 shrink-0 lg:h-12" />
          </div>
        )}
      </ActionSheet>

      <ActionSheet
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title={formType === 'professor' ? "Novo Terapeuta" : "Novo Gestor"}
        subtitle="Acesso imediato com senha temporária"
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

          <div className="bg-amber-50 p-4 rounded-2xl mt-4 border border-amber-100">
            <div className="flex gap-3 items-start">
              <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <ShieldCheck size={18} className="text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-amber-900">Senha Temporária</p>
                <p className="text-[11px] text-amber-700 leading-tight mt-0.5">
                  Compartilhe com o usuário. No primeiro acesso ele criará uma senha própria.
                </p>
                <div className="flex items-center gap-2 mt-3">
                  <code className="flex-1 text-sm font-bold text-amber-900 bg-white border border-amber-200 rounded-xl px-3 py-2 tracking-wide">
                    {TEMP_PASSWORD}
                  </code>
                  <button
                    type="button"
                    onClick={handleCopyPassword}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-200 hover:bg-amber-300 text-amber-900 text-xs font-bold transition-colors shrink-0"
                  >
                    {copiedPassword ? <Check size={14} /> : <Copy size={14} />}
                    {copiedPassword ? "Copiado!" : "Copiar"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <Button 
            disabled={submitting}
            className="w-full h-12 rounded-full bg-[#4E593F] hover:bg-[#3E4732] text-white font-bold mt-4 shadow-lg shadow-[#4E593F]/20"
          >
            {submitting ? "Processando..." : `Convidar ${formType === 'professor' ? "Terapeuta" : "Gestor"}`}
          </Button>
        </form>
      </ActionSheet>
    </div>
  );
};
