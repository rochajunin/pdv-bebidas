import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sun, Moon, Lock } from "lucide-react"

interface LoginProps {
  temaEscuro: boolean;
  setTemaEscuro: (v: boolean) => void;
  mostrarAlerta: (titulo: string, mensagem: string, tipo: 'erro' | 'aviso' | 'sucesso') => void;
}

export default function Login({ temaEscuro, setTemaEscuro, mostrarAlerta }: LoginProps) {
  const [emailLogin, setEmailLogin] = useState("")
  const [senhaLogin, setSenhaLogin] = useState("")
  const [carregandoLogin, setCarregandoLogin] = useState(false)

  const lidarComLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!emailLogin || !senhaLogin) return
    try {
      setCarregandoLogin(true)
      const { error } = await supabase.auth.signInWithPassword({ email: emailLogin, password: senhaLogin })
      if (error) throw error
    } catch (error: any) { 
      mostrarAlerta("Erro de Autenticação", "Não foi possível fazer o login. Verifique seu e-mail e senha e tente novamente.", "erro");
    } finally { 
      setCarregandoLogin(false) 
    }
  }

  return (
    <div className="relative flex flex-col h-[100dvh] bg-slate-100 dark:bg-slate-950 items-center justify-center p-4 font-sans transition-colors">
      <button onClick={() => setTemaEscuro(!temaEscuro)} className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full bg-white dark:bg-slate-900 shadow-md border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800">
        {temaEscuro ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </button>
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 w-full max-w-sm text-left">
        <div className="text-center mb-6 flex flex-col items-center justify-center">
          <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-2 text-slate-800 dark:text-slate-200">
             <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100">PDV Login</h2>
        </div>
        <form onSubmit={lidarComLogin} className="space-y-4">
          <div className="text-left"><label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Email</label><Input type="email" value={emailLogin} onChange={(e) => setEmailLogin(e.target.value)} className="h-12 bg-slate-50 dark:bg-slate-950 dark:text-white dark:border-slate-800" /></div>
          <div className="text-left"><label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Senha</label><Input type="password" value={senhaLogin} onChange={(e) => setSenhaLogin(e.target.value)} className="h-12 bg-slate-50 dark:bg-slate-950 dark:text-white dark:border-slate-800" /></div>
          <Button type="submit" disabled={carregandoLogin} className="w-full h-12 bg-orange-500 hover:bg-orange-600 text-white font-bold text-base rounded-xl mt-4 transition-colors">{carregandoLogin ? "A autenticar..." : "Entrar no Sistema"}</Button>
        </form>
      </div>
    </div>
  )
}