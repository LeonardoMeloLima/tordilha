export const alunos = [
  { id: "1", nome: "Lucas Silva", idade: 8, diagnostico: "TEA - Nível 1", contatoEmergencia: "(51) 99123-4567", lgpdAssinado: true },
  { id: "2", nome: "Maria Fernanda Costa", idade: 6, diagnostico: "Paralisia Cerebral Leve", contatoEmergencia: "(51) 98765-4321", lgpdAssinado: true },
  { id: "3", nome: "João Pedro Oliveira", idade: 10, diagnostico: "TDAH", contatoEmergencia: "(51) 99876-5432", lgpdAssinado: false },
  { id: "4", nome: "Ana Beatriz Santos", idade: 7, diagnostico: "Síndrome de Down", contatoEmergencia: "(51) 99234-5678", lgpdAssinado: true },
  { id: "5", nome: "Gabriel Martins", idade: 9, diagnostico: "TEA - Nível 2", contatoEmergencia: "(51) 98345-6789", lgpdAssinado: false },
];

export const cavalos = [
  { id: "1", nome: "Tordilho", raca: "Crioulo", status: "Ativo" as const, pesoMax: 60 },
  { id: "2", nome: "Estrela", raca: "Mangalarga", status: "Ativo" as const, pesoMax: 55 },
  { id: "3", nome: "Trovão", raca: "Crioulo", status: "Repouso" as const, pesoMax: 70 },
  { id: "4", nome: "Luna", raca: "Árabe", status: "Ativo" as const, pesoMax: 50 },
];

export const sessoes = [
  { id: "1", alunoId: "1", cavaloId: "1", professorId: "1", data: "2026-03-05", hora: "08:00", status: "confirmada" },
  { id: "2", alunoId: "2", cavaloId: "2", professorId: "1", data: "2026-03-05", hora: "09:30", status: "confirmada" },
  { id: "3", alunoId: "4", cavaloId: "4", professorId: "2", data: "2026-03-05", hora: "10:00", status: "confirmada" },
  { id: "4", alunoId: "3", cavaloId: "1", professorId: "1", data: "2026-03-05", hora: "14:00", status: "pendente" },
  { id: "5", alunoId: "5", cavaloId: "2", professorId: "2", data: "2026-03-06", hora: "08:00", status: "confirmada" },
  { id: "6", alunoId: "1", cavaloId: "1", professorId: "1", data: "2026-03-07", hora: "08:00", status: "confirmada" },
];

export const avisos = [
  { id: "1", titulo: "Sessão cancelada", mensagem: "Sessão de quinta-feira cancelada devido à chuva forte prevista.", data: "2026-03-04", tipo: "alerta" as const },
  { id: "2", titulo: "Festa Junina 🎉", mensagem: "Venham comemorar! Dia 15/03, a partir das 14h, teremos nossa Festa Junina na sede.", data: "2026-03-03", tipo: "evento" as const },
  { id: "3", titulo: "Novo horário", mensagem: "A partir de abril, as sessões matutinas começarão às 07:30.", data: "2026-03-01", tipo: "info" as const },
];

export const muralPosts = [
  { id: "1", tipo: "foto", descricao: "Lucas montando Tordilho pela primeira vez sozinho! 🐴", data: "2026-03-04", badge: null },
  { id: "2", tipo: "conquista", descricao: "Maria Fernanda ganhou o selo 'Amiga do Tordilho'!", data: "2026-03-03", badge: "Amiga do Tordilho" },
  { id: "3", tipo: "foto", descricao: "Tarde especial de integração no campo.", data: "2026-03-02", badge: null },
];
