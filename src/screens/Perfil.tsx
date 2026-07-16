import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"

interface PerfilProps {
  userEmail: string;
  userRole: string;
  temaEscuro: boolean;
  setTemaEscuro: (valor: boolean) => void;
}

export default function PerfilScreen({ userEmail, userRole, temaEscuro, setTemaEscuro }: PerfilProps) {
  
  const lidarComLogout = async () => {
    await supabase.auth.signOut();
  }

  return (
    <div className="p-4 pt-6 h-full bg-slate-50 dark:bg-slate-950 overflow-y-auto pb-24 transition-colors flex flex-col items-center justify-start">
      <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 w-full max-w-sm text-center animate-in fade-in zoom-in-95 duration-200">
        
        <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-4xl shadow-inner border border-slate-200 dark:border-slate-700">
          🧑‍💼
        </div>
        
        <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 truncate">{userEmail}</h2>
        
        <span className="inline-block mt-2 text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
          {userRole}
        </span>

        <div className="w-full h-px bg-slate-100 dark:bg-slate-800 my-6"></div>

        <div className="space-y-3">
          <Button 
            onClick={() => setTemaEscuro(!temaEscuro)} 
            className="w-full h-12 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl transition-colors"
          >
            {temaEscuro ? '☀️ Mudar para Modo Claro' : '🌙 Mudar para Modo Escuro'}
          </Button>
          
          <Button 
            onClick={lidarComLogout} 
            className="w-full h-12 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 font-bold rounded-xl transition-colors"
          >
            🚪 Sair da Conta
          </Button>
        </div>
      </div>
    </div>
  )
}