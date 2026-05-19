import { Hourglass, LogOut, XCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface Props {
  /** True se todos os vínculos estão como "rejeitado" — muda a copy. */
  rejeitado?: boolean;
}

export const AguardandoAprovacao = ({ rejeitado = false }: Props) => {
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center p-6">
      <div className="w-full max-w-[400px] bg-white rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.04)] p-8 sm:p-10 text-center space-y-6">
        <div className="w-20 h-20 mx-auto rounded-3xl bg-primary/5 border-2 border-primary/10 flex items-center justify-center">
          {rejeitado ? (
            <XCircle className="w-10 h-10 text-rose-500" strokeWidth={1.5} />
          ) : (
            <Hourglass className="w-10 h-10 text-primary" strokeWidth={1.5} />
          )}
        </div>

        <div className="space-y-3">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            {rejeitado ? "Cadastro Rejeitado" : "Aguardando Aprovação"}
          </h1>
          <p className="text-slate-500 font-medium leading-relaxed text-sm">
            {rejeitado ? (
              <>
                Seu cadastro de praticante foi rejeitado pela gestão. Entre em
                contato com o gestor da Estância Tordilha para entender o motivo
                e regularizar.
              </>
            ) : (
              <>
                Seu cadastro foi enviado e está aguardando aprovação do gestor
                da Estância Tordilha. Você receberá acesso ao sistema assim que
                a aprovação for concluída.
              </>
            )}
          </p>
        </div>

        <div className="pt-2 space-y-3">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-left">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">
              Próximo passo
            </p>
            <p className="text-sm font-medium text-slate-700 leading-snug">
              {rejeitado
                ? "Procure o gestor presencialmente ou pelos canais oficiais."
                : "Aguarde a aprovação. Em caso de dúvida, contate o gestor."}
            </p>
          </div>

          <button
            type="button"
            onClick={handleSignOut}
            className="w-full h-12 rounded-2xl bg-slate-100 hover:bg-slate-200 transition-all flex items-center justify-center gap-2 text-slate-700 font-bold text-sm active:scale-[0.98]"
          >
            <LogOut size={16} />
            Sair
          </button>
        </div>
      </div>
    </div>
  );
};
