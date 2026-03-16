import { useState, useEffect } from "react";
import { ActionSheet } from "@/components/ui/ActionSheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { Lock, Check, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";

export const ProfessorPasswordPrompt = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const checkFirstLogin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // We'll check a flag in user_metadata or profiles
      // For now, let's use user_metadata which is easier to check without extra queries
      if (user.user_metadata?.needs_password_change === true) {
        setIsOpen(true);
      }
    };

    checkFirstLogin();
  }, []);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Senhas não conferem",
        description: "A nova senha e a confirmação devem ser iguais.",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        variant: "destructive",
        title: "Senha muito curta",
        description: "A senha deve ter pelo menos 6 caracteres.",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
        data: { needs_password_change: false }
      });

      if (error) throw error;

      toast({
        title: "Senha atualizada!",
        description: "Sua nova senha foi salva com sucesso.",
      });
      setIsOpen(false);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar senha",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ActionSheet
      isOpen={isOpen}
      onClose={() => {}} // User MUST change password
      title="Bem-vindo à Tordilha!"
      subtitle="Para sua segurança, por favor defina uma nova senha para seu primeiro acesso."
    >
      <form onSubmit={handleUpdatePassword} className="space-y-4 py-4">
        <div className="bg-amber-50 p-4 rounded-2xl flex gap-3 mb-2">
          <AlertCircle className="text-amber-600 shrink-0" size={20} />
          <p className="text-xs text-amber-800 leading-tight">
            Você está usando uma senha temporária. Escolha uma senha forte que você lembrará.
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700 ml-1">Nova Senha</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <Input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 h-12 rounded-2xl bg-slate-50 border-transparent focus:bg-white"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700 ml-1">Confirmar Nova Senha</label>
          <div className="relative">
            <Check className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <Input
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={`pl-10 h-12 rounded-2xl bg-slate-50 border-transparent focus:bg-white ${confirmPassword && password !== confirmPassword ? 'border-red-300' : ''}`}
              required
            />
          </div>
        </div>

        <Button 
          disabled={loading}
          className="w-full h-12 rounded-full bg-[#4E593F] hover:bg-[#3E4732] text-white font-bold mt-4 shadow-lg shadow-[#4E593F]/20"
        >
          {loading ? "Salvando..." : "Confirmar Nova Senha"}
        </Button>
      </form>
    </ActionSheet>
  );
};
