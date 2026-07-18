import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { User, Mail, Briefcase, Moon, Sun, LogOut } from "lucide-react"

interface PerfilProps {
  userEmail: string;
  userRole: string;
  temaEscuro: boolean;
  setTemaEscuro: (v: boolean) => void;
}

export default function Perfil({ userEmail, userRole, temaEscuro, setTemaEscuro }: PerfilProps) {
  const lidarComLogout = async () => {
    await supabase.auth.signOut()
  }

  return (
    <div className="p-4 pt-6 h-full bg-slate-50 dark:bg-slate-950 overflow-y-auto pb-24 transition-colors">
      
      {/* Cabeçalho do Perfil */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 text-center mb-6">
        <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400 dark:text-slate-500 shadow-inner">
          <User className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100">Meu Perfil</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Gerencie sua conta e preferências</p>
      </div>

      {/* Informações do Usuário */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 p-2 mb-6 space-y-1">
        <div className="flex items-center gap-4 p-4 rounded-2xl">
          <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-500"><Mail className="w-5 h-5" /></div>
          <div className="flex-1 text-left"><p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">E-mail</p><p className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">{userEmail}</p></div>
        </div>
        <div className="w-full h-[1px] bg-slate-100 dark:bg-slate-800/50"></div>
        <div className="flex items-center gap-4 p-4 rounded-2xl">
          <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-500"><Briefcase className="w-5 h-5" /></div>
          <div className="flex-1 text-left"><p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">Cargo</p><p className="text-sm font-semibold text-slate-700 dark:text-slate-200 capitalize">{userRole}</p></div>
        </div>
      </div>

      {/* Configurações (Tema Escuro) */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 p-2 mb-6">
        <button onClick={() => setTemaEscuro(!temaEscuro)} className="w-full flex items-center justify-between p-4 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center text-amber-500">{temaEscuro ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}</div>
            <div className="text-left"><p className="text-sm font-bold text-slate-700 dark:text-slate-200">Tema do Sistema</p><p className="text-xs font-medium text-slate-400">{temaEscuro ? 'Modo Escuro ativado' : 'Modo Claro ativado'}</p></div>
          </div>
          {/* Botão Switch estilo iOS */}
          <div className={`w-12 h-6 rounded-full transition-colors flex items-center px-1 ${temaEscuro ? 'bg-orange-500 justify-end' : 'bg-slate-200 dark:bg-slate-700 justify-start'}`}><div className="w-4 h-4 bg-white rounded-full shadow-sm"></div></div>
        </button>
      </div>

      {/* Botão de Sair */}
      <Button onClick={lidarComLogout} variant="ghost" className="w-full h-14 bg-red-50 hover:bg-red-100 dark:bg-red-900/10 dark:hover:bg-red-900/20 text-red-600 hover:text-red-700 dark:text-red-500 font-bold text-base rounded-2xl transition-colors flex items-center justify-center gap-2">
        <LogOut className="w-5 h-5" /> Sair do Sistema
      </Button>
      
    </div>
  )
}