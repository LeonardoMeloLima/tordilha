import React from "react";

interface ImageRightsFormProps {
  responsibleName: string;
  rg: string;
  setRg: (val: string) => void;
  cpf: string;
  setCpf: (val: string) => void;
  address: string;
  setAddress: (val: string) => void;
  city: string;
  setCity: (val: string) => void;
  state: string;
  setState: (val: string) => void;
  setResponsibleName: (val: string) => void;
  studentNames: string;
  authorized: boolean;
  setAuthorized: (val: boolean) => void;
  onConfirm?: () => void;
}

export const ImageRightsForm: React.FC<ImageRightsFormProps> = ({
  responsibleName,
  rg,
  setRg,
  cpf,
  setCpf,
  address,
  setAddress,
  city,
  setCity,
  state,
  setState,
  setResponsibleName,
  studentNames,
  authorized,
  setAuthorized,
  onConfirm,
}) => {
  const isFormValid = rg && cpf && address && city && state;

  return (
    <div className="space-y-6 text-sm text-slate-700 leading-relaxed bg-white p-2 rounded-2xl animate-in fade-in slide-in-from-top-4 duration-500">
      <div className="space-y-5">
        <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100 space-y-4">
          <p className="leading-relaxed">
            Eu, 
            <input 
              value={responsibleName} 
              onChange={(e) => setResponsibleName(e.target.value)} 
              placeholder="Nome completo do responsável" 
              className="inline-block w-full sm:w-80 h-9 mx-0 sm:mx-1 px-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-[#EAB308] outline-none transition-all my-1 sm:my-0 font-bold text-slate-900" 
              required
            />, 
            portador(a) do RG nº 
            <input 
              value={rg} 
              onChange={(e) => setRg(e.target.value)} 
              placeholder="Digite seu RG" 
              className="inline-block w-full sm:w-48 h-9 mx-0 sm:mx-1 px-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-[#EAB308] outline-none transition-all my-1 sm:my-0" 
              required
            />
            e CPF nº 
            <input 
              value={cpf} 
              onChange={(e) => setCpf(e.target.value)} 
              placeholder="Digite seu CPF" 
              className="inline-block w-full sm:w-52 h-9 mx-0 sm:mx-1 px-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-[#EAB308] outline-none transition-all my-1 sm:my-0" 
              required
            />, 
            residente e domiciliado(a) à 
            <input 
              value={address} 
              onChange={(e) => setAddress(e.target.value)} 
              placeholder="Seu endereço completo" 
              className="w-full mt-2 h-10 px-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-[#EAB308] outline-none transition-all" 
              required
            />, 
            na cidade de 
            <input 
              value={city} 
              onChange={(e) => setCity(e.target.value)} 
              placeholder="Cidade" 
              className="inline-block w-full sm:w-52 h-9 mx-0 sm:mx-1 px-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-[#EAB308] outline-none transition-all my-1 sm:my-0" 
              required
            /> 
            de 
            <input 
              value={state} 
              onChange={(e) => setState(e.target.value)} 
              placeholder="UF" 
              maxLength={2}
              className="inline-block w-full sm:w-20 h-9 mx-0 sm:mx-1 px-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-[#EAB308] outline-none transition-all uppercase my-1 sm:my-0 text-center font-bold" 
              required
            />.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={() => setAuthorized(true)}
            className={`flex-1 flex items-center justify-center gap-3 p-4 rounded-2xl border-2 transition-all group ${authorized ? "border-[#EAB308] bg-[#EAB308]/5 text-[#EAB308]" : "border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200"}`}
          >
            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${authorized ? "border-[#EAB308]" : "border-slate-300 group-hover:border-slate-400"}`}>
              {authorized && <div className="w-3 h-3 rounded-full bg-[#EAB308] animate-in zoom-in-50" />}
            </div>
            <span className="font-bold">AUTORIZO</span>
          </button>
          
          <button
            type="button"
            onClick={() => setAuthorized(false)}
            className={`flex-1 flex items-center justify-center gap-3 p-4 rounded-2xl border-2 transition-all group ${!authorized ? "border-slate-400 bg-slate-100 text-slate-700" : "border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200"}`}
          >
            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${!authorized ? "border-slate-500" : "border-slate-300 group-hover:border-slate-400"}`}>
              {!authorized && <div className="w-3 h-3 rounded-full bg-slate-500 animate-in zoom-in-50" />}
            </div>
            <span className="font-bold">NÃO AUTORIZO</span>
          </button>
        </div>

        <div className="prose prose-slate prose-sm max-w-none text-slate-600 space-y-4">
          <p>
            a <span className="font-bold text-slate-800">Estância Tordilha</span>, empresa com sede na Estrada João Cecom, 2200 Altos da Bela Vista Indaiatuba SP inscrita no CNPJ sob o nº 21.601.404/0001-00 e suas empresas coligadas, a utilizar, de forma gratuita e por tempo indeterminado, a minha imagem e do meu(s) filho(s) <span className="font-bold text-slate-800 underline decoration-slate-200 underline-offset-4 decoration-2">{studentNames || "praticante(s) de Equoterapia"}</span>, para a utilização em materiais gráficos, mídia impressa, eletrônica (internet), que serão da Estância Tordilha e de suas empresas coligadas.
          </p>
        </div>

        <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-widest">
          <span>Indaiatuba, SP</span>
          <span>{new Date().toLocaleDateString('pt-BR')}</span>
        </div>

        {onConfirm && (
          <button
            type="button"
            onClick={onConfirm}
            disabled={!isFormValid}
            className="w-full h-14 bg-[#EAB308] text-white rounded-2xl font-bold text-lg shadow-lg shadow-[#EAB308]/20 flex items-center justify-center transition-all active:scale-[0.98] disabled:opacity-50 disabled:grayscale mt-4"
          >
            Confirmar Autorização
          </button>
        )}
      </div>
    </div>
  );
};
