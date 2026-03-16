import { useState, useRef, useEffect } from "react";
import { useResponsavelAlunos } from "@/hooks/useResponsavelAlunos";
import { useAlunos } from "@/hooks/useAlunos";
import { 
  Users, 
  Camera, 
  Upload, 
  Loader2, 
  Calendar, 
  Fingerprint, 
  Info, 
  CheckCircle2, 
  ChevronRight, 
  Mail, 
  Plus,
  Trash2,
  UserCog,
  UserPlus,
  Phone
} from "lucide-react";
import { AvatarWithFallback } from "@/components/ui/AvatarWithFallback";
import { CameraCaptureModal } from "@/components/CameraCaptureModal";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/use-toast";
import { ActionSheet } from "../ui/ActionSheet";
import { useAlunosResponsaveis } from "@/hooks/useAlunosResponsaveis";
import { ConsentModal } from "@/components/pais/ConsentModal";

export const PaisAlunoPerfil = () => {
  const { data: vinculos, isLoading: loadingVinculos, refetch: refetchVinculos } = useResponsavelAlunos();
  const { updateAluno } = useAlunos();
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUserEmail(session?.user?.email ?? null);
    });
  }, []);
  const [selectedAlunoId, setSelectedAlunoId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isStudentSelectorOpen, setIsStudentSelectorOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({ nome: "", idade: "", diagnostico: "" });
  const { toast } = useToast();

  const {
    responsaveis,
    linkResponsavel,
    unlinkResponsavel,
    isLoading: loadingResponsaveis
  } = useAlunosResponsaveis(selectedAlunoId);

  const [showAddResp, setShowAddResp] = useState(false);
  const [respForm, setRespForm] = useState({ 
    email: "", 
    nome: "", 
    parentesco: "Pai",
    rg: "",
    cpf: "",
    endereco: "",
    cidade: "",
    estado: ""
  });
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isConsentModalOpen, setIsConsentModalOpen] = useState(false);
  const [registerForm, setRegisterForm] = useState({ 
    nome: "", 
    idade: "", 
    diagnostico: "", 
    contato_emergencia: "", 
    patrocinador: "",
    parentesco: "Pai",
    autoriza_imagem: false
  });

  const alunos = vinculos?.map((v: any) => v.alunos).filter(Boolean) || [];
  
  const currentAluno = alunos.find((a: any) => a.id === selectedAlunoId) || (alunos.length > 0 ? alunos[0] : null);

  useEffect(() => {
    if (alunos.length > 0 && !selectedAlunoId) {
      setSelectedAlunoId(alunos[0].id);
    }
    if (currentAluno) {
      setEditForm({
        nome: currentAluno.nome || "",
        idade: currentAluno.idade?.toString() || "",
        diagnostico: currentAluno.diagnostico || ""
      });
    }
    const handleFABClick = () => {
      setIsRegisterModalOpen(true);
    };
    const handleConsentUpdated = () => {
      refetchVinculos();
    };

    window.addEventListener('fab-click-local', handleFABClick);
    window.addEventListener('consent-updated', handleConsentUpdated);

    return () => {
      window.removeEventListener('fab-click-local', handleFABClick);
      window.removeEventListener('consent-updated', handleConsentUpdated);
    };
  }, [alunos, selectedAlunoId, currentAluno]);

  const handleUpload = async (fileOrBlob: File | Blob, extension = "jpg") => {
    if (!currentAluno) return;

    try {
      setIsUploading(true);
      const filePath = `alunos/${currentAluno.id}/${Date.now()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, fileOrBlob, {
          upsert: true,
          contentType: fileOrBlob instanceof File ? fileOrBlob.type : `image/${extension}`,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      await updateAluno.mutateAsync({
        id: currentAluno.id,
        avatar_url: publicUrl,
      });

      toast({
        title: "Foto atualizada",
        description: `A foto de ${currentAluno.nome} foi atualizada com sucesso.`,
      });

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

  const handleAddResponsavel = async () => {
    const emailTrimmed = respForm.email.trim().toLowerCase();
    const nomeTrimmed = respForm.nome.trim();

    if (!emailTrimmed || !nomeTrimmed) {
      toast({ variant: "destructive", title: "Erro", description: "Preencha o nome e email do responsável." });
      return;
    }

    try {
      await linkResponsavel.mutateAsync({ ...respForm, email: emailTrimmed, nome: nomeTrimmed });
      setShowAddResp(false);
      setRespForm({ 
        email: "", 
        nome: "", 
        parentesco: "Pai",
        rg: "",
        cpf: "",
        endereco: "",
        cidade: "",
        estado: ""
      });
      toast({ title: "Sucesso", description: "Responsável vinculado!" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Erro", description: err.message });
    }
  };

  const handleRemoveResponsavel = async (id: string) => {
    try {
      await unlinkResponsavel.mutateAsync(id);
      toast({ title: "Removido", description: "Vínculo removido." });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Erro", description: err.message });
    }
  };

  const handleUpdateProfile = async () => {
    if (!currentAluno) return;
    try {
      await updateAluno.mutateAsync({
        id: currentAluno.id,
        nome: editForm.nome,
        idade: parseInt(editForm.idade) || null,
        diagnostico: editForm.diagnostico,
      });
      setIsEditModalOpen(false);
      toast({ title: "Sucesso", description: "Perfil atualizado!" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Erro", description: err.message });
    }
  };

  const handleRegisterStudent = async () => {
    if (!registerForm.nome) {
      toast({ variant: "destructive", title: "Erro", description: "Nome é obrigatório" });
      return;
    }

    try {
      // 1. Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // 2. Get or create responsible record for this user
      let { data: resp } = await supabase
        .from("responsaveis")
        .select("id")
        .eq("email", user.email || "")
        .maybeSingle();

      let respId = resp?.id;

      if (!respId) {
        const { data: newResp, error: createRespError } = await supabase
          .from("responsaveis")
          .insert({ 
            nome: user.user_metadata?.full_name || user.email?.split('@')[0] || "Responsável",
            email: user.email 
          })
          .select("id")
          .single();
        
        if (createRespError) throw createRespError;
        respId = newResp.id;
      }

      // 3. Create student
      const { data: aluno, error: createAlunoError } = await supabase
        .from("alunos")
        .insert({
          nome: registerForm.nome,
          idade: parseInt(registerForm.idade) || null,
          diagnostico: registerForm.diagnostico,
          contato_emergencia: registerForm.contato_emergencia,
          patrocinador: registerForm.patrocinador,
          lgpd_assinado: true, // Assuming consent if they are self-registering
          autoriza_imagem: registerForm.autoriza_imagem,
          data_autorizacao_imagem: registerForm.autoriza_imagem ? new Date().toISOString() : null,
          ativo: true,
          arquivado: false
        })
        .select()
        .single();

      if (createAlunoError) throw createAlunoError;

      // 4. Link them
      const { error: linkError } = await supabase
        .from("aluno_responsavel")
        .insert({
          aluno_id: aluno.id,
          responsavel_id: respId,
          parentesco: registerForm.parentesco
        });

      if (linkError) throw linkError;

      setIsRegisterModalOpen(false);
      toast({ title: "Bem-vindo!", description: "Aluno cadastrado com sucesso!" });
      window.location.reload(); // Hard refresh to update everything
    } catch (err: any) {
      toast({ variant: "destructive", title: "Erro ao cadastrar", description: err.message });
    }
  };

  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
  };

  if (loadingVinculos) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Carregando Informações...</p>
      </div>
    );
  }

  if (alunos.length === 0) {
    return (
      <div className="py-20 text-center px-10 animate-fade-in">
        <div className="w-24 h-24 bg-primary/5 rounded-[40px] flex items-center justify-center mx-auto mb-8 border-2 border-primary/10 relative">
          <Users className="w-10 h-10 text-primary" />
          <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-primary rounded-full flex items-center justify-center border-4 border-white">
            <Plus size={14} className="text-white" strokeWidth={3} />
          </div>
        </div>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Comece aqui</h2>
        <p className="text-slate-500 font-medium mt-3 leading-relaxed max-w-[280px] mx-auto text-sm">
          Você ainda não possui alunos vinculados. Cadastre seu primeiro dependente para começar o acompanhamento.
        </p>
        
        <button
          onClick={() => {
            setRegisterForm({ ...registerForm, nome: "", idade: "", diagnostico: "", contato_emergencia: "", patrocinador: "" });
            setIsRegisterModalOpen(true);
          }}
          className="mt-10 w-full max-w-[280px] h-14 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/20 active:scale-95 transition-all flex items-center justify-center gap-3"
        >
          <UserPlus size={18} />
          Cadastrar Aluno
        </button>

        {/* Reuse the Registration ActionSheet here too if needed, but it's defined below */}
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in pb-28">
      {/* Header with Selector if multiple students */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Perfil do Aluno</h1>
          <p className="text-sm text-slate-500 font-bold uppercase tracking-widest mt-1">Dados e Identificação</p>
        </div>
        <div className="flex gap-2">
          {alunos.length > 1 && (
            <button 
              onClick={() => setIsStudentSelectorOpen(true)}
              className="px-4 py-2 bg-white rounded-2xl card-shadow border border-slate-100 flex items-center gap-2 active:scale-95 transition-all"
            >
              <span className="text-[10px] font-black uppercase text-primary">Trocar</span>
              <ChevronRight size={14} className="text-primary" />
            </button>
          )}
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="px-4 py-2 bg-primary text-white rounded-2xl shadow-lg shadow-primary/20 flex items-center gap-2 active:scale-95 transition-all text-[10px] font-black uppercase tracking-widest"
          >
            <UserCog size={14} />
            <span>Editar</span>
          </button>
        </div>
      </div>

      {currentAluno && (
        <div className="space-y-6">
          {/* Student Profile Card */}
          <div className="bg-white rounded-[40px] card-shadow p-8 flex flex-col items-center border-2 border-white">
            <div className="relative group">
              <div className="relative w-32 h-32 rounded-[48px] overflow-hidden border-4 border-slate-50 shadow-xl ring-8 ring-primary/5">
                <AvatarWithFallback
                  type="user"
                  src={currentAluno.avatar_url}
                  className="w-full h-full object-cover scale-110"
                />
                {isUploading && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[2px]">
                    <Loader2 className="w-8 h-8 text-white animate-spin" />
                  </div>
                )}
              </div>
              
              <div className="absolute -bottom-2 -right-2 flex gap-1.5">
                <button
                  onClick={() => setIsCameraOpen(true)}
                  disabled={isUploading}
                  className="w-10 h-10 rounded-2xl bg-primary text-white flex items-center justify-center shadow-lg active:scale-90 transition-all border-2 border-white"
                >
                  <Camera size={18} strokeWidth={2.5} />
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-lg active:scale-90 transition-all border-2 border-white"
                >
                  <Upload size={18} strokeWidth={2.5} />
                </button>
              </div>
            </div>

            <div className="mt-8 text-center">
              <div className="flex items-center justify-center gap-2">
                <h2 className="text-2xl font-black text-slate-900 leading-none">{currentAluno.nome}</h2>
              </div>
              <div className="flex items-center justify-center gap-2 mt-3">
                {currentAluno.lgpd_assinado ? (
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-[#F1F3EF] text-[#4E593F] rounded-full border border-[#8C9A7A]/30">
                    <CheckCircle2 size={12} strokeWidth={3} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Termos Assinados</span>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsConsentModalOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1 bg-rose-50 text-rose-600 rounded-full border border-rose-100 active:scale-95 transition-all"
                  >
                    <Info size={12} strokeWidth={3} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Termos Pendentes — Toque para assinar</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-1 gap-4">
            <div className="bg-white rounded-[32px] p-6 card-shadow flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#F1F3EF] flex items-center justify-center shrink-0">
                <Calendar className="text-[#4E593F]" size={20} strokeWidth={2.5} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">Idade</p>
                <p className="text-base font-black text-slate-900 mt-1">{currentAluno.idade || "---"} anos</p>
              </div>
            </div>

            <div className="bg-white rounded-[32px] p-6 card-shadow flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center shrink-0">
                <Fingerprint className="text-white" size={20} strokeWidth={2.5} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">Diagnóstico Principal</p>
                <p className="text-base font-black text-slate-900 mt-1 leading-tight">
                  {currentAluno.diagnostico || "Não informado"}
                </p>
              </div>
            </div>
          </div>

          <p className="text-[10px] text-center text-slate-400 font-medium px-8 leading-relaxed mb-4">
            Algumas informações são sincronizadas diretamente com a gestão. 
            Clique no botão Editar no topo para ajustar os dados básicos.
          </p>

          {/* Responsaveis Section */}
          <div className="pt-8 border-t border-slate-100 space-y-6">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <Users size={18} className="text-primary" />
                <h3 className="text-lg font-black text-slate-900 tracking-tight">Responsáveis</h3>
              </div>
              {!showAddResp && (
                <button
                  type="button"
                  onClick={() => setShowAddResp(true)}
                  className="bg-primary hover:bg-primary/90 text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl active:scale-95 transition-all shadow-md shadow-primary/20"
                >
                  + Adicionar
                </button>
              )}
            </div>

            {showAddResp && (
              <div className="p-6 rounded-[32px] bg-slate-50 border-2 border-slate-100 space-y-4 animate-in fade-in slide-in-from-top-4">
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Nome Completo</label>
                    <input
                      placeholder="Nome do responsável"
                      value={respForm.nome}
                      onChange={(e) => setRespForm({ ...respForm, nome: e.target.value })}
                      className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Email</label>
                      <input
                        placeholder="email@exemplo.com"
                        value={respForm.email}
                        onChange={(e) => setRespForm({ ...respForm, email: e.target.value })}
                        className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Parentesco</label>
                      <select
                        value={respForm.parentesco}
                        onChange={(e) => setRespForm({ ...respForm, parentesco: e.target.value })}
                        className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-sm"
                      >
                        <option value="Pai">Pai</option>
                        <option value="Mãe">Mãe</option>
                        <option value="Tutor">Tutor</option>
                        <option value="Outros">Outros</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">RG</label>
                      <input
                        placeholder="00.000.000-0"
                        value={respForm.rg}
                        onChange={(e) => setRespForm({ ...respForm, rg: e.target.value })}
                        className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">CPF</label>
                      <input
                        placeholder="000.000.000-00"
                        value={respForm.cpf}
                        onChange={(e) => setRespForm({ ...respForm, cpf: e.target.value })}
                        className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-sm"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Endereço Completo</label>
                    <input
                      placeholder="Rua, número, bairro..."
                      value={respForm.endereco}
                      onChange={(e) => setRespForm({ ...respForm, endereco: e.target.value })}
                      className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Cidade</label>
                      <input
                        placeholder="Cidade"
                        value={respForm.cidade}
                        onChange={(e) => setRespForm({ ...respForm, cidade: e.target.value })}
                        className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Estado</label>
                      <input
                        placeholder="UF"
                        value={respForm.estado}
                        onChange={(e) => setRespForm({ ...respForm, estado: e.target.value })}
                        className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-sm"
                        maxLength={2}
                      />
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleAddResponsavel}
                    disabled={linkResponsavel.isPending}
                    className="flex-1 h-12 bg-primary text-white rounded-2xl font-bold text-xs uppercase shadow-lg shadow-primary/20 active:scale-95 transition-all"
                  >
                    {linkResponsavel.isPending ? "Salvando..." : "Vincular"}
                  </button>
                  <button
                    onClick={() => setShowAddResp(false)}
                    className="px-6 h-12 bg-slate-100 text-slate-500 rounded-2xl font-bold text-xs uppercase active:scale-95 transition-all"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {loadingResponsaveis ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-6 h-6 text-primary animate-spin opacity-20" />
                </div>
              ) : responsaveis.length === 0 ? (
                <div className="text-center py-10 bg-slate-50 border-2 border-dashed border-slate-100 rounded-[32px]">
                   <Users className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                   <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Nenhum responsável extra</p>
                </div>
              ) : (
                responsaveis.map((resp: any) => (
                  <div key={resp.id} className="flex items-center justify-between p-5 rounded-[32px] bg-white border border-slate-50 card-shadow transition-all group">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center">
                        <Mail size={16} className="text-slate-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-black text-slate-900">{resp.nome}</p>
                          <span className="text-[9px] font-black uppercase tracking-tighter bg-primary/10 text-primary px-2 py-0.5 rounded-full">{resp.parentesco}</span>
                        </div>
                        <p className="text-xs font-medium text-slate-400">{resp.email}</p>
                      </div>
                    </div>
                    {resp.email !== currentUserEmail && (
                      <button
                        type="button"
                        onClick={() => handleRemoveResponsavel(resp.id)}
                        className="w-10 h-10 flex items-center justify-center text-rose-100 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all active:scale-90"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Hidden inputs & Modals */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={onFileSelect}
        accept="image/*"
        className="hidden"
      />

      <CameraCaptureModal
        open={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={(blob) => handleUpload(blob)}
      />

      <ActionSheet
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Editar Perfil"
        subtitle={`Atualizando informações de ${currentAluno?.nome}`}
        footer={
          <button
            onClick={handleUpdateProfile}
            disabled={updateAluno.isPending}
            className="w-full h-14 bg-primary text-white rounded-full font-black text-lg shadow-lg active:scale-95 transition-all disabled:opacity-50"
          >
            {updateAluno.isPending ? "Salvando..." : "Salvar Alterações"}
          </button>
        }
      >
        <div className="space-y-5 py-2">
          <div className="space-y-1.5">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest ml-1">Nome Completo</p>
            <input
              value={editForm.nome}
              onChange={(e) => setEditForm({ ...editForm, nome: e.target.value })}
              className="w-full h-14 px-4 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-primary outline-none transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest ml-1">Idade</p>
            <input
              type="number"
              value={editForm.idade}
              onChange={(e) => setEditForm({ ...editForm, idade: e.target.value })}
              className="w-full h-14 px-4 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-primary outline-none transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest ml-1">Diagnóstico</p>
            <textarea
              value={editForm.diagnostico}
              onChange={(e) => setEditForm({ ...editForm, diagnostico: e.target.value })}
              className="w-full h-32 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-primary outline-none transition-all resize-none"
            />
          </div>
        </div>
      </ActionSheet>

      <ActionSheet
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        title="Cadastrar Aluno"
        subtitle="Preencha os dados do praticante"
        footer={
          <button
            onClick={handleRegisterStudent}
            className="w-full h-14 bg-primary text-white rounded-full font-black text-lg shadow-lg active:scale-95 transition-all"
          >
            Finalizar Cadastro
          </button>
        }
      >
        <div className="space-y-5 py-4 scrollbar-hide max-h-[60vh] overflow-y-auto px-1">
          <div className="space-y-1.5">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest ml-1">Nome Completo</p>
            <input
              placeholder="Ex: Leonardo Melo"
              value={registerForm.nome}
              onChange={(e) => setRegisterForm({ ...registerForm, nome: e.target.value })}
              className="w-full h-14 px-4 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-primary outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest ml-1">Idade</p>
              <input
                type="number"
                placeholder="Ex: 12"
                value={registerForm.idade}
                onChange={(e) => setRegisterForm({ ...registerForm, idade: e.target.value })}
                className="w-full h-14 px-4 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-primary outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest ml-1">Parentesco</p>
              <select
                value={registerForm.parentesco}
                onChange={(e) => setRegisterForm({ ...registerForm, parentesco: e.target.value })}
                className="w-full h-14 px-4 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-primary outline-none"
              >
                <option>Pai</option>
                <option>Mãe</option>
                <option>Tutor</option>
                <option>Avô/Avó</option>
                <option>Outros</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest ml-1">Contato de Emergência</p>
            <div className="relative">
              <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                placeholder="(00) 00000-0000"
                value={registerForm.contato_emergencia}
                onChange={(e) => setRegisterForm({ ...registerForm, contato_emergencia: e.target.value })}
                className="w-full h-14 pl-12 pr-4 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-primary outline-none"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest ml-1">Diagnóstico Principal</p>
            <textarea
              placeholder="Descreva o diagnóstico..."
              value={registerForm.diagnostico}
              onChange={(e) => setRegisterForm({ ...registerForm, diagnostico: e.target.value })}
              className="w-full h-24 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-primary outline-none resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest ml-1">Patrocinador (Opcional)</p>
            <input
              placeholder="Nome da empresa ou pessoa"
              value={registerForm.patrocinador}
              onChange={(e) => setRegisterForm({ ...registerForm, patrocinador: e.target.value })}
              className="w-full h-14 px-4 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-primary outline-none"
            />
          </div>

          <label className="flex items-center gap-3 p-4 rounded-2xl bg-white border border-slate-200 transition-all shadow-sm cursor-pointer active:scale-[0.98] hover:border-primary/30">
            <input
              type="checkbox"
              checked={registerForm.autoriza_imagem}
              onChange={(e) => setRegisterForm({ ...registerForm, autoriza_imagem: e.target.checked })}
              className="w-5 h-5 rounded border-slate-300 text-primary focus:ring-primary accent-primary"
            />
            <div className="flex-1">
              <p className="text-sm font-bold text-slate-800 leading-none">Autorizar Uso de Imagem</p>
              <p className="text-[10px] text-slate-400 font-medium mt-1 uppercase tracking-tight">Para finalidade de divulgação das atividades</p>
            </div>
          </label>
        </div>
      </ActionSheet>

      <ConsentModal
        isOpen={isConsentModalOpen}
        onClose={() => setIsConsentModalOpen(false)}
      />

      <ActionSheet
        isOpen={isStudentSelectorOpen}
        onClose={() => setIsStudentSelectorOpen(false)}
        title="Selecionar Aluno"
        subtitle="Escolha o perfil que deseja visualizar"
        footer={
          <button
            onClick={() => {
              setIsStudentSelectorOpen(false);
              setIsRegisterModalOpen(true);
            }}
            className="w-full h-14 bg-slate-900 text-white rounded-full font-black text-xs uppercase tracking-widest shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all"
          >
            <UserPlus size={16} />
            Cadastrar Novo Aluno
          </button>
        }
      >
        <div className="flex flex-col gap-3 py-2">
          {alunos.map((aluno: any) => (
            <button
              key={aluno.id}
              onClick={() => {
                setSelectedAlunoId(aluno.id);
                setIsStudentSelectorOpen(false);
              }}
              className={`w-full flex items-center gap-4 p-4 rounded-[24px] transition-all active:scale-[0.98] border-2 ${
                selectedAlunoId === aluno.id 
                  ? 'bg-primary/5 border-primary/20 ring-1 ring-primary/10' 
                  : 'bg-slate-50 border-transparent'
              }`}
            >
              <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-white shadow-sm shrink-0">
                <AvatarWithFallback type="user" src={aluno.avatar_url} />
              </div>
              <div className="flex-1 text-left">
                <p className={`font-black text-base tracking-tight ${selectedAlunoId === aluno.id ? 'text-primary' : 'text-slate-900'}`}>
                  {aluno.nome}
                </p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Ver informações completas
                </p>
              </div>
              {selectedAlunoId === aluno.id && <CheckCircle2 size={20} className="text-primary" strokeWidth={3} />}
            </button>
          ))}
        </div>
      </ActionSheet>
    </div>
  );
};
