import { useCavalos } from "@/hooks/useCavalos";
import { AvatarWithFallback } from "@/components/ui/AvatarWithFallback";

export const ProfessorCavalos = () => {
  const { cavalos, isLoading } = useCavalos();

  return (
    <div className="space-y-6 animate-fade-in pb-24">
      <div>
        <h1 className="text-xl font-extrabold text-foreground tracking-tight">Cavalos</h1>
        <p className="text-sm text-muted-foreground font-medium mt-0.5">{cavalos.length} cavalos disponíveis</p>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          [1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-4 p-5 bg-card rounded-3xl card-shadow animate-pulse">
              <div className="w-14 h-14 rounded-2xl bg-slate-100" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-slate-100 rounded w-1/3" />
                <div className="h-3 bg-slate-100 rounded w-1/2" />
              </div>
            </div>
          ))
        ) : cavalos.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-[32px] border-2 border-dashed border-slate-100">
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Nenhum cavalo cadastrado</p>
          </div>
        ) : (
          cavalos.map((c) => (
            <div key={c.id} className="flex items-center gap-4 p-5 bg-card rounded-3xl card-shadow transition-all active:scale-[0.98]">
              <AvatarWithFallback
                src={c.foto_url}
                className="w-14 h-14 rounded-2xl"
                type="horse"
              />
              <div className="flex-1">
                <p className="text-base font-bold text-slate-900">{c.nome}</p>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  {c.raca || "Raça não informada"}
                </p>
              </div>
              <div>
                <span className={`px-3 py-1 text-[11px] font-extrabold uppercase rounded-full tracking-wide ${c.status === "Ativo" ? "bg-[#EAB308] text-white" : "bg-amber-100 text-amber-600 border border-amber-300"}`}>
                  {c.status}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ProfessorCavalos;
