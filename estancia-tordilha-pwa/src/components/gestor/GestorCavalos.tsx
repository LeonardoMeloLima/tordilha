import { useState, useEffect } from "react";
import { Check, ChevronRight, HeartPulse } from "lucide-react";
import { ActionSheet } from "../ui/ActionSheet";
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
  const [form, setForm] = useState({ nome: "", raca: "", status: "Ativo" as "Ativo" | "Repouso", foto_url: "" });
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; nome: string } | null>(null);

  const handleAddNew = () => {
    setShowForm(true);
    setSelected(null);
    setForm({ nome: "", raca: "", status: "Ativo", foto_url: "" });
  };

  useEffect(() => {
    const handleOpenForm = () => handleAddNew();
    window.addEventListener('open-form-cavalo', handleOpenForm);
    return () => window.removeEventListener('open-form-cavalo', handleOpenForm);
  }, []);

  const handleSave = async () => {
    if (!form.nome) return;

    try {
      if (selected) {
        await updateCavalo.mutateAsync({ id: selected.id, ...form });
        toast({ title: "Sucesso", description: "Cavalo atualizado com sucesso!" });
      } else {
        await createCavalo.mutateAsync(form);
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
      status: (c.status as any) || "Ativo",
      foto_url: c.foto_url || ""
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
              className="h-12 px-8 bg-[#EAB308] text-white rounded-full font-bold text-sm shadow-md shadow-[#EAB308]/20 active:scale-[0.95] transition-all"
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
                <button type="button" onClick={() => openEdit(c)} className="w-full flex items-center gap-4 p-5 bg-card rounded-3xl card-shadow text-left transition-all active:scale-[0.98]">
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
                    <span className={`px-3 py-1 text-[11px] font-extrabold rounded-full tracking-wide ${c.status === "Ativo" ? "bg-[#EAB308] text-white" : "bg-amber-100 text-amber-600 border border-amber-300"}`}>{c.status?.toUpperCase()}</span>
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
            className="w-full h-14 bg-[#EAB308] hover:bg-[#D97706] text-white rounded-full font-bold text-lg shadow-lg shadow-[#EAB308]/20 flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-70"
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
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 ml-1">Nome do Cavalo</label>
            <input
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              placeholder="Ex: Tordilho"
              className="w-full h-14 px-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 text-base font-medium focus:ring-2 focus:ring-[#EAB308] focus:border-[#EAB308] outline-none transition-all shadow-sm focus:bg-white"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 ml-1">Raça</label>
            <input
              value={form.raca}
              onChange={(e) => setForm({ ...form, raca: e.target.value })}
              placeholder="Ex: Mangalarga Marchador"
              className="w-full h-14 px-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 text-base font-medium focus:ring-2 focus:ring-[#EAB308] focus:border-[#EAB308] outline-none transition-all shadow-sm focus:bg-white"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 ml-1">Status de Disponibilidade</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setForm({ ...form, status: "Ativo" })}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-full border text-sm font-bold transition-all ${form.status === "Ativo"
                  ? "bg-[#EAB308] border-[#EAB308] text-white shadow-md shadow-[#EAB308]/20"
                  : "bg-slate-50 border-slate-200 text-slate-500 hover:border-[#EAB308]"
                  }`}
              >
                <span className={`w-2 h-2 rounded-full ${form.status === "Ativo" ? "bg-white" : "bg-slate-300"}`} />
                Ativo
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, status: "Repouso" })}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-full border text-sm font-bold transition-all ${form.status === "Repouso"
                  ? "bg-amber-100 border-amber-300 text-amber-700 shadow-sm"
                  : "bg-slate-50 border-slate-200 text-slate-500 hover:border-amber-300"
                  }`}
              >
                <span className={`w-2 h-2 rounded-full ${form.status === "Repouso" ? "bg-amber-500" : "bg-slate-300"}`} />
                Repouso
              </button>
            </div>
          </div>

          <ImageUploadField
            bucket="cavalos"
            value={form.foto_url}
            onChange={(url) => setForm({ ...form, foto_url: url })}
            defaultFacingMode="environment"
            shape="rounded"
            label="Foto do Cavalo"
          />
        </div>
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
