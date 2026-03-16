import { useState, useEffect } from "react";
import { Search, ChevronRight, Check, Shield, ShieldOff, UserPlus, GraduationCap, FileText, Mail, Users, UserCog } from "lucide-react";
import { ActionSheet } from "../ui/ActionSheet";
import { ImageUploadField } from "@/components/ui/ImageUploadField";
import { useAlunos } from "@/hooks/useAlunos";
import { useToast } from "@/components/ui/use-toast";
import { AvatarWithFallback } from "@/components/ui/AvatarWithFallback";
import { SwipeableCard } from "@/components/ui/SwipeableCard";
import { ConfirmDeleteModal } from "@/components/ui/ConfirmDeleteModal";
import { useProfessores } from "@/hooks/useProfessores";
import { useAlunosResponsaveis } from "@/hooks/useAlunosResponsaveis";
import { generateImageRightsPDF } from "@/services/pdfService";

export const GestorAlunos = () => {
  const { alunos, isLoading, error, createAluno, updateAluno, deleteAluno } = useAlunos();
  const { professores } = useProfessores();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [selectedAluno, setSelectedAluno] = useState<any>(null);
  const [form, setForm] = useState({ 
    nome: "", 
    idade: "", 
    diagnostico: "", 
    contato_emergencia: "", 
    lgpd_assinado: false, 
    autoriza_imagem: false,
    avatar_url: "", 
    ativo: true, 
    professor_id: "", 
    patrocinador: "" 
  });
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; nome: string } | null>(null);
  const [visibleCount, setVisibleCount] = useState(10);

  // For responsible linking
  const {
    responsaveis,
    linkResponsavel,
  } = useAlunosResponsaveis(selectedAluno?.id || null);

  const [showAddResp, setShowAddResp] = useState(false);
  const [editingResp, setEditingResp] = useState<any>(null);
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

  const openEditResp = (resp: any) => {
    setEditingResp(resp);
    setRespForm({
      email: resp.email || "",
      nome: resp.nome || "",
      parentesco: resp.parentesco || "Pai",
      rg: resp.rg || "",
      cpf: resp.cpf || "",
      endereco: resp.endereco || "",
      cidade: resp.cidade || "",
      estado: resp.estado || ""
    });
    setShowAddResp(true);
  };

  const handleAddResponsavel = async () => {
    if (!respForm.email || !respForm.nome) {
      toast({ variant: "destructive", title: "Erro", description: "Nome e email são obrigatórios" });
      return;
    }

    try {
      await linkResponsavel.mutateAsync({
        email: respForm.email.toLowerCase().trim(),
        nome: respForm.nome.trim(),
        parentesco: respForm.parentesco,
        rg: respForm.rg,
        cpf: respForm.cpf,
        endereco: respForm.endereco,
        cidade: respForm.cidade,
        estado: respForm.estado
      });
      setShowAddResp(false);
      setEditingResp(null);
      setRespForm({ email: "", nome: "", parentesco: "Pai", rg: "", cpf: "", endereco: "", cidade: "", estado: "" });
      toast({ title: "Sucesso", description: editingResp ? "Dados atualizados!" : "Responsável vinculado!" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Erro", description: err.message });
    }
  };

  const handleAddNew = () => {
    setShowForm(true);
    setSelectedAluno(null);
    setForm({ 
      nome: "", 
      idade: "", 
      diagnostico: "", 
      contato_emergencia: "", 
      lgpd_assinado: false, 
      autoriza_imagem: false,
      avatar_url: "", 
      ativo: true, 
      professor_id: "", 
      patrocinador: "" 
    });
  };

  useEffect(() => {
    const handleOpenForm = () => handleAddNew();
    window.addEventListener('open-form-aluno', handleOpenForm);
    return () => window.removeEventListener('open-form-aluno', handleOpenForm);
  }, []);

  const filtered = alunos.filter((a) => a.nome.toLowerCase().includes(search.toLowerCase()));
  const displayedAlunos = filtered.slice(0, visibleCount);

  // Reset pagination when searching
  useEffect(() => {
    setVisibleCount(10);
  }, [search]);

  const handleSave = async () => {
    if (!form.nome.trim()) {
      toast({ variant: "destructive", title: "Campo obrigatório", description: "Preencha o nome do aluno." });
      return;
    }

    try {
      if (selectedAluno) {
        await updateAluno.mutateAsync({
          id: selectedAluno.id,
          ...form,
          idade: form.idade ? Number(form.idade) : null,
          professor_id: form.professor_id || null,
        });
        toast({ title: "Sucesso", description: "Dados do aluno atualizados!" });
      } else {
        await createAluno.mutateAsync({
          ...form,
          idade: form.idade ? Number(form.idade) : null,
          professor_id: form.professor_id || null,
        });
        toast({ title: "Sucesso", description: "Aluno cadastrado com sucesso!" });
      }
      setShowForm(false);
      setSelectedAluno(null);
      setForm({ 
        nome: "", 
        idade: "", 
        diagnostico: "", 
        contato_emergencia: "", 
        lgpd_assinado: false, 
        autoriza_imagem: false,
        avatar_url: "", 
        ativo: true, 
        professor_id: "", 
        patrocinador: "" 
      });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro ao salvar", description: error.message });
    }
  };

  const openEdit = (aluno: any) => {
    setSelectedAluno(aluno);
    setForm({
      nome: aluno.nome,
      idade: aluno.idade ? String(aluno.idade) : "",
      diagnostico: aluno.diagnostico || "",
      contato_emergencia: aluno.contato_emergencia || "",
      lgpd_assinado: !!aluno.lgpd_assinado,
      autoriza_imagem: !!aluno.autoriza_imagem,
      avatar_url: aluno.avatar_url || "",
      ativo: aluno.ativo !== false,
      professor_id: aluno.professor_id || "",
      patrocinador: aluno.patrocinador || "",
    });
    setShowForm(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteAluno.mutateAsync(deleteTarget.id);
      toast({ title: "Removido", description: `${deleteTarget.nome} foi arquivado.` });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro ao remover", description: e.message });
    } finally {
      setDeleteTarget(null);
    }
  };


  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-xl font-extrabold text-foreground">Alunos</h1>
        <p className="text-sm text-muted-foreground font-medium mt-0.5">{isLoading ? "Carregando..." : `${alunos.length} alunos cadastrados`}</p>
      </div>

      <div className="relative">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar aluno..."
          className="w-full pl-11 pr-4 py-4 rounded-2xl bg-card card-shadow text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 border-0"
        />
      </div>

      <div className="space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="w-full flex items-center gap-4 p-5 bg-card rounded-3xl card-shadow animate-pulse">
                <div className="w-12 h-12 rounded-2xl bg-secondary/10" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-secondary/10 rounded w-1/3" />
                  <div className="h-3 bg-secondary/10 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="p-10 text-center space-y-4">
            <p className="text-muted-foreground font-medium">Ops! Erro ao carregar alunos.</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-full font-bold text-sm"
            >
              Tentar novamente
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center bg-card rounded-[32px] card-shadow space-y-5 border-2 border-dashed border-slate-100">
            <div className="w-20 h-20 bg-primary/5 rounded-full flex items-center justify-center mx-auto">
              <UserPlus size={40} className="text-primary/30" />
            </div>
            <div className="space-y-2">
              <p className="text-lg font-bold text-slate-900">Nenhum aluno cadastrado</p>
              <p className="text-sm text-muted-foreground font-medium px-4">Os alunos são cadastrados pelos seus respectivos responsáveis no aplicativo.</p>
            </div>
          </div>
        ) : (
          displayedAlunos.map((aluno) => {
            const isInativo = aluno.ativo === false;

            /** The card content — shared between both branches */
            const cardContent = (isOpen: boolean) => (
              <button
                type="button"
                onClick={() => openEdit(aluno)}
                className={`w-full flex items-center gap-4 p-5 bg-card rounded-3xl card-shadow text-left transition-all active:scale-[0.98] ${isInativo ? "opacity-40 grayscale-[30%]" : ""}`}
              >
                <AvatarWithFallback
                  src={aluno.avatar_url}
                  className="w-12 h-12 rounded-2xl"
                  type="user"
                />
                <div className="flex-1">
                  <p className="font-bold text-sm text-foreground">{aluno.nome}</p>
                  <p className="text-xs text-muted-foreground font-medium mt-0.5">
                    {aluno.diagnostico || "Sem diagnóstico"} · {aluno.idade || "?"} anos
                  </p>
                  {aluno.professor_id && (() => {
                    const prof = professores.find(p => p.id === aluno.professor_id);
                    return prof ? (
                      <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-semibold">
                        <GraduationCap size={10} />
                        {prof.full_name}
                      </span>
                    ) : null;
                  })()}
                </div>
                {!isInativo && (
                  <div className={`flex items-center gap-2 transition-opacity duration-200 ${isOpen ? "opacity-0 pointer-events-none" : "opacity-100"}`}>
                    {aluno.lgpd_assinado ? <Shield size={16} className="text-primary" /> : <ShieldOff size={16} className="text-destructive" />}
                    <ChevronRight size={18} className="text-muted-foreground" />
                  </div>
                )}
              </button>
            );

            if (isInativo) {
              // Inactive: plain card, no swipe, no delete
              return <div key={aluno.id}>{cardContent(false)}</div>;
            }

            // Active: full swipe-to-delete
            return (
              <SwipeableCard
                key={aluno.id}
                onDelete={() => setDeleteTarget({ id: aluno.id, nome: aluno.nome })}
                deleteLabel="Remover"
              >
                {({ isOpen }) => cardContent(isOpen)}
              </SwipeableCard>
            );
          })
        )}

        {!isLoading && filtered.length > visibleCount && (
          <div className="pt-4 flex justify-center">
            <button
              onClick={() => setVisibleCount(prev => prev + 10)}
              className="px-8 py-3 bg-white border border-slate-100 rounded-2xl card-shadow text-primary font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all"
            >
              Carregar mais 10
            </button>
          </div>
        )}
      </div>

      <ActionSheet
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title="Visualizar Aluno"
        subtitle={`Informações de cadastro de ${selectedAluno?.nome}`}
        footer={
          <button
            type="button"
            onClick={handleSave}
            disabled={createAluno.isPending || updateAluno.isPending}
            className="w-full h-14 bg-[#4E593F] hover:bg-[#3E4732] text-white rounded-full font-bold text-lg shadow-lg shadow-[#4E593F]/20 flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-70"
          >
            {createAluno.isPending || updateAluno.isPending ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Check size={20} className="text-white" strokeWidth={2.5} />
            )}
            {createAluno.isPending || updateAluno.isPending ? "Salvando..." : (selectedAluno ? "Salvar Alterações" : "Cadastrar Aluno")}
          </button>
        }
      >
        <div className="space-y-5">
          <ImageUploadField
            bucket="alunos"
            value={form.avatar_url}
            onChange={(url) => setForm({ ...form, avatar_url: url })}
            defaultFacingMode="user"
            shape="circle"
            label="Foto do Aluno"
            disabled={!!selectedAluno}
          />

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 ml-1 font-bold">Nome Completo</label>
            <input
              readOnly
              value={form.nome}
              className="w-full h-14 px-4 rounded-2xl border text-base font-bold shadow-sm outline-none bg-white border-slate-100 text-slate-800"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 ml-1 font-bold">Idade</label>
              <input
                readOnly
                value={form.idade}
                className="w-full h-14 px-4 rounded-2xl bg-white border border-slate-100 text-slate-800 text-base font-bold shadow-sm outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 ml-1 font-bold">Emergência</label>
              <input
                readOnly
                value={form.contato_emergencia}
                className="w-full h-14 px-4 rounded-2xl bg-white border border-slate-100 text-slate-800 text-base font-bold shadow-sm outline-none"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 ml-1 font-bold">Diagnóstico</label>
            <input
              readOnly
              value={form.diagnostico}
              placeholder="Não informado"
              className="w-full h-14 px-4 rounded-2xl bg-white border border-slate-100 text-slate-800 text-base font-bold shadow-sm outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 ml-1 font-bold">Patrocinador</label>
            <input
              readOnly
              value={form.patrocinador}
              placeholder="Não informado"
              className="w-full h-14 px-4 rounded-2xl bg-white border border-slate-100 text-slate-800 text-base font-bold shadow-sm outline-none"
            />
          </div>

          {/* Professor assignment */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 ml-1 flex items-center gap-1.5">
              <GraduationCap size={14} className="text-slate-400" />
              Professor Responsável
            </label>
            {professores.length === 0 ? (
              <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-sm text-slate-400">
                <GraduationCap size={16} />
                <span>Nenhum professor cadastrado ainda.</span>
              </div>
            ) : (
              <select
                value={form.professor_id}
                onChange={(e) => setForm({ ...form, professor_id: e.target.value })}
                className="w-full h-14 px-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 text-base font-medium focus:ring-2 focus:ring-[#4E593F] focus:border-[#4E593F] outline-none transition-all shadow-sm focus:bg-white appearance-none cursor-pointer"
              >
                <option value="">— Nenhum professor —</option>
                {professores.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name || "Professor sem nome"}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 opacity-60 pointer-events-none">
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-100 shadow-sm">
              {form.lgpd_assinado ? <Check size={18} className="text-primary" /> : <ShieldOff size={18} className="text-slate-400" />}
              <span className="text-sm font-bold text-slate-700">LGPD</span>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-100 shadow-sm">
              {form.autoriza_imagem ? <Check size={18} className="text-primary" /> : <ShieldOff size={18} className="text-slate-400" />}
              <span className="text-sm font-bold text-slate-700">Imagem</span>
            </div>
          </div>

          {/* Responsáveis Section */}
          {selectedAluno && (
            <div className="pt-6 border-t border-slate-100 space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <Users size={16} className="text-primary" />
                    Responsáveis Vinculados
                  </label>
                  {!showAddResp && (
                    <button
                      type="button"
                      onClick={() => setShowAddResp(true)}
                      className="text-[10px] font-black uppercase text-primary bg-primary/5 px-3 py-1.5 rounded-xl border border-primary/10"
                    >
                      + Vincular
                    </button>
                  )}
                </div>

                {showAddResp && (
                  <div className="p-5 rounded-3xl bg-slate-50 border border-slate-200 space-y-4 mb-4 animate-fade-in">
                    <p className="text-xs font-bold text-slate-800 mb-2">{editingResp ? "Editar Dados" : "Novo Vínculo"}</p>
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
                            placeholder="Indaiatuba"
                            value={respForm.cidade}
                            onChange={(e) => setRespForm({ ...respForm, cidade: e.target.value })}
                            className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Estado</label>
                          <input
                            placeholder="SP"
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
                        type="button"
                        onClick={handleAddResponsavel}
                        disabled={linkResponsavel.isPending}
                        className="flex-1 h-12 bg-primary text-white rounded-2xl font-bold text-xs uppercase tracking-widest active:scale-95 transition-all shadow-md shadow-primary/20 disabled:opacity-50"
                      >
                        {linkResponsavel.isPending ? "Salvando..." : "Vincular Responsável"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAddResp(false)}
                        className="px-6 h-12 bg-slate-200 text-slate-600 rounded-2xl font-bold text-xs uppercase"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}


              <div className="space-y-2">
                {responsaveis.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    Nenhum responsável vinculado a este aluno.
                  </p>
                ) : (
                  responsaveis.map((resp: any) => (
                    <div key={resp.id} className="flex items-center justify-between p-3 rounded-2xl bg-white border border-slate-100 shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center">
                          <Mail size={16} className="text-slate-400" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800">{resp.nome} <span className="text-[10px] text-primary bg-primary/5 px-1.5 py-0.5 rounded-full ml-1">{resp.parentesco}</span></p>
                          <p className="text-[11px] text-slate-500">{resp.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          title="Editar Dados"
                          onClick={() => openEditResp(resp)}
                          className="p-2 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-xl transition-colors"
                        >
                          <UserCog size={16} />
                        </button>
                        <button
                          type="button"
                          title="Baixar Termo de Imagem"
                          onClick={() => generateImageRightsPDF({
                            responsibleName: resp.nome,
                            rg: resp.rg || "_________________",
                            cpf: resp.cpf || "_________________",
                            address: resp.endereco || "_________________",
                            city: resp.cidade || "_________________",
                            state: resp.estado || "__",
                            studentNames: selectedAluno.nome,
                            authorized: !!selectedAluno.autoriza_imagem,
                            date: selectedAluno.data_autorizacao_imagem 
                              ? new Date(selectedAluno.data_autorizacao_imagem).toLocaleDateString('pt-BR')
                              : new Date().toLocaleDateString('pt-BR')
                          })}
                          className="p-2 text-primary hover:bg-primary/10 rounded-xl transition-colors"
                        >
                          <FileText size={16} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Ativo/Inativo toggle — only show when editing */}
          {selectedAluno && (
            <button
              type="button"
              onClick={() => setForm({ ...form, ativo: !form.ativo })}
              className={`flex items-center gap-2.5 self-start px-4 py-2 rounded-full border transition-all text-sm font-semibold ${form.ativo
                ? "bg-[#F1F3EF] border-[#8C9A7A] text-[#4E593F]"
                : "bg-slate-100 border-slate-200 text-slate-500"
                }`}
            >
              <span className={`w-2 h-2 rounded-full ${form.ativo ? "bg-[#4E593F]" : "bg-slate-400"}`} />
              {form.ativo ? "Aluno Ativo" : "Aluno Inativo"}
            </button>
          )}

          {/* Final Spacer with extra height for mobile safe area */}
          <div className="h-32 shrink-0 lg:h-12" />
        </div>
      </ActionSheet>

      {/* Confirmation Modal for Soft Delete */}
      <ConfirmDeleteModal
        isOpen={!!deleteTarget}
        title="Remover Aluno?"
        description={`Tem certeza que deseja remover ${deleteTarget?.nome ?? ""}? O histórico de sessões e evoluções será mantido.`}
        confirmLabel="Sim, remover"
        isLoading={deleteAluno.isPending}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div >
  );
};

