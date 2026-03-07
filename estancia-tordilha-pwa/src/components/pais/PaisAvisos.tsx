import { useAvisos } from "@/hooks/useAvisos";
import { AlertTriangle, PartyPopper, Info, Bell } from "lucide-react";

const icons: Record<string, React.ReactNode> = {
  alerta: <AlertTriangle size={20} className="text-rose-600" />,
  evento: <PartyPopper size={20} className="text-amber-500" />,
  info: <Info size={20} className="text-blue-500" />,
};

const bgColors: Record<string, string> = {
  alerta: "bg-rose-50",
  evento: "bg-amber-50",
  info: "bg-blue-50",
};

export const PaisAvisos = () => {
  const { avisos, isLoading } = useAvisos();

  return (
    <div className="space-y-6 animate-fade-in pb-24">
      <div>
        <h1 className="text-xl font-extrabold text-foreground tracking-tight">Comunicados</h1>
        <p className="text-sm text-muted-foreground font-medium mt-0.5">{avisos.length} avisos importantes</p>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          [1, 2, 3].map(i => (
            <div key={i} className="p-5 bg-card rounded-[32px] card-shadow animate-pulse flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-100" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-slate-100 rounded w-1/2" />
                <div className="h-3 bg-slate-100 rounded w-3/4" />
              </div>
            </div>
          ))
        ) : avisos.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-[40px] border-2 border-dashed border-slate-100 flex flex-col items-center gap-4">
            <Bell size={48} className="text-slate-100" />
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Tudo em dia por aqui</p>
          </div>
        ) : (
          avisos.map((a) => (
            <div key={a.id} className="p-6 bg-card rounded-[32px] card-shadow border-2 border-transparent hover:border-slate-50 transition-all group">
              <div className="flex items-start gap-5">
                <div className={`w-14 h-14 rounded-2xl ${bgColors[a.tipo] || "bg-slate-50"} flex items-center justify-center flex-shrink-0 shadow-sm transition-transform group-hover:scale-105`}>
                  {icons[a.tipo] || <Bell size={20} className="text-slate-400" />}
                </div>
                <div className="flex-1">
                  <p className="text-base font-black text-slate-900 tracking-tight">{a.titulo}</p>
                  <p className="text-sm text-slate-500 font-medium mt-1 leading-relaxed">{a.mensagem}</p>
                  <p className="text-[10px] text-slate-300 font-bold uppercase tracking-widest mt-4">
                    {a.criado_em ? new Date(a.criado_em).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' }) : ""}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
