import { useState } from "react";
import { alunos as initialAlunos } from "@/data/mockData";
import { Plus, Search, ChevronRight, X, Shield, ShieldOff, User } from "lucide-react";

export const GestorAlunos = () => {
  const [alunos, setAlunos] = useState(initialAlunos);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [selectedAluno, setSelectedAluno] = useState<typeof initialAlunos[0] | null>(null);
  const [form, setForm] = useState({ nome: "", idade: "", diagnostico: "", contatoEmergencia: "", lgpdAssinado: false });

  const filtered = alunos.filter((a) => a.nome.toLowerCase().includes(search.toLowerCase()));

  const handleSave = () => {
    if (!form.nome) return;
    if (selectedAluno) {
      setAlunos(alunos.map((a) => a.id === selectedAluno.id ? { ...a, ...form, idade: Number(form.idade) } : a));
    } else {
      setAlunos([...alunos, { id: String(Date.now()), ...form, idade: Number(form.idade) }]);
    }
    setShowForm(false);
    setSelectedAluno(null);
    setForm({ nome: "", idade: "", diagnostico: "", contatoEmergencia: "", lgpdAssinado: false });
  };

  const openEdit = (aluno: typeof initialAlunos[0]) => {
    setSelectedAluno(aluno);
    setForm({ nome: aluno.nome, idade: String(aluno.idade), diagnostico: aluno.diagnostico, contatoEmergencia: aluno.contatoEmergencia, lgpdAssinado: aluno.lgpdAssinado });
    setShowForm(true);
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-xl font-extrabold text-foreground">Alunos</h1>
        <p className="text-sm text-muted-foreground font-medium mt-0.5">{alunos.length} alunos cadastrados</p>
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
        {filtered.map((aluno) => (
          <button key={aluno.id} onClick={() => openEdit(aluno)} className="w-full flex items-center gap-4 p-5 bg-card rounded-3xl card-shadow text-left transition-all active:scale-[0.98]">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <User size={20} className="text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-sm text-foreground">{aluno.nome}</p>
              <p className="text-xs text-muted-foreground font-medium mt-0.5">{aluno.diagnostico} · {aluno.idade} anos</p>
            </div>
            <div className="flex items-center gap-2">
              {aluno.lgpdAssinado ? <Shield size={16} className="text-primary" /> : <ShieldOff size={16} className="text-destructive" />}
              <ChevronRight size={18} className="text-muted-foreground" />
            </div>
          </button>
        ))}
      </div>

      {/* FAB */}
      <button
        onClick={() => { setShowForm(true); setSelectedAluno(null); setForm({ nome: "", idade: "", diagnostico: "", contatoEmergencia: "", lgpdAssinado: false }); }}
        className="fixed bottom-28 right-6 max-w-lg w-16 h-16 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center z-30 active:scale-95 transition-transform"
        style={{ boxShadow: '0 8px 24px hsla(146, 51%, 36%, 0.35)' }}
      >
        <Plus size={28} />
      </button>

      {showForm && (
        <div className="fixed inset-0 bg-foreground/30 backdrop-blur-sm z-50 flex items-end justify-center">
          <div className="bg-card w-full max-w-lg rounded-t-3xl p-6 space-y-5 animate-fade-in">
            <div className="flex items-center justify-between">
              <h2 className="font-extrabold text-lg text-foreground">{selectedAluno ? "Editar Aluno" : "Novo Aluno"}</h2>
              <button onClick={() => setShowForm(false)} className="w-10 h-10 rounded-2xl bg-background flex items-center justify-center"><X size={20} /></button>
            </div>
            <div className="space-y-3">
              <input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Nome completo" className="w-full p-4 rounded-2xl bg-background text-sm font-medium border-0 focus:outline-none focus:ring-2 focus:ring-primary/30" />
              <input value={form.idade} onChange={(e) => setForm({ ...form, idade: e.target.value })} placeholder="Idade" type="number" className="w-full p-4 rounded-2xl bg-background text-sm font-medium border-0 focus:outline-none focus:ring-2 focus:ring-primary/30" />
              <input value={form.diagnostico} onChange={(e) => setForm({ ...form, diagnostico: e.target.value })} placeholder="Diagnóstico" className="w-full p-4 rounded-2xl bg-background text-sm font-medium border-0 focus:outline-none focus:ring-2 focus:ring-primary/30" />
              <input value={form.contatoEmergencia} onChange={(e) => setForm({ ...form, contatoEmergencia: e.target.value })} placeholder="Contato de Emergência" className="w-full p-4 rounded-2xl bg-background text-sm font-medium border-0 focus:outline-none focus:ring-2 focus:ring-primary/30" />
              <label className="flex items-center gap-3 p-4 rounded-2xl bg-background cursor-pointer">
                <input type="checkbox" checked={form.lgpdAssinado} onChange={(e) => setForm({ ...form, lgpdAssinado: e.target.checked })} className="w-5 h-5 rounded accent-primary" />
                <span className="text-sm font-semibold">Consentimento LGPD Assinado</span>
              </label>
            </div>
            <button onClick={handleSave} className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-extrabold text-base touch-target" style={{ boxShadow: '0 8px 24px hsla(146, 51%, 36%, 0.3)' }}>Salvar</button>
          </div>
        </div>
      )}
    </div>
  );
};
