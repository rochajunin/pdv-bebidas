import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { XCircle, CheckCircle2, AlertTriangle } from "lucide-react"

// IMPORTAÇÃO DAS TELAS
import LoginScreen from "./screens/Login"
import PdvScreen from "./screens/CaixaMobile"
import EstoqueScreen from "./screens/Estoque"
import PainelScreen from "./screens/Painel"
import PerfilScreen from "./screens/Perfil"
import Rodape from "./components/layout/Rodape"

export type AlertType = { visivel: boolean; titulo: string; mensagem: string; tipo: 'erro' | 'aviso' | 'sucesso'; isConfirm?: boolean; onConfirm?: () => void; } | null;

export default function App() {
  const [session, setSession] = useState<any>(null)
  const [abaAtual, setAbaAtual] = useState<"pdv" | "estoque" | "painel" | "perfil">("pdv")
  const [alerta, setAlerta] = useState<AlertType>(null)

  const [temaEscuro, setTemaEscuro] = useState(() => {
    if (typeof window !== "undefined") return localStorage.getItem("tema") === "escuro"
    return false
  })

  useEffect(() => {
    if (temaEscuro) {
      document.documentElement.classList.add('dark')
      localStorage.setItem("tema", "escuro")
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem("tema", "claro")
    }
  }, [temaEscuro])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session))
    return () => subscription.unsubscribe()
  }, [])

  const mostrarAlerta = (titulo: string, mensagem: string, tipo: 'erro' | 'aviso' | 'sucesso' = 'aviso') => {
    setAlerta({ visivel: true, titulo, mensagem, tipo, isConfirm: false });
  }

  const mostrarConfirmacao = (titulo: string, mensagem: string, onConfirm: () => void) => {
    setAlerta({ visivel: true, titulo, mensagem, tipo: 'aviso', isConfirm: true, onConfirm });
  }

  if (!session) {
    return (
      <div className="relative flex flex-col h-[100dvh] bg-slate-100 dark:bg-slate-950 transition-colors">
        <LoginScreen setTemaEscuro={setTemaEscuro} temaEscuro={temaEscuro} mostrarAlerta={mostrarAlerta} />
        {alerta && alerta.visivel && <ModalAlerta alerta={alerta} setAlerta={setAlerta} />}
      </div>
    )
  }

  const userRole = session.user?.user_metadata?.role || "vendedor"
  const userEmail = session.user?.email || ""

  const renderizarTela = () => {
    switch (abaAtual) {
      case "pdv": return <PdvScreen userEmail={userEmail} mostrarAlerta={mostrarAlerta} />;
      case "estoque": return userRole === 'gerente' ? <EstoqueScreen mostrarAlerta={mostrarAlerta} mostrarConfirmacao={mostrarConfirmacao} /> : <AcessoNegado />;
      case "painel": return userRole === 'gerente' ? <PainelScreen /> : <AcessoNegado />;
      case "perfil": return <PerfilScreen userEmail={userEmail} userRole={userRole} temaEscuro={temaEscuro} setTemaEscuro={setTemaEscuro} />;
      default: return <PdvScreen userEmail={userEmail} mostrarAlerta={mostrarAlerta} />;
    }
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans overflow-hidden transition-colors">
      <main className="flex-1 overflow-y-auto relative">
        {renderizarTela()}
      </main>
      <Rodape abaAtual={abaAtual} setAbaAtual={setAbaAtual} userRole={userRole} />
      {alerta && alerta.visivel && <ModalAlerta alerta={alerta} setAlerta={setAlerta} />}
    </div>
  )
}

function AcessoNegado() {
  return <div className="h-full flex items-center justify-center p-6 text-center text-slate-500">Você não tem permissão para acessar esta área.</div>
}

function ModalAlerta({ alerta, setAlerta }: { alerta: any, setAlerta: any }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 transition-all">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-6 w-full max-w-sm flex flex-col items-center text-center animate-in zoom-in-95 border border-slate-200 dark:border-slate-800">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 shadow-inner ${alerta.tipo === 'erro' ? 'bg-red-100 dark:bg-red-900/30 text-red-600' : alerta.tipo === 'sucesso' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-600'}`}>
          {alerta.tipo === 'erro' ? <XCircle className="w-8 h-8" /> : alerta.tipo === 'sucesso' ? <CheckCircle2 className="w-8 h-8" /> : <AlertTriangle className="w-8 h-8" />}
        </div>
        <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 mb-2">{alerta.titulo}</h3>
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-8 whitespace-pre-line">{alerta.mensagem}</p>
        
        {alerta.isConfirm ? (
          <div className="flex gap-3 w-full">
            <Button onClick={() => setAlerta(null)} className="flex-1 h-12 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl transition-colors">Cancelar</Button>
            <Button onClick={alerta.onConfirm} className="flex-1 h-12 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-colors">Confirmar</Button>
          </div>
        ) : (
          <Button onClick={() => setAlerta(null)} className={`w-full h-12 text-white font-bold text-lg rounded-xl transition-colors ${alerta.tipo === 'erro' ? 'bg-red-500 hover:bg-red-600' : alerta.tipo === 'sucesso' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-amber-500 hover:bg-amber-600'}`}>OK, entendi</Button>
        )}
      </div>
    </div>
  )
}