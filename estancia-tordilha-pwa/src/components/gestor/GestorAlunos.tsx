import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, ChevronRight, Check, Shield, ShieldOff, UserPlus, GraduationCap, Pencil, UserCheck } from "lucide-react";
import { ActionSheet } from "../ui/ActionSheet";
import { ImageUploadField } from "@/components/ui/ImageUploadField";
import { useAlunos } from "@/hooks/useAlunos";
import { useToast } from "@/components/ui/use-toast";
import { AvatarWithFallback } from "@/components/ui/AvatarWithFallback";
import { SwipeableCard } from "@/components/ui/SwipeableCard";
import { ConfirmDeleteModal } from "@/components/ui/ConfirmDeleteModal";
import { useProfessores } from "@/hooks/useProfessores";
import { useAlunosResponsaveis } from "@/hooks/useAlunosResponsaveis";
import { supabase } from "@/lib/supabase";

export const GestorAlunos = () => {
  const { alunos, isLoading, error, createAluno, updateAluno, deleteAluno } = useAlunos();
  const { professores } = useProfessores();
  const { toast } = useToast();
  const queryClient = useQueryClient();
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

  // Responsável editing
  const [selectedResponsavel, setSelectedResponsavel] = useState<any>(null);
  const [showEditResponsavel, setShowEditResponsavel] = useState(false);
  const [responsavelForm, setResponsavelForm] = useState({ nome: "", telefone: "", cpf: "", endereco: "", cidade: "", estado: "" });
  const { responsaveis: alunoResponsaveis } = useAlunosResponsaveis(selectedAluno?.id ?? null);

  const updateResponsavel = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const { error } = await supabase.from("responsaveis").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aluno-responsaveis", selectedAluno?.id] });
      toast({ title: "Sucesso", description: "Responsável atualizado!" });
      setShowEditResponsavel(false);
    },
  });

  const openEditResponsavel = (resp: any) => {
    setSelectedResponsavel(resp);
    setResponsavelForm({
      nome: resp.nome || "",
      telefone: resp.telefone || "",
      cpf: resp.cpf || "",
      endereco: resp.endereco || "",
      cidade: resp.cidade || "",
      estado: resp.estado || "",
    });
    setShowEditResponsavel(true);
  };

  const handleSaveResponsavel = async () => {
    try {
      await updateResponsavel.mutateAsync({ id: selectedResponsavel.id, ...responsavelForm });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro", description: e.message });
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
          professor_id: form.professor_id || null,
          ativo: form.ativo,
          patrocinador: form.patrocinador || null,
        });
        toast({ title: "Sucesso", description: "Dados do praticante atualizados!" });
      } else {
        await createAluno.mutateAsync({
          ...form,
          idade: form.idade ? Number(form.idade) : null,
          professor_id: form.professor_id || null,
        });
        toast({ title: "Sucesso", description: "Praticante cadastrado com sucesso!" });
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
        <h1 className="text-xl font-extrabold text-foreground">Praticantes</h1>
        <p className="text-sm text-muted-foreground font-medium mt-0.5">{isLoading ? "Carregando..." : `${alunos.length} praticantes cadastrados`}</p>
      </div>

      <div className="relative">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar praticante..."
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
              <p className="text-lg font-bold text-slate-900">Nenhum praticante cadastrado</p>
              <p className="text-sm text-muted-foreground font-medium px-4">Os praticantes são cadastrados pelos seus respectivos responsáveis no aplicativo.</p>
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
        title="Visualizar Praticante"
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
            {createAluno.isPending || updateAluno.isPending ? "Salvando..." : (selectedAluno ? "Salvar Alterações" : "Cadastrar Praticante")}
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
            label="Foto do Praticante"
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
              value={form.patrocinador ?? ""}
              onChange={(e) => setForm({ ...form, patrocinador: e.target.value })}
              placeholder="Não informado"
              className="w-full h-14 px-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 text-base font-medium focus:ring-2 focus:ring-[#4E593F] focus:border-[#4E593F] outline-none transition-all shadow-sm focus:bg-white"
            />
          </div>

          {/* Professor assignment */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 ml-1 flex items-center gap-1.5">
              <GraduationCap size={14} className="text-slate-400" />
              Terapeuta Responsável
            </label>
            {professores.length === 0 ? (
              <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-sm text-slate-400">
                <GraduationCap size={16} />
                <span>Nenhum terapeuta cadastrado ainda.</span>
              </div>
            ) : (
              <select
                value={form.professor_id}
                onChange={(e) => setForm({ ...form, professor_id: e.target.value })}
                className="w-full h-14 px-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 text-base font-medium focus:ring-2 focus:ring-[#4E593F] focus:border-[#4E593F] outline-none transition-all shadow-sm focus:bg-white appearance-none cursor-pointer"
              >
                <option value="">— Nenhum terapeuta —</option>
                {professores.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name || "Terapeuta sem nome"}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Responsáveis vinculados */}
          {selectedAluno && alunoResponsaveis.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 ml-1 flex items-center gap-1.5">
                <UserCheck size={14} className="text-slate-400" />
                Responsável Vinculado
              </label>
              {alunoResponsaveis.map((resp) => (
                <div key={resp.id} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100 shadow-sm">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-slate-800">{resp.nome}</p>
                    <p className="text-xs text-slate-500 truncate">{resp.telefone || resp.email}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => openEditResponsavel(resp)}
                    className="ml-3 p-2 rounded-full hover:bg-slate-200 active:scale-95 transition-all shrink-0"
                  >
                    <Pencil size={16} className="text-slate-500" />
                  </button>
                </div>
              ))}
            </div>
          )}

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
              {form.ativo ? "Praticante Ativo" : "Praticante Inativo"}
            </button>
          )}

          {/* Final Spacer with extra height for mobile safe area */}
          <div className="h-32 shrink-0 lg:h-12" />
        </div>
      </ActionSheet>

      {/* Edit Responsável ActionSheet */}
      <ActionSheet
        isOpen={showEditResponsavel}
        onClose={() => setShowEditResponsavel(false)}
        title="Editar Responsável"
        subtitle={selectedResponsavel?.nome}
        footer={
          <button
            type="button"
            onClick={handleSaveResponsavel}
            disabled={updateResponsavel.isPending}
            className="w-full h-14 bg-[#4E593F] hover:bg-[#3E4732] text-white rounded-full font-bold text-lg shadow-lg shadow-[#4E593F]/20 flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-70"
          >
            {updateResponsavel.isPending ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Check size={20} className="text-white" strokeWidth={2.5} />
            )}
            {updateResponsavel.isPending ? "Salvando..." : "Salvar Alterações"}
          </button>
        }
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-700 ml-1">Nome Completo</label>
            <input
              value={responsavelForm.nome}
              onChange={(e) => setResponsavelForm({ ...responsavelForm, nome: e.target.value })}
              className="w-full h-14 px-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 text-base font-medium focus:ring-2 focus:ring-[#4E593F] focus:border-[#4E593F] outline-none transition-all shadow-sm focus:bg-white"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-700 ml-1">Telefone</label>
            <input
              value={responsavelForm.telefone}
              onChange={(e) => setResponsavelForm({ ...responsavelForm, telefone: e.target.value })}
              className="w-full h-14 px-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 text-base font-medium focus:ring-2 focus:ring-[#4E593F] focus:border-[#4E593F] outline-none transition-all shadow-sm focus:bg-white"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-700 ml-1">CPF</label>
            <input
              value={responsavelForm.cpf}
              onChange={(e) => setResponsavelForm({ ...responsavelForm, cpf: e.target.value })}
              className="w-full h-14 px-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 text-base font-medium focus:ring-2 focus:ring-[#4E593F] focus:border-[#4E593F] outline-none transition-all shadow-sm focus:bg-white"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-700 ml-1">Endereço</label>
            <input
              value={responsavelForm.endereco}
              onChange={(e) => setResponsavelForm({ ...responsavelForm, endereco: e.target.value })}
              className="w-full h-14 px-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 text-base font-medium focus:ring-2 focus:ring-[#4E593F] focus:border-[#4E593F] outline-none transition-all shadow-sm focus:bg-white"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700 ml-1">Cidade</label>
              <input
                value={responsavelForm.cidade}
                onChange={(e) => setResponsavelForm({ ...responsavelForm, cidade: e.target.value })}
                className="w-full h-14 px-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 text-base font-medium focus:ring-2 focus:ring-[#4E593F] focus:border-[#4E593F] outline-none transition-all shadow-sm focus:bg-white"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700 ml-1">Estado</label>
              <input
                value={responsavelForm.estado}
                onChange={(e) => setResponsavelForm({ ...responsavelForm, estado: e.target.value })}
                className="w-full h-14 px-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 text-base font-medium focus:ring-2 focus:ring-[#4E593F] focus:border-[#4E593F] outline-none transition-all shadow-sm focus:bg-white"
              />
            </div>
          </div>
          <div className="h-32 shrink-0 lg:h-12" />
        </div>
      </ActionSheet>

      {/* Confirmation Modal for Soft Delete */}
      <ConfirmDeleteModal
        isOpen={!!deleteTarget}
        title="Remover Praticante?"
        description={`Tem certeza que deseja remover ${deleteTarget?.nome ?? ""}? O histórico de sessões e evoluções será mantido.`}
        confirmLabel="Sim, remover"
        isLoading={deleteAluno.isPending}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div >
  );
};

