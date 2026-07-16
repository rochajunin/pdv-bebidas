interface RodapeProps {
  abaAtual: "pdv" | "estoque" | "painel" | "perfil";
  setAbaAtual: (aba: "pdv" | "estoque" | "painel" | "perfil") => void;
  userRole: string;
}

export default function Rodape({ abaAtual, setAbaAtual, userRole }: RodapeProps) {
  return (
    <nav className="bg-white dark:bg-slate-900 border-t dark:border-slate-800 flex h-16 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.05)] z-30 transition-colors pb-safe">
      <button onClick={() => setAbaAtual('pdv')} className={`flex-1 flex flex-col items-center justify-center ${abaAtual === 'pdv' ? 'text-orange-500 dark:text-orange-400' : 'text-slate-400 dark:text-slate-500'}`}>
        <span className="text-xl mb-1">🛒</span><span className="text-[10px] font-bold uppercase tracking-wider">Vendas</span>
      </button>
      
      {userRole === 'gerente' && (
        <>
          <div className="w-[1px] bg-slate-100 dark:bg-slate-800 my-2"></div>
          <button onClick={() => setAbaAtual('estoque')} className={`flex-1 flex flex-col items-center justify-center ${abaAtual === 'estoque' ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400 dark:text-slate-500'}`}>
            <span className="text-xl mb-1">📦</span><span className="text-[10px] font-bold uppercase tracking-wider">Estoque</span>
          </button>
          
          <div className="w-[1px] bg-slate-100 dark:bg-slate-800 my-2"></div>
          <button onClick={() => setAbaAtual('painel')} className={`flex-1 flex flex-col items-center justify-center ${abaAtual === 'painel' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'}`}>
            <span className="text-xl mb-1">📊</span><span className="text-[10px] font-bold uppercase tracking-wider">Painel</span>
          </button>
        </>
      )}
      
      <div className="w-[1px] bg-slate-100 dark:bg-slate-800 my-2"></div>
      <button onClick={() => setAbaAtual('perfil')} className={`flex-1 flex flex-col items-center justify-center ${abaAtual === 'perfil' ? 'text-purple-500 dark:text-purple-400' : 'text-slate-400 dark:text-slate-500'}`}>
        <span className="text-xl mb-1">👤</span><span className="text-[10px] font-bold uppercase tracking-wider">Perfil</span>
      </button>
    </nav>
  )
}