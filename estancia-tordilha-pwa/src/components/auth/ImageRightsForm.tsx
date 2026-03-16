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
      <div className="space-y-6">
        {/* Profile/Identity Section */}
        <div className="p-5 bg-slate-50/50 rounded-2xl border border-slate-100 space-y-6">
          <div className="grid grid-cols-1 gap-5">
            {/* Responsável */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">Nome do Responsável</label>
              <input 
                value={responsibleName} 
                onChange={(e) => setResponsibleName(e.target.value)} 
                placeholder="Nome completo conforme documento" 
                className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#4E593F] focus:border-transparent outline-none transition-all font-semibold text-slate-900 bg-white" 
                required
              />
            </div>

            {/* RG and CPF in a grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">RG nº</label>
                <input 
                  value={rg} 
                  onChange={(e) => setRg(e.target.value)} 
                  placeholder="Seu RG" 
                  className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#4E593F] focus:border-transparent outline-none transition-all bg-white" 
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">CPF nº</label>
                <input 
                  value={cpf} 
                  onChange={(e) => setCpf(e.target.value)} 
                  placeholder="Seu CPF" 
                  className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#4E593F] focus:border-transparent outline-none transition-all bg-white" 
                  required
                />
              </div>
            </div>

            {/* Address */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">Endereço Residencial</label>
              <input 
                value={address} 
                onChange={(e) => setAddress(e.target.value)} 
                placeholder="Rua, número, bairro..." 
                className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#4E593F] focus:border-transparent outline-none transition-all bg-white" 
                required
              />
            </div>

            {/* City and State */}
            <div className="grid grid-cols-4 gap-4">
              <div className="col-span-3 space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">Cidade</label>
                <input 
                  value={city} 
                  onChange={(e) => setCity(e.target.value)} 
                  placeholder="Sua cidade" 
                  className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#4E593F] focus:border-transparent outline-none transition-all bg-white" 
                  required
                />
              </div>
              <div className="col-span-1 space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1 text-center block">UF</label>
                <input 
                  value={state} 
                  onChange={(e) => setState(e.target.value)} 
                  placeholder="UF" 
                  maxLength={2}
                  className="w-full h-12 px-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#4E593F] focus:border-transparent outline-none transition-all uppercase text-center font-bold bg-white" 
                  required
                />
              </div>
            </div>
          </div>
        </div>

        {/* Authorization Toggle */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={() => setAuthorized(true)}
            className={`flex-1 flex items-center justify-center gap-3 p-4 rounded-2xl border-2 transition-all group ${authorized ? "border-[#4E593F] bg-[#4E593F]/5 text-[#4E593F]" : "border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200"}`}
          >
            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${authorized ? "border-[#4E593F]" : "border-slate-300 group-hover:border-slate-400"}`}>
              {authorized && <div className="w-3 h-3 rounded-full bg-[#4E593F] animate-in zoom-in-50" />}
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

        {/* Legal Text Section */}
        <div className="bg-slate-50 p-5 rounded-2xl border border-dashed border-slate-200">
          <p className="text-slate-600 prose-sm leading-relaxed">
            Autorizo a <span className="font-bold text-slate-800">Estância Tordilha</span>, empresa com sede na Estrada João Cecom, 2200 Altos da Bela Vista Indaiatuba SP inscrita no CNPJ sob o nº 21.601.404/0001-00 e suas empresas coligadas, a utilizar, de forma gratuita e por tempo indeterminado, a minha imagem e do meu(s) filho(s) <span className="font-bold text-slate-800 underline decoration-slate-200 underline-offset-4 decoration-2">{studentNames || "praticante(s) de Equoterapia"}</span>, para a utilização em materiais gráficos, mídia impressa, eletrônica (internet), que serão da Estância Tordilha e de suas empresas coligadas.
          </p>
        </div>

        <div className="pt-2 flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
          <span>Indaiatuba, SP</span>
          <span>{new Date().toLocaleDateString('pt-BR')}</span>
        </div>

        {onConfirm && (
          <button
            type="button"
            onClick={onConfirm}
            disabled={!isFormValid}
            className="w-full h-14 bg-[#4E593F] hover:bg-[#3E4732] text-white rounded-2xl font-bold text-lg shadow-lg shadow-[#4E593F]/30 flex items-center justify-center transition-all active:scale-[0.98] disabled:opacity-50 disabled:grayscale mt-2"
          >
            Confirmar Autorização
          </button>
        )}
      </div>
    </div>
  );
};
