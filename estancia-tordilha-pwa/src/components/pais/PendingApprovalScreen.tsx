import { Clock, XCircle, LogOut } from "lucide-react";
import { supabase } from "@/lib/supabase";
import logo from "@/assets/logo-marrom.png";

interface Props {
    status: "pendente" | "rejeitado" | string;
}

export function PendingApprovalScreen({ status }: Props) {
    const isPendente = status === "pendente";

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        window.location.href = "/login";
    };

    return (
        <div className="min-h-screen bg-[#F8F9FA] flex flex-col items-center justify-center px-6 text-center">
            <img src={logo} alt="Estância Tordilha" className="h-20 object-contain mb-10" />

            <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 ${isPendente ? "bg-amber-100" : "bg-red-100"}`}>
                {isPendente
                    ? <Clock size={36} className="text-amber-500" strokeWidth={2} />
                    : <XCircle size={36} className="text-red-500" strokeWidth={2} />
                }
            </div>

            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mb-3">
                {isPendente ? "Cadastro em análise" : "Cadastro não aprovado"}
            </h1>

            <p className="text-sm font-medium text-slate-500 leading-relaxed max-w-xs">
                {isPendente
                    ? "Seu cadastro está aguardando aprovação da Estância Tordilha. Você será notificado assim que for liberado."
                    : "Infelizmente seu cadastro não foi aprovado. Entre em contato com a Estância Tordilha para mais informações."
                }
            </p>

            <button
                onClick={handleSignOut}
                className="mt-10 flex items-center gap-2 px-6 py-3 rounded-full border-2 border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-100 active:scale-95 transition-all"
            >
                <LogOut size={16} />
                Sair
            </button>
        </div>
    );
}
