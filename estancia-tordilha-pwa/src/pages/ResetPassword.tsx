import { Navigate } from "react-router-dom";

/* Desativado em 2026-05-11 — fluxo de recuperação por email removido.
   Esta página agora redireciona pra /login. Pra religar o fluxo original:
   1) descomentar o body anterior (consultar git history: `git show HEAD~N:src/pages/ResetPassword.tsx`)
   2) descomentar o link "Recuperar" em src/pages/Login.tsx
   3) descomentar o bloco mode === "forgotPassword" em handleAuth do Login.tsx
*/

const ResetPassword = () => <Navigate to="/login" replace />;

export default ResetPassword;
