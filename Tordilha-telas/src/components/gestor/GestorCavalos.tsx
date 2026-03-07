import { useState } from "react";
import { cavalos as initialCavalos } from "@/data/mockData";
import { Plus, X, ChevronRight } from "lucide-react";

export const GestorCavalos = () => {
  const [cavalos, setCavalos] = useState(initialCavalos);
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<typeof initialCavalos[0] | null>(null);
  const [form, setForm] = useState({ nome: "", raca: "", status: "Ativo" as "Ativo" | "Repouso", pesoMax: "" });

  const handleSave = () => {
    if (!form.nome) return;
    if (selected) {
      setCavalos(cavalos.map((c) => c.id === selected.id ? { ...c, ...form, pesoMax: Number(form.pesoMax) } : c));
    } else {
      setCavalos([...cavalos, { id: String(Date.now()), ...form, pesoMax: Number(form.pesoMax) }]);
    }
    setShowForm(false);
    setSelected(null);
  };

  const openEdit = (c: typeof initialCavalos[0]) => {
    setSelected(c);
    setForm({ nome: c.nome, raca: c.raca, status: c.status, pesoMax: String(c.pesoMax) });
    setShowForm(true);
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-xl font-extrabold text-foreground">Cavalos</h1>
        <p className="text-sm text-muted-foreground font-medium mt-0.5">{cavalos.length} cavalos cadastrados</p>
      </div>

      <div className="space-y-3">
        {cavalos.map((c) => (
          <button key={c.id} onClick={() => openEdit(c)} className="w-full flex items-center gap-4 p-5 bg-card rounded-3xl card-shadow text-left transition-all active:scale-[0.98]">
            <div className="w-14 h-14 rounded-2xl bg-secondary/10 flex items-center justify-center text-2xl">🐴</div>
            <div className="flex-1">
              <p className="font-bold text-sm text-foreground">{c.nome}</p>
              <p className="text-xs text-muted-foreground font-medium mt-0.5">{c.raca} · Até {c.pesoMax}kg</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1.5 text-[10px] font-extrabold rounded-full ${c.status === "Ativo" ? "bg-primary/10 text-primary" : "bg-accent/20 text-accent-foreground"}`}>{c.status}</span>
              <ChevronRight size={18} className="text-muted-foreground" />
            </div>
          </button>
        ))}
      </div>

      {/* FAB */}
      <button
        onClick={() => { setShowForm(true); setSelected(null); setForm({ nome: "", raca: "", status: "Ativo", pesoMax: "" }); }}
        className="fixed bottom-28 right-6 max-w-lg w-16 h-16 rounded-full bg-secondary text-secondary-foreground shadow-lg flex items-center justify-center z-30 active:scale-95 transition-transform"
        style={{ boxShadow: '0 8px 24px hsla(25, 72%, 31%, 0.35)' }}
      >
        <Plus size={28} />
      </button>

      {showForm && (
        <div className="fixed inset-0 bg-foreground/30 backdrop-blur-sm z-50 flex items-end justify-center">
          <div className="bg-card w-full max-w-lg rounded-t-3xl p-6 space-y-5 animate-fade-in">
            <div className="flex items-center justify-between">
              <h2 className="font-extrabold text-lg text-foreground">{selected ? "Editar Cavalo" : "Novo Cavalo"}</h2>
              <button onClick={() => setShowForm(false)} className="w-10 h-10 rounded-2xl bg-background flex items-center justify-center"><X size={20} /></button>
            </div>
            <div className="space-y-3">
              <input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Nome" className="w-full p-4 rounded-2xl bg-background text-sm font-medium border-0 focus:outline-none focus:ring-2 focus:ring-secondary/30" />
              <input value={form.raca} onChange={(e) => setForm({ ...form, raca: e.target.value })} placeholder="Raça" className="w-full p-4 rounded-2xl bg-background text-sm font-medium border-0 focus:outline-none focus:ring-2 focus:ring-secondary/30" />
              <div className="flex gap-3">
                {(["Ativo", "Repouso"] as const).map((s) => (
                  <button key={s} onClick={() => setForm({ ...form, status: s })} className={`flex-1 py-4 rounded-2xl text-sm font-extrabold touch-target transition-all ${form.status === s ? (s === "Ativo" ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground") : "bg-background text-muted-foreground"}`}>{s}</button>
                ))}
              </div>
              <input value={form.pesoMax} onChange={(e) => setForm({ ...form, pesoMax: e.target.value })} placeholder="Peso Máximo (kg)" type="number" className="w-full p-4 rounded-2xl bg-background text-sm font-medium border-0 focus:outline-none focus:ring-2 focus:ring-secondary/30" />
            </div>
            <button onClick={handleSave} className="w-full py-4 bg-secondary text-secondary-foreground rounded-2xl font-extrabold text-base touch-target" style={{ boxShadow: '0 8px 24px hsla(25, 72%, 31%, 0.3)' }}>Salvar</button>
          </div>
        </div>
      )}
    </div>
  );
};
