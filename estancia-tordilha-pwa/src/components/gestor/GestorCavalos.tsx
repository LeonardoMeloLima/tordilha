import { useState, useEffect } from "react";
import { Check, ChevronRight, HeartPulse, Info, Activity, ShieldAlert, Calendar, Trash2 } from "lucide-react";
import { ActionSheet } from "../ui/ActionSheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCavalos } from "@/hooks/useCavalos";
import { AvatarWithFallback } from "@/components/ui/AvatarWithFallback";
import { ImageUploadField } from "@/components/ui/ImageUploadField";
import { useToast } from "@/components/ui/use-toast";
import { SwipeableCard } from "@/components/ui/SwipeableCard";
import { ConfirmDeleteModal } from "@/components/ui/ConfirmDeleteModal";

export const GestorCavalos = () => {
  const { cavalos, isLoading, error, createCavalo, updateCavalo, deleteCavalo } = useCavalos();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [form, setForm] = useState({
    nome: "",
    raca: "",
    pelagem: "",
    ano_nascimento: "",
    sexo: "Macho" as "Macho" | "Fêmea",
    castrado: true,
    status: "Ativo" as "Ativo" | "Repouso",
    foto_url: "",
    humor: "Dócil",
    altura: "",
    peso: "",
    movimento_3d_predominante: "",
    data_avaliacao: "",
    // Step Assessment (Marcha)
    avaliacao_marcha: {
      qualidade: "Transpista",
      comprimento: "",
      velocidade: "",
      frequencia_10m: "",
      observacao: ""
    },
    // Reactions
    avaliacao_comportamento: {
      animais: "",
      materiais: "",
      montar_descer: "",
      movimento_cavaleiro: "",
      conducao_guia: "",
      manejo: "",
      ambiente_externo: ""
    },
    // Veterinary
    avaliacao_veterinaria: {
      indicacoes: "",
      contra_indicacoes: ""
    },
    comentario: ""
  });
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; nome: string } | null>(null);

  const handleAddNew = () => {
    setShowForm(true);
    setSelected(null);
    setForm({
      nome: "",
      raca: "",
      pelagem: "",
      ano_nascimento: "",
      sexo: "Macho",
      castrado: true,
      status: "Ativo",
      foto_url: "",
      humor: "Dócil",
      altura: "",
      peso: "",
      movimento_3d_predominante: "",
      data_avaliacao: new Date().toISOString().split('T')[0],
      avaliacao_marcha: { qualidade: "Transpista", comprimento: "", velocidade: "", frequencia_10m: "", observacao: "" },
      avaliacao_comportamento: { animais: "", materiais: "", montar_descer: "", movimento_cavaleiro: "", conducao_guia: "", manejo: "", ambiente_externo: "" },
      avaliacao_veterinaria: { indicacoes: "", contra_indicacoes: "" },
      comentario: ""
    });
  };

  useEffect(() => {
    const handleOpenForm = () => handleAddNew();
    window.addEventListener('open-form-cavalo', handleOpenForm);
    return () => window.removeEventListener('open-form-cavalo', handleOpenForm);
  }, []);

  const handleSave = async () => {
    if (!form.nome) return;

    try {
      const payload = {
        ...form,
        ano_nascimento: form.ano_nascimento ? Number(form.ano_nascimento) : null,
        altura: form.altura ? Number(form.altura) : null,
        peso: form.peso ? Number(form.peso) : null,
        data_avaliacao: form.data_avaliacao || null,
      };

      if (selected) {
        await updateCavalo.mutateAsync({ id: selected.id, ...payload });
        toast({ title: "Sucesso", description: "Cavalo atualizado com sucesso!" });
      } else {
        await createCavalo.mutateAsync(payload as any);
        toast({ title: "Sucesso", description: "Cavalo cadastrado com sucesso!" });
      }
      setShowForm(false);
      setSelected(null);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    }
  };

  const openEdit = (c: any) => {
    setSelected(c);
    setForm({
      nome: c.nome,
      raca: c.raca || "",
      pelagem: c.pelagem || c.cor || "",
      ano_nascimento: c.ano_nascimento ? String(c.ano_nascimento) : "",
      sexo: (c.sexo as any) || "Macho",
      castrado: c.castrado !== false,
      status: (c.status as any) || "Ativo",
      foto_url: c.foto_url || "",
      humor: c.humor || "Dócil",
      altura: c.altura ? String(c.altura) : "",
      peso: c.peso ? String(c.peso) : "",
      movimento_3d_predominante: c.movimento_3d_predominante || "",
      data_avaliacao: c.data_avaliacao || "",
      avaliacao_marcha: c.avaliacao_marcha || { qualidade: "Transpista", comprimento: "", velocidade: "", frequencia_10m: "", observacao: "" },
      avaliacao_comportamento: c.avaliacao_comportamento || { animais: "", materiais: "", montar_descer: "", movimento_cavaleiro: "", conducao_guia: "", manejo: "", ambiente_externo: "" },
      avaliacao_veterinaria: c.avaliacao_veterinaria || { indicacoes: "", contra_indicacoes: "" },
      comentario: c.comentario || ""
    });
    setShowForm(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteCavalo.mutateAsync(deleteTarget.id);
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
        <h1 className="text-xl font-extrabold text-foreground">Cavalos</h1>
        <p className="text-sm text-muted-foreground font-medium mt-0.5">{cavalos.length} cavalos cadastrados</p>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="w-full flex items-center gap-4 p-5 bg-card rounded-3xl card-shadow animate-pulse">
                <div className="w-14 h-14 rounded-2xl bg-secondary/10" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-secondary/10 rounded w-1/3" />
                  <div className="h-3 bg-secondary/10 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="p-10 text-center space-y-4">
            <p className="text-muted-foreground font-medium">Ops! Erro ao carregar cavalos.</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-full font-bold text-sm"
            >
              Tentar novamente
            </button>
          </div>
        ) : cavalos.length === 0 ? (
          <div className="p-12 text-center bg-card rounded-[32px] card-shadow space-y-5 border-2 border-dashed border-slate-100">
            <div className="w-20 h-20 bg-primary/5 rounded-full flex items-center justify-center mx-auto">
              <HeartPulse size={40} className="text-primary/30" />
            </div>
            <div className="space-y-2">
              <p className="text-lg font-bold text-slate-900">Nenhum cavalo cadastrado</p>
              <p className="text-sm text-muted-foreground font-medium px-4">Cadastre seus cavalos para organizar as sessões de equoterapia.</p>
            </div>
            <button
              type="button"
              onClick={handleAddNew}
              className="h-12 px-8 bg-[#4E593F] text-white rounded-full font-bold text-sm shadow-md shadow-[#4E593F]/20 active:scale-[0.95] transition-all"
            >
              + Adicionar Primeiro Cavalo
            </button>
          </div>
        ) : (
          cavalos.map((c) => (
            <SwipeableCard
              key={c.id}
              onDelete={() => setDeleteTarget({ id: c.id, nome: c.nome })}
              deleteLabel="Remover"
            >
              {({ isOpen }) => (
                <button type="button" onClick={() => !isOpen && openEdit(c)} className="w-full flex items-center gap-4 p-5 bg-card rounded-3xl card-shadow text-left transition-all active:scale-[0.98]">
                  <AvatarWithFallback
                    src={c.foto_url}
                    className="w-14 h-14 rounded-2xl"
                    type="horse"
                  />
                  <div className="flex-1">
                    <p className="font-bold text-sm text-foreground">{c.nome}</p>
                    <p className="text-xs text-muted-foreground font-medium mt-0.5">{c.raca || "Raça não informada"}</p>
                  </div>
                  <div className={`flex items-center gap-2 transition-opacity duration-200 ${isOpen ? "opacity-0 pointer-events-none" : "opacity-100"}`}>
                    <span className={`px-3 py-1 text-[11px] font-extrabold rounded-full tracking-wide ${c.status === "Ativo" ? "bg-[#4E593F] text-white" : "bg-[#DDE2D6] text-[#3E4732] border border-[#8C9A7A]"}`}>{c.status?.toUpperCase()}</span>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setDeleteTarget({ id: c.id, nome: c.nome }); }}
                      className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-red-50 active:scale-90 transition-all"
                    >
                      <Trash2 size={14} className="text-slate-300 hover:text-red-400 transition-colors" strokeWidth={2} />
                    </button>
                    <ChevronRight size={18} className="text-muted-foreground" />
                  </div>
                </button>
              )}
            </SwipeableCard>
          ))
        )}
      </div>



      {/* New/Edit Cavalo Form (Action Sheet) */}
      <ActionSheet
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title={selected ? "Editar Cavalo" : "Novo Cavalo"}
        subtitle={selected ? `Atualizando dados de ${selected.nome}` : "Preencha as informações do cavalo"}
        footer={
          <button
            type="button"
            onClick={handleSave}
            disabled={createCavalo.isPending || updateCavalo.isPending}
            className="w-full h-14 bg-[#4E593F] hover:bg-[#3E4732] text-white rounded-full font-bold text-lg shadow-lg shadow-[#4E593F]/20 flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-70"
          >
            {createCavalo.isPending || updateCavalo.isPending ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Check size={20} className="text-white" strokeWidth={2.5} />
            )}
            {createCavalo.isPending || updateCavalo.isPending ? "Salvando..." : "Salvar Cavalo"}
          </button>
        }
      >
        <Tabs defaultValue="geral" className="w-full">
          <TabsList className="grid grid-cols-3 mb-6 bg-slate-100 p-1 rounded-2xl">
            <TabsTrigger value="geral" className="rounded-xl flex items-center gap-2 text-xs font-bold">
              <Info size={14} /> Geral
            </TabsTrigger>
            <TabsTrigger value="tecnica" className="rounded-xl flex items-center gap-2 text-xs font-bold">
              <Activity size={14} /> Técnica
            </TabsTrigger>
            <TabsTrigger value="comportamento" className="rounded-xl flex items-center gap-2 text-xs font-bold">
              <ShieldAlert size={14} /> Reações
            </TabsTrigger>
          </TabsList>

          <TabsContent value="geral" className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
            <ImageUploadField
              bucket="cavalos"
              value={form.foto_url}
              onChange={(url) => setForm({ ...form, foto_url: url })}
              defaultFacingMode="environment"
              shape="rounded"
              label="Foto do Cavalo"
            />

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 ml-1">Nome do Cavalo</label>
              <input
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                placeholder="Ex: Votalla"
                className="w-full h-14 px-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 text-base font-medium focus:ring-2 focus:ring-[#4E593F] focus:border-[#4E593F] outline-none transition-all shadow-sm focus:bg-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700 ml-1">Raça</label>
                <input
                  value={form.raca}
                  onChange={(e) => setForm({ ...form, raca: e.target.value })}
                  placeholder="Ex: Quarto de milha"
                  className="w-full h-14 px-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 text-base font-medium focus:ring-2 focus:ring-[#4E593F] focus:border-[#4E593F] outline-none transition-all shadow-sm focus:bg-white"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700 ml-1">Pelagem</label>
                <input
                  value={form.pelagem}
                  onChange={(e) => setForm({ ...form, pelagem: e.target.value })}
                  placeholder="Ex: Castanho"
                  className="w-full h-14 px-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 text-base font-medium focus:ring-2 focus:ring-[#4E593F] focus:border-[#4E593F] outline-none transition-all shadow-sm focus:bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700 ml-1">Nascimento (Ano)</label>
                <input
                  value={form.ano_nascimento}
                  onChange={(e) => setForm({ ...form, ano_nascimento: e.target.value })}
                  placeholder="Ex: 2006"
                  type="number"
                  className="w-full h-14 px-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 text-base font-medium focus:ring-2 focus:ring-[#4E593F] focus:border-[#4E593F] outline-none transition-all shadow-sm focus:bg-white"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700 ml-1">Sexo</label>
                <div className="flex gap-2 h-14">
                  {["Macho", "Fêmea"].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setForm({ ...form, sexo: s as any })}
                      className={`flex-1 rounded-2xl border text-sm font-bold transition-all ${form.sexo === s
                        ? "bg-primary border-primary text-white shadow-sm"
                        : "bg-slate-50 border-slate-200 text-slate-500"
                        }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-sm font-bold text-slate-700">Castrado?</span>
              <button
                type="button"
                onClick={() => setForm({ ...form, castrado: !form.castrado })}
                className={`px-6 py-2 rounded-full border text-xs font-black uppercase tracking-widest transition-all ${form.castrado
                  ? "bg-[#4E593F] border-[#4E593F] text-white shadow-md shadow-[#4E593F]/20"
                  : "bg-slate-200 border-slate-300 text-slate-500"
                  }`}
              >
                {form.castrado ? "Sim" : "Não"}
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 ml-1">Status de Disponibilidade</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, status: "Ativo" })}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-full border text-sm font-bold transition-all ${form.status === "Ativo"
                    ? "bg-[#4E593F] border-[#4E593F] text-white shadow-md shadow-[#4E593F]/20"
                    : "bg-slate-50 border-slate-200 text-slate-500 hover:border-[#4E593F]"
                    }`}
                >
                  <span className={`w-2 h-2 rounded-full ${form.status === "Ativo" ? "bg-white" : "bg-slate-300"}`} />
                  Ativo
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, status: "Repouso" })}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-full border text-sm font-bold transition-all ${form.status === "Repouso"
                    ? "bg-[#DDE2D6] border-[#8C9A7A] text-[#2E3525] shadow-sm"
                    : "bg-slate-50 border-slate-200 text-slate-500 hover:border-[#8C9A7A]"
                    }`}
                >
                  <span className={`w-2 h-2 rounded-full ${form.status === "Repouso" ? "bg-[#F1F3EF]0" : "bg-slate-300"}`} />
                  Repouso
                </button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="tecnica" className="space-y-5 animate-in fade-in slide-in-from-bottom-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700 ml-1">Altura</label>
                <input
                  value={form.altura}
                  onChange={(e) => setForm({ ...form, altura: e.target.value })}
                  placeholder="M"
                  type="number"
                  step="0.01"
                  className="w-full h-14 px-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 text-base font-medium focus:ring-2 focus:ring-primary outline-none transition-all shadow-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700 ml-1">Peso</label>
                <input
                  value={form.peso}
                  onChange={(e) => setForm({ ...form, peso: e.target.value })}
                  placeholder="Kg"
                  type="number"
                  className="w-full h-14 px-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 text-base font-medium focus:ring-2 focus:ring-primary outline-none transition-all shadow-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Calendar size={16} /> Data da Avaliação Técnica
              </label>
              <input
                type="date"
                value={form.data_avaliacao}
                onChange={(e) => setForm({ ...form, data_avaliacao: e.target.value })}
                className="w-full h-14 px-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 text-base font-medium focus:ring-2 focus:ring-primary outline-none transition-all shadow-sm"
              />
            </div>

            <div className="bg-slate-50 p-4 rounded-3xl border border-slate-200 space-y-4">
              <h3 className="text-sm font-bold text-slate-900 border-b border-slate-200 pb-2">Marcha (Dados Técnicos)</h3>
              
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Qualidade do Passo</label>
                <div className="flex gap-2">
                  {["Antepista", "Sobrepista", "Transpista"].map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => setForm({ ...form, avaliacao_marcha: { ...form.avaliacao_marcha, qualidade: q } })}
                      className={`flex-1 py-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${form.avaliacao_marcha.qualidade === q
                        ? "bg-slate-800 border-slate-800 text-white"
                        : "bg-white border-slate-200 text-slate-400"
                        }`}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Comprimento</label>
                  <input
                    value={form.avaliacao_marcha.comprimento}
                    onChange={(e) => setForm({ ...form, avaliacao_marcha: { ...form.avaliacao_marcha, comprimento: e.target.value } })}
                    placeholder="Ex: 1,60"
                    className="w-full h-12 px-3 rounded-xl bg-white border border-slate-200 text-sm font-medium"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Passos/min</label>
                  <input
                    value={form.avaliacao_marcha.velocidade}
                    onChange={(e) => setForm({ ...form, avaliacao_marcha: { ...form.avaliacao_marcha, velocidade: e.target.value } })}
                    placeholder="Ex: 48"
                    className="w-full h-12 px-3 rounded-xl bg-white border border-slate-200 text-sm font-medium"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Passos em 10m</label>
                <input
                  value={form.avaliacao_marcha.frequencia_10m}
                  onChange={(e) => setForm({ ...form, avaliacao_marcha: { ...form.avaliacao_marcha, frequencia_10m: e.target.value } })}
                  placeholder="Ex: 6"
                  className="w-full h-12 px-3 rounded-xl bg-white border border-slate-200 text-sm font-medium"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 ml-1">Movimento 3D Predominante</label>
              <textarea
                value={form.movimento_3d_predominante}
                onChange={(e) => setForm({ ...form, movimento_3d_predominante: e.target.value })}
                placeholder="Ex: Antero posterior e latero lateral..."
                className="w-full h-24 px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 text-sm font-medium focus:ring-2 focus:ring-primary outline-none transition-all shadow-sm resize-none"
              />
            </div>
          </TabsContent>

          <TabsContent value="comportamento" className="space-y-5 animate-in fade-in slide-in-from-bottom-2 pb-10">
            <div className="space-y-3">
              <label className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-1 flex items-center gap-2">
                <Activity size={16} className="text-primary" /> Avaliação de Reações
              </label>

              {[
                { key: "animais", label: "Frente a outros animais" },
                { key: "materiais", label: "Frente ao uso de materiais" },
                { key: "montar_descer", label: "Frente ao montar/descer" },
                { key: "movimento_cavaleiro", label: "Frente ao movimento do cavaleiro" },
                { key: "conducao_guia", label: "Quando conduzido pela guia" },
                { key: "manejo", label: "Manejo, encilhamento e cabeçada" },
                { key: "ambiente_externo", label: "Em ambiente externo" },
              ].map((item) => (
                <div key={item.key} className="space-y-1.5">
                  <label className="text-[11px] font-black uppercase text-slate-400 ml-1 tracking-wider">{item.label}</label>
                  <input
                    value={(form.avaliacao_comportamento as any)[item.key]}
                    onChange={(e) => setForm({ ...form, avaliacao_comportamento: { ...form.avaliacao_comportamento, [item.key]: e.target.value } })}
                    placeholder="..."
                    className="w-full h-12 px-4 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium"
                  />
                </div>
              ))}
            </div>

            <div className="bg-[#F1F3EF] p-4 rounded-3xl border border-[#8C9A7A]/20 space-y-3">
              <label className="text-sm font-bold text-[#4E593F] flex items-center gap-2">
                <HeartPulse size={16} /> Veterinário
              </label>
              <div className="space-y-3">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-[#4E593F]/60 uppercase">Indicações</span>
                  <textarea
                    value={form.avaliacao_veterinaria.indicacoes}
                    onChange={(e) => setForm({ ...form, avaliacao_veterinaria: { ...form.avaliacao_veterinaria, indicacoes: e.target.value } })}
                    className="w-full h-20 p-3 rounded-xl bg-white/60 border border-[#8C9A7A]/40 text-sm outline-none resize-none"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-rose-600 uppercase">Contra-indicações</span>
                  <textarea
                    value={form.avaliacao_veterinaria.contra_indicacoes}
                    onChange={(e) => setForm({ ...form, avaliacao_veterinaria: { ...form.avaliacao_veterinaria, contra_indicacoes: e.target.value } })}
                    className="w-full h-20 p-3 rounded-xl bg-white/60 border border-rose-200 text-sm outline-none resize-none"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 ml-1">Humor & Observações Gerais</label>
              <div className="flex gap-2 mb-3">
                {["Dócil", "Moderado", "Arredio"].map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setForm({ ...form, humor: h })}
                    className={`flex-1 py-2.5 rounded-full border text-xs font-bold transition-all ${form.humor === h
                      ? "bg-[#4E593F] border-[#4E593F] text-white shadow-md shadow-[#4E593F]/20"
                      : "bg-slate-50 border-slate-200 text-slate-500 hover:border-[#4E593F]"
                      }`}
                  >
                    {h}
                  </button>
                ))}
              </div>
              <textarea
                value={form.comentario}
                onChange={(e) => setForm({ ...form, comentario: e.target.value })}
                placeholder="Observações adicionais..."
                className="w-full h-32 px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 text-base font-medium focus:ring-2 focus:ring-[#4E593F] focus:border-[#4E593F] outline-none transition-all shadow-sm focus:bg-white resize-none"
              />
            </div>
          </TabsContent>
        </Tabs>
        <div className="h-20" />
      </ActionSheet>

      {/* Confirmation Modal for Soft Delete */}
      <ConfirmDeleteModal
        isOpen={!!deleteTarget}
        title="Remover Cavalo?"
        description={`Tem certeza que deseja remover ${deleteTarget?.nome ?? ""}? O histórico de sessões será mantido.`}
        confirmLabel="Sim, remover"
        isLoading={deleteCavalo.isPending}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

export default GestorCavalos;
