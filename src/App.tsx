import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface Produto {
  id: number
  nome: string
  preco: number
  preco_custo: number
  categoria: string
}

interface ItemCarrinho {
  produto: Produto
  quantidade: number | string
}

interface Cliente {
  id: string
  nome: string
  telefone: string
}

export default function App() {
  const [session, setSession] = useState<any>(null)
  const [emailLogin, setEmailLogin] = useState("")
  const [senhaLogin, setSenhaLogin] = useState("")
  const [carregandoLogin, setCarregandoLogin] = useState(false)

  const [abaAtual, setAbaAtual] = useState<"pdv" | "estoque" | "painel">("pdv")

  const [temaEscuro, setTemaEscuro] = useState(() => {
    if (typeof window !== "undefined") return localStorage.getItem("tema") === "escuro"
    return false
  })

  const [produtos, setProdutos] = useState<Produto[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([])
  const [busca, setBusca] = useState("")
  const [mostrarResultados, setMostrarResultados] = useState(false)
  const [mostrarClientes, setMostrarClientes] = useState(false)
  const [mostrarCategorias, setMostrarCategorias] = useState(false)
  const [carregandoDados, setCarregandoDados] = useState(true)

  // Estados do Estoque
  const [nomeForm, setNomeForm] = useState("")
  const [precoForm, setPrecoForm] = useState("")
  const [precoCustoForm, setPrecoCustoForm] = useState("")
  const [categoriaForm, setCategoriaForm] = useState("")
  const [salvandoForm, setSalvandoForm] = useState(false)
  const [idEditando, setIdEditando] = useState<number | null>(null)

  // Estado do Cliente na Venda
  const [nomeClientePDV, setNomeClientePDV] = useState("")
  const [salvandoVenda, setSalvandoVenda] = useState(false)

  // Estados do Modal
  const [vendaSucesso, setVendaSucesso] = useState(false)
  const [totalVendaSucesso, setTotalVendaSucesso] = useState(0)

  // ESTADOS DO PAINEL DE RELATÓRIOS
  const [filtroData, setFiltroData] = useState<"hoje" | "7dias" | "mes" | "personalizado">("hoje")
  const [carregandoRelatorio, setCarregandoRelatorio] = useState(false)
  const [mostrarMaisFiltros, setMostrarMaisFiltros] = useState(false)
  const [triggerFiltro, setTriggerFiltro] = useState(0) // Usado para forçar a busca customizada
  const [mostrarResultadosPainel, setMostrarResultadosPainel] = useState(false)
  
  // Estado dos formulários de filtro avançado
  const [formFiltros, setFormFiltros] = useState({
    dataInicial: "",
    dataFinal: "",
    clienteId: "",
    valorMin: "",
    valorMax: "",
    produtoId: ""
  })

  const [dadosRelatorio, setDadosRelatorio] = useState({
    faturamento: 0, lucro: 0, qtdVendas: 0, ticketMedio: 0, margem: 0,
    topProdutos: [] as { nome: string; quantidade: number; receita: number; maxQtd: number }[]
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

  // Carregar dados base
  useEffect(() => {
    if (!session) return
    async function buscarDados() {
      try {
        setCarregandoDados(true)
        const { data: dataProd } = await supabase.from('Produtos').select('*').order('nome', { ascending: true })
        if (dataProd) setProdutos(dataProd)
        const { data: dataCli } = await supabase.from('Clientes').select('*').order('nome', { ascending: true })
        if (dataCli) setClientes(dataCli)
      } catch (error) {
        console.error("Erro ao buscar dados:", error)
      } finally {
        setCarregandoDados(false)
      }
    }
    buscarDados()
  }, [session])

  // LÓGICA DE GERAÇÃO DO RELATÓRIO
  useEffect(() => {
    if (!session || abaAtual !== 'painel') return

    async function gerarRelatorio() {
      setCarregandoRelatorio(true)
      try {
        let query = supabase.from('Vendas').select('*, Itens_Venda(*)')

        if (filtroData === "personalizado") {
          // Filtros Personalizados
          if (formFiltros.dataInicial) query = query.gte('created_at', formFiltros.dataInicial + 'T00:00:00-03:00')
          if (formFiltros.dataFinal) query = query.lte('created_at', formFiltros.dataFinal + 'T23:59:59-03:00')
          if (formFiltros.clienteId) query = query.eq('cliente_id', formFiltros.clienteId)
          if (formFiltros.valorMin) query = query.gte('total', formFiltros.valorMin)
          if (formFiltros.valorMax) query = query.lte('total', formFiltros.valorMax)
        } else {
          // Filtros Rápidos
          const dataCorte = new Date()
          dataCorte.setHours(0, 0, 0, 0)
          if (filtroData === "7dias") dataCorte.setDate(dataCorte.getDate() - 7)
          else if (filtroData === "mes") dataCorte.setDate(1)
          query = query.gte('created_at', dataCorte.toISOString())
        }

        const { data: vendas, error } = await query
        if (error) throw error

        let faturamentoTotal = 0
        let lucroTotal = 0
        let qtdVendasValidas = 0
        let produtosVendidos: Record<string, { quantidade: number, receita: number }> = {}

        vendas?.forEach(venda => {
          const itensDaVenda = venda.Itens_Venda || []
          
          // Se o usuário selecionou um produto específico, filtramos os itens desta venda
          const itensFiltrados = formFiltros.produtoId 
            ? itensDaVenda.filter((i: any) => i.produto_id.toString() === formFiltros.produtoId)
            : itensDaVenda

          // Se a venda não contém o produto filtrado, ignora essa venda
          if (formFiltros.produtoId && itensFiltrados.length === 0) return

          let faturamentoDestaVenda = 0
          let lucroDestaVenda = 0

          itensFiltrados.forEach((item: any) => {
            const pv = Number(item.preco_venda)
            const pc = Number(item.preco_custo)
            const qtd = Number(item.quantidade)

            faturamentoDestaVenda += (pv * qtd)
            lucroDestaVenda += ((pv - pc) * qtd)

            if (!produtosVendidos[item.nome_produto]) {
              produtosVendidos[item.nome_produto] = { quantidade: 0, receita: 0 }
            }
            produtosVendidos[item.nome_produto].quantidade += qtd
            produtosVendidos[item.nome_produto].receita += (pv * qtd)
          })

          // Se não há filtro de produto, usa o total do banco de dados da venda inteira
          const faturamentoFinal = formFiltros.produtoId ? faturamentoDestaVenda : Number(venda.total)
          
          faturamentoTotal += faturamentoFinal
          lucroTotal += lucroDestaVenda
          qtdVendasValidas++
        })

        const ticketMedio = qtdVendasValidas > 0 ? faturamentoTotal / qtdVendasValidas : 0
        const margem = faturamentoTotal > 0 ? (lucroTotal / faturamentoTotal) * 100 : 0

        let arrayTopProdutos = Object.entries(produtosVendidos)
          .map(([nome, dados]) => ({ nome, ...dados }))
          .sort((a, b) => b.quantidade - a.quantidade)
          .slice(0, 5)

        const maxQtd = arrayTopProdutos.length > 0 ? Math.max(...arrayTopProdutos.map(p => p.quantidade)) : 1
        
        setDadosRelatorio({
          faturamento: faturamentoTotal,
          lucro: lucroTotal,
          qtdVendas: qtdVendasValidas,
          ticketMedio,
          margem,
          topProdutos: arrayTopProdutos.map(p => ({ ...p, maxQtd }))
        })

      } catch (error) {
        console.error("Erro ao gerar relatório:", error)
      } finally {
        setCarregandoRelatorio(false)
      }
    }
    
    gerarRelatorio()
  }, [session, abaAtual, filtroData, triggerFiltro])

  const userRole = session?.user?.user_metadata?.role || "operador"
  const userEmail = session?.user?.email || ""
  const categoriasExistentes = Array.from(new Set(produtos.map(p => p.categoria)))
  const categoriasFiltradas = categoriasExistentes.filter(cat => cat.toLowerCase().includes(categoriaForm.toLowerCase()))

  const aplicarFiltrosPersonalizados = () => {
    setFiltroData("personalizado")
    setTriggerFiltro(prev => prev + 1)
  }

  const limparFiltrosPersonalizados = () => {
    setFormFiltros({ dataInicial: "", dataFinal: "", clienteId: "", valorMin: "", valorMax: "", produtoId: "" })
    setFiltroData("hoje")
  }

  /* --- LÓGICA DE LOGIN & LOGOUT --- */
  const lidarComLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!emailLogin || !senhaLogin) return
    try {
      setCarregandoLogin(true)
      const { error } = await supabase.auth.signInWithPassword({ email: emailLogin, password: senhaLogin })
      if (error) throw error
    } catch (error: any) {
      alert("Erro no login: Verifique as credenciais.")
    } finally {
      setCarregandoLogin(false)
    }
  }

  const lidarComLogout = async () => {
    await supabase.auth.signOut()
    setCarrinho([])
    setAbaAtual("pdv")
  }

  /* --- LÓGICA DO PDV --- */
  const produtosFiltrados = produtos.filter(produto => produto.nome.toLowerCase().includes(busca.toLowerCase()) || produto.id.toString() === busca.toLowerCase())
  const clientesFiltrados = clientes.filter(cliente => cliente.nome.toLowerCase().includes(nomeClientePDV.toLowerCase()))

  const adicionarAoCarrinho = (produto: Produto) => {
    setCarrinho(prev => {
      const itemExistente = prev.find(item => item.produto.id === produto.id)
      if (itemExistente) return prev.map(item => item.produto.id === produto.id ? { ...item, quantidade: Number(item.quantidade) + 1 } : item)
      return [{ produto, quantidade: 1 }, ...prev]
    })
    setBusca(""); setMostrarResultados(false)
  }

  const alterarQuantidade = (id: number, novaQuantidade: number | string) => {
    if (novaQuantidade === 0 || novaQuantidade === "0") return setCarrinho(prev => prev.filter(item => item.produto.id !== id))
    setCarrinho(prev => prev.map(item => {
      if (item.produto.id === id) {
        if (novaQuantidade === "") return { ...item, quantidade: "" }
        const qtdNumerica = Number(novaQuantidade)
        if (qtdNumerica < 0 || isNaN(qtdNumerica)) return item
        return { ...item, quantidade: qtdNumerica }
      }
      return item
    }))
  }

  const validarQuantidadeFinal = (id: number) => {
    setCarrinho(prev => prev.map(item => (item.produto.id === id && (item.quantidade === "" || isNaN(Number(item.quantidade)))) ? { ...item, quantidade: 1 } : item))
  }

  const totalVenda = carrinho.reduce((acc, item) => acc + (item.produto.preco * (typeof item.quantidade === 'number' ? item.quantidade : 0)), 0)

  const finalizarVenda = async () => {
    if (carrinho.length === 0) return
    setSalvandoVenda(true)
    try {
      let clienteIdFinal = null
      if (nomeClientePDV.trim()) {
        const nomeFormatado = nomeClientePDV.trim()
        const clienteExistente = clientes.find(c => c.nome.toLowerCase() === nomeFormatado.toLowerCase())
        if (clienteExistente) {
          clienteIdFinal = clienteExistente.id
        } else {
          const { data: novoCliente, error: erroCliente } = await supabase.from('Clientes').insert([{ nome: nomeFormatado }]).select()
          if (!erroCliente && novoCliente) {
            clienteIdFinal = novoCliente[0].id
            setClientes(prev => [...prev, novoCliente[0]].sort((a, b) => a.nome.localeCompare(b.nome)))
          }
        }
      }

      const { data: vendaData, error: vendaError } = await supabase.from('Vendas').insert([{ total: totalVenda, vendedor_email: userEmail, cliente_id: clienteIdFinal }]).select()
      if (vendaError) throw vendaError
      const idDaVenda = vendaData[0].id

      const itensParaSalvar = carrinho.map(item => ({
        venda_id: idDaVenda, produto_id: item.produto.id, nome_produto: item.produto.nome,
        quantidade: Number(item.quantidade), preco_venda: item.produto.preco, preco_custo: item.produto.preco_custo || 0
      }))

      const { error: itensError } = await supabase.from('Itens_Venda').insert(itensParaSalvar)
      if (itensError) throw itensError

      setTotalVendaSucesso(totalVenda)
      setVendaSucesso(true)
      setCarrinho([])
      setNomeClientePDV("")
    } catch (error) {
      alert("Ocorreu um erro ao registrar a venda.")
    } finally {
      setSalvandoVenda(false)
    }
  }

  /* --- LÓGICA DO ESTOQUE --- */
  const salvarProduto = async (e: React.FormEvent) => {
    e.preventDefault()
    if (userRole !== "gerente") return
    setSalvandoForm(true)
    const precoNumerico = parseFloat(precoForm.toString().replace(',', '.'))
    const precoCustoNumerico = precoCustoForm ? parseFloat(precoCustoForm.toString().replace(',', '.')) : 0
    const payload = { nome: nomeForm, preco: precoNumerico, preco_custo: precoCustoNumerico, categoria: categoriaForm }

    if (idEditando) {
      const { data } = await supabase.from('Produtos').update(payload).eq('id', idEditando).select()
      if (data) setProdutos(prev => prev.map(p => p.id === idEditando ? data[0] : p).sort((a, b) => a.nome.localeCompare(b.nome)))
    } else {
      const { data } = await supabase.from('Produtos').insert([payload]).select()
      if (data) setProdutos(prev => [...prev, data[0]].sort((a, b) => a.nome.localeCompare(b.nome)))
    }
    setSalvandoForm(false)
    cancelarEdicao()
  }

  const iniciarEdicao = (produto: Produto) => {
    setIdEditando(produto.id); setNomeForm(produto.nome); setPrecoForm(produto.preco.toString());
    setPrecoCustoForm(produto.preco_custo ? produto.preco_custo.toString() : "0"); setCategoriaForm(produto.categoria)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const cancelarEdicao = () => { setIdEditando(null); setNomeForm(""); setPrecoForm(""); setPrecoCustoForm(""); setCategoriaForm("") }
  const excluirProduto = async (id: number, nome: string) => {
    if (userRole !== "gerente" || !window.confirm(`Excluir "${nome}"?`)) return
    const { error } = await supabase.from('Produtos').delete().eq('id', id)
    if (!error) setProdutos(prev => prev.filter(p => p.id !== id))
  }

  /* --- TELAS --- */
  if (!session) {
    return (
      <div className="relative flex flex-col h-[100dvh] bg-slate-100 dark:bg-slate-950 items-center justify-center p-4 font-sans transition-colors">
        <button onClick={() => setTemaEscuro(!temaEscuro)} className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full bg-white dark:bg-slate-900 shadow-md border border-slate-200 dark:border-slate-800 text-lg transition-colors hover:bg-slate-50 dark:hover:bg-slate-800">
          {temaEscuro ? '☀️' : '🌙'}
        </button>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 w-full max-w-sm text-left">
          <div className="text-center mb-6">
            <span className="text-4xl">🔐</span>
            <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-2">PDV Login</h2>
          </div>
          <form onSubmit={lidarComLogin} className="space-y-4">
            <div className="text-left">
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Email</label>
              <Input type="email" value={emailLogin} onChange={(e) => setEmailLogin(e.target.value)} className="h-12 bg-slate-50 dark:bg-slate-950 dark:text-white dark:border-slate-800" />
            </div>
            <div className="text-left">
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Senha</label>
              <Input type="password" value={senhaLogin} onChange={(e) => setSenhaLogin(e.target.value)} className="h-12 bg-slate-50 dark:bg-slate-950 dark:text-white dark:border-slate-800" />
            </div>
            <Button type="submit" disabled={carregandoLogin} className="w-full h-12 bg-orange-500 hover:bg-orange-600 text-white font-bold text-base rounded-xl mt-4 transition-colors">
              {carregandoLogin ? "A autenticar..." : "Entrar no Sistema"}
            </Button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans overflow-hidden transition-colors" onClick={() => { setMostrarResultados(false); setMostrarClientes(false); setMostrarCategorias(false); }}>
      
      <header className={`px-4 py-3 flex justify-between items-center shadow-md z-20 transition-colors ${abaAtual === 'pdv' ? 'bg-orange-500 dark:bg-orange-600' : 'bg-slate-800 dark:bg-slate-900'}`}>
        <div className="flex flex-col text-left">
          <h1 className="text-base font-bold text-white leading-none">{abaAtual === 'pdv' ? 'PDV Mobile' : abaAtual === 'estoque' ? 'Gestão de Estoque' : 'Painel de Controle'}</h1>
          <span className="text-[10px] text-orange-50 mt-1 truncate max-w-[180px]">{userEmail}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full ${abaAtual === 'pdv' ? 'text-orange-100 bg-orange-700/50' : 'text-slate-100 bg-slate-700'}`}>{userRole}</span>
          <button onClick={() => setTemaEscuro(!temaEscuro)} className="p-1.5 rounded-lg text-sm bg-black/10 hover:bg-black/20 text-white transition-colors">{temaEscuro ? '☀️' : '🌙'}</button>
          <button onClick={lidarComLogout} className="text-white bg-red-700/50 hover:bg-red-700/70 p-1.5 rounded-lg text-xs font-bold transition-colors">Sair</button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto relative">
        
        {/* TELA 1: PDV */}
        {abaAtual === 'pdv' && (
          <div className="flex flex-col h-full">
            <div className="bg-white dark:bg-slate-900 p-3 shadow-sm z-20 relative border-b dark:border-slate-800 transition-colors" onClick={(e) => e.stopPropagation()}>
              <Input type="text" placeholder="Código ou nome..." value={busca} onChange={(e) => setBusca(e.target.value)} onFocus={() => setMostrarResultados(true)} className="h-12 text-base bg-slate-50 dark:bg-slate-950 dark:text-white dark:border-slate-800" />
              {mostrarResultados && (
                <div className="absolute top-full mt-1 left-3 right-3 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 max-h-60 overflow-y-auto z-30 text-left transition-colors">
                  {produtosFiltrados.length === 0 ? (
                    <div className="p-4 text-center text-slate-500 dark:text-slate-400 text-sm">Nenhum produto encontrado.</div>
                  ) : (
                    produtosFiltrados.map(produto => (
                      <div key={produto.id} onClick={() => adicionarAoCarrinho(produto)} className="p-3 border-b dark:border-slate-700 active:bg-slate-100 dark:active:bg-slate-700 flex justify-between items-center text-left cursor-pointer transition-colors">
                        <div className="flex flex-col flex-1 min-w-0 pr-2 text-left">
                          <span className="font-semibold text-slate-800 dark:text-slate-100 break-words">{produto.nome}</span>
                          <span className="text-xs text-slate-400 dark:text-slate-500">ID: {produto.id} • {produto.categoria}</span>
                        </div>
                        <span className="font-bold text-orange-500 dark:text-orange-400 whitespace-nowrap">R$ {produto.preco.toFixed(2)}</span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-44">
              {carregandoDados ? (
                <div className="h-full flex items-center justify-center text-slate-400 text-sm">Sincronizando...</div>
              ) : carrinho.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 opacity-50"><p>Carrinho vazio</p></div>
              ) : (
                carrinho.map(item => (
                  <div key={item.produto.id} className="bg-white dark:bg-slate-900 p-3 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col gap-3 text-left transition-colors">
                    <div className="flex justify-between items-start w-full gap-2">
                      <span className="font-bold text-slate-700 dark:text-slate-200 flex-1 pr-2 break-words">{item.produto.nome}</span>
                      <span className="font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">R$ {(item.produto.preco * (Number(item.quantidade) || 0)).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center w-full">
                      <span className="text-xs text-slate-400 dark:text-slate-500">R$ {item.produto.preco.toFixed(2)} / un</span>
                      <div className="flex items-center border dark:border-slate-700 rounded-lg overflow-hidden bg-slate-50 dark:bg-slate-800 transition-colors">
                        <button onClick={() => alterarQuantidade(item.produto.id, Number(item.quantidade) - 1)} className="w-10 h-10 border-r dark:border-slate-700 text-lg dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">{'-'}</button>
                        <input type="number" value={item.quantidade} onChange={(e) => alterarQuantidade(item.produto.id, e.target.value)} onBlur={() => validarQuantidadeFinal(item.produto.id)} className="w-14 h-10 text-center font-bold bg-transparent dark:text-white" />
                        <button onClick={() => alterarQuantidade(item.produto.id, Number(item.quantidade) + 1)} className="w-10 h-10 border-l dark:border-slate-700 text-lg dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">+</button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-slate-900 p-4 border-t dark:border-slate-800 shadow-[0_-4px_10px_-5px_rgba(0,0,0,0.1)] z-20 transition-colors" onClick={(e) => e.stopPropagation()}>
              <div className="mb-3 text-left relative">
                <Input placeholder="Nome do Cliente (Opcional)" value={nomeClientePDV} onChange={(e) => { setNomeClientePDV(e.target.value); setMostrarClientes(true) }} onFocus={() => setMostrarClientes(true)} className="h-10 bg-slate-50 dark:bg-slate-950 dark:text-white dark:border-slate-800" />
                {mostrarClientes && (
                  <div className="absolute bottom-full mb-1 left-0 right-0 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 max-h-44 overflow-y-auto z-30 text-left transition-colors">
                    {clientesFiltrados.length === 0 ? (
                      <div className="p-3 text-center text-slate-400 dark:text-slate-500 text-xs italic">"{nomeClientePDV}" não encontrado. Será cadastrado!</div>
                    ) : (
                      clientesFiltrados.map(cli => (
                        <div key={cli.id} onClick={() => { setNomeClientePDV(cli.nome); setMostrarClientes(false) }} className="p-3 border-b dark:border-slate-700 last:border-b-0 active:bg-slate-100 dark:active:bg-slate-700 flex justify-between items-center cursor-pointer transition-colors">
                          <span className="font-semibold text-slate-700 dark:text-slate-200 text-sm">{cli.nome}</span>
                          <span className="text-[9px] bg-slate-100 dark:bg-slate-900 text-slate-400 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Registrado</span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
              <div className="flex justify-between items-center mb-3">
                <span className="font-semibold text-slate-500 dark:text-slate-400">Total a Pagar</span>
                <span className="text-2xl font-black text-orange-500 dark:text-orange-400">R$ {totalVenda.toFixed(2)}</span>
              </div>
              <Button className="w-full h-12 bg-orange-500 hover:bg-orange-600 text-white font-bold text-lg rounded-xl transition-colors" disabled={carrinho.length === 0 || salvandoVenda} onClick={finalizarVenda}>
                {salvandoVenda ? "Registrando..." : "Finalizar Venda"}
              </Button>
            </div>
          </div>
        )}

        {/* TELA 2: ESTOQUE */}
        {abaAtual === 'estoque' && userRole === 'gerente' && (
          <div className="p-4 h-full bg-slate-50 dark:bg-slate-950 overflow-y-auto pb-24 text-left transition-colors" onClick={(e) => e.stopPropagation()}>
            <div className={`bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border transition-colors text-left ${idEditando ? 'border-amber-400 dark:border-amber-500 ring-4 ring-amber-50 dark:ring-amber-900/30' : 'border-slate-200 dark:border-slate-800'}`}>
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4 text-left">{idEditando ? '✏️ Editando Produto' : '📦 Novo Produto'}</h2>
              <form onSubmit={salvarProduto} className="space-y-4 text-left">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nome da Bebida</label>
                  <Input placeholder="Ex: Suco de Laranja 1L" value={nomeForm} onChange={(e) => setNomeForm(e.target.value)} className="h-12 bg-slate-50 dark:bg-slate-950 dark:border-slate-800 dark:text-white" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Custo (R$)</label>
                    <Input placeholder="0,00" inputMode="decimal" value={precoCustoForm} onChange={(e) => setPrecoCustoForm(e.target.value)} className="h-12 bg-slate-50 dark:bg-slate-950 border-amber-200 dark:border-amber-900/50 dark:text-white focus-visible:ring-amber-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Venda (R$)</label>
                    <Input placeholder="0,00" inputMode="decimal" value={precoForm} onChange={(e) => setPrecoForm(e.target.value)} className="h-12 bg-slate-50 dark:bg-slate-950 border-orange-200 dark:border-orange-900/50 dark:text-white focus-visible:ring-orange-500" />
                  </div>
                </div>
                <div className="text-left relative">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 text-left">Categoria</label>
                  <Input placeholder="Ex: Cervejas" value={categoriaForm} onChange={(e) => { setCategoriaForm(e.target.value); setMostrarCategorias(true) }} onFocus={() => setMostrarCategorias(true)} className="h-12 bg-slate-50 dark:bg-slate-950 dark:border-slate-800 dark:text-white" />
                  {mostrarCategorias && (
                    <div className="absolute top-full mt-1 left-0 right-0 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 max-h-44 overflow-y-auto z-30 text-left transition-colors">
                      {categoriasFiltradas.length === 0 ? (
                        <div className="p-3 text-center text-slate-400 dark:text-slate-500 text-xs italic">"{categoriaForm}" é uma categoria nova!</div>
                      ) : (
                        categoriasFiltradas.map(cat => (
                          <div key={cat} onClick={() => { setCategoriaForm(cat); setMostrarCategorias(false) }} className="p-3 border-b dark:border-slate-700 last:border-b-0 active:bg-slate-100 dark:active:bg-slate-700 flex justify-between items-center cursor-pointer transition-colors">
                            <span className="font-semibold text-slate-700 dark:text-slate-200 text-sm">{cat}</span>
                            <span className="text-[9px] bg-slate-100 dark:bg-slate-900 text-slate-400 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Salva</span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
                <div className="flex gap-3 mt-6">
                  {idEditando && <Button type="button" onClick={cancelarEdicao} className="flex-1 h-12 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl transition-colors">Cancelar</Button>}
                  <Button type="submit" disabled={salvandoForm} className={`flex-[2] h-12 text-white font-bold text-lg rounded-xl transition-colors ${idEditando ? 'bg-amber-500 hover:bg-amber-600' : 'bg-slate-800 dark:bg-orange-600 hover:bg-slate-900 dark:hover:bg-orange-700'}`}>{salvandoForm ? 'A guardar...' : (idEditando ? 'Atualizar Produto' : 'Salvar Produto')}</Button>
                </div>
              </form>
            </div>

            <div className="mt-8 text-left">
              <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-3">Produtos Cadastrados ({produtos.length})</h3>
              <div className="space-y-3">
                {produtos.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-4">Nenhum produto cadastrado.</p>
                ) : (
                  produtos.map(produto => (
                    <div key={produto.id} className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex justify-between items-center shadow-sm transition-colors">
                      <div className="flex flex-col flex-1 min-w-0 pr-2">
                        <span className="font-bold text-slate-800 dark:text-slate-200 break-words">{produto.nome}</span>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1">
                          <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[10px] uppercase font-bold">{produto.categoria}</span>
                          <span className="text-orange-600 dark:text-orange-400 font-semibold">V: R$ {produto.preco.toFixed(2)}</span>
                          <span className="text-amber-600 dark:text-amber-500 font-semibold border-l dark:border-slate-700 pl-2">C: R$ {produto.preco_custo?.toFixed(2) || '0.00'}</span>
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button onClick={() => iniciarEdicao(produto)} className="w-8 h-8 flex items-center justify-center bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-lg transition-colors">✏️</button>
                        <button onClick={() => excluirProduto(produto.id, produto.nome)} className="w-8 h-8 flex items-center justify-center bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg transition-colors">🗑️</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* TELA 3: PAINEL DE RELATÓRIOS COM FILTROS AVANÇADOS */}
        {abaAtual === 'painel' && userRole === 'gerente' && (
          <div className="p-4 h-full bg-slate-50 dark:bg-slate-950 overflow-y-auto pb-24 transition-colors">
            
            {/* Controles Rápidos de Data */}
            <div className="flex bg-white dark:bg-slate-900 p-1 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 mb-3">
              <button onClick={() => setFiltroData('hoje')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${filtroData === 'hoje' ? 'bg-orange-500 text-white shadow' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>Hoje</button>
              <button onClick={() => setFiltroData('7dias')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${filtroData === '7dias' ? 'bg-orange-500 text-white shadow' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>7 Dias</button>
              <button onClick={() => setFiltroData('mes')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${filtroData === 'mes' ? 'bg-orange-500 text-white shadow' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>Este Mês</button>
            </div>

            {/* Botão para Expandir "Mais Filtros" */}
            <button 
              onClick={() => setMostrarMaisFiltros(!mostrarMaisFiltros)}
              className="w-full mb-6 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-transparent border-none outline-none py-2 hover:text-orange-500 transition-colors"
            >
              {mostrarMaisFiltros ? "Esconder Filtros ▲" : "Mais Filtros ▼"}
            </button>

            {/* Formulário de Filtros Avançados */}
            {mostrarMaisFiltros && (
              <div className="bg-white dark:bg-slate-900 p-4 rounded-xl mb-6 shadow-sm border border-slate-200 dark:border-slate-800 space-y-4 text-left animate-in slide-in-from-top-2 duration-300">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400">Data Inicial</label>
                    <Input type="date" value={formFiltros.dataInicial} onChange={e => setFormFiltros({...formFiltros, dataInicial: e.target.value})} className="h-10 mt-1 text-sm bg-slate-50 dark:bg-slate-950 dark:text-white dark:border-slate-800" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400">Data Final</label>
                    <Input type="date" value={formFiltros.dataFinal} onChange={e => setFormFiltros({...formFiltros, dataFinal: e.target.value})} className="h-10 mt-1 text-sm bg-slate-50 dark:bg-slate-950 dark:text-white dark:border-slate-800" />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400">Cliente Específico</label>
                  <select 
                    className="w-full h-10 mt-1 px-3 text-sm rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    value={formFiltros.clienteId} 
                    onChange={e => setFormFiltros({...formFiltros, clienteId: e.target.value})}
                  >
                    <option value="">Todos os clientes</option>
                    {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400">Valor Mín. (R$)</label>
                    <Input type="number" placeholder="0.00" value={formFiltros.valorMin} onChange={e => setFormFiltros({...formFiltros, valorMin: e.target.value})} className="h-10 mt-1 text-sm bg-slate-50 dark:bg-slate-950 dark:text-white dark:border-slate-800" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400">Valor Máx. (R$)</label>
                    <Input type="number" placeholder="999.00" value={formFiltros.valorMax} onChange={e => setFormFiltros({...formFiltros, valorMax: e.target.value})} className="h-10 mt-1 text-sm bg-slate-50 dark:bg-slate-950 dark:text-white dark:border-slate-800" />
                  </div>
                </div>

                
                <div className="text-left relative">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400">Produto Específico</label>
                  <Input 
                    placeholder="Digite para buscar produto..." 
                    value={formFiltros.produtoId ? produtos.find(p => p.id.toString() === formFiltros.produtoId)?.nome || "" : ""}
                    onChange={(e) => {
                        setBusca(e.target.value); // Atualiza o busca geral para o filtro funcionar
                        if (e.target.value === "") setFormFiltros({...formFiltros, produtoId: ""});
                    }}
                    onFocus={() => setMostrarResultadosPainel(true)}
                    className="h-10 mt-1 text-sm bg-slate-50 dark:bg-slate-950 dark:text-white dark:border-slate-800" 
                  />
                  
                  {mostrarResultadosPainel && (
                    <div className="absolute top-full mt-1 left-0 right-0 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 max-h-44 overflow-y-auto z-50 text-left">
                      {produtosFiltrados.length === 0 ? (
                        <div className="p-3 text-center text-slate-400 text-xs italic">Nenhum produto encontrado.</div>
                      ) : (
                        produtosFiltrados.map(p => (
                          <div 
                            key={p.id} 
                            onClick={() => {
                              setFormFiltros({...formFiltros, produtoId: p.id.toString()});
                              setMostrarResultadosPainel(false);
                              setBusca(""); // Limpa o campo de busca após selecionar
                              setMostrarResultadosPainel(false);
                            }} 
                            className="p-3 border-b dark:border-slate-700 last:border-b-0 active:bg-slate-100 dark:active:bg-slate-700 flex justify-between items-center cursor-pointer transition-colors"
                          >
                            <span className="font-semibold text-slate-700 dark:text-slate-200 text-sm">{p.nome}</span>
                            <span className="text-[9px] bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">ID: {p.id}</span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-2">
                  <Button onClick={limparFiltrosPersonalizados} className="flex-1 h-10 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-lg hover:bg-slate-300 dark:hover:bg-slate-700">Limpar</Button>
                  <Button onClick={aplicarFiltrosPersonalizados} className="flex-[2] h-10 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg">Aplicar Filtros</Button>
                </div>
              </div>
            )}

            {/* Exibição dos Dados */}
            {carregandoRelatorio ? (
              <div className="flex flex-col items-center justify-center h-40 text-slate-400">
                <span className="text-2xl mb-2 animate-spin">⏳</span>
                <p className="text-sm font-medium">Calculando métricas...</p>
              </div>
            ) : (
              <div className="space-y-6 animate-in fade-in duration-300 text-left">
                
                {/* Cards de Métricas */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 text-left">
                    <span className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Faturamento</span>
                    <span className="text-xl font-black text-slate-800 dark:text-slate-100">R$ {dadosRelatorio.faturamento.toFixed(2)}</span>
                  </div>
                  
                  <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-emerald-200 dark:border-emerald-900/30 text-left">
                    <span className="block text-xs font-bold text-emerald-600 dark:text-emerald-500 uppercase mb-1">Lucro Bruto</span>
                    <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">R$ {dadosRelatorio.lucro.toFixed(2)}</span>
                    <span className="block text-[10px] text-emerald-500 mt-1 font-semibold">Margem: {dadosRelatorio.margem.toFixed(1)}%</span>
                  </div>

                  <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 text-left">
                    <span className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Ticket Médio</span>
                    <span className="text-xl font-black text-slate-800 dark:text-slate-100">R$ {dadosRelatorio.ticketMedio.toFixed(2)}</span>
                  </div>

                  <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 text-left">
                    <span className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Vendas</span>
                    <span className="text-xl font-black text-slate-800 dark:text-slate-100">{dadosRelatorio.qtdVendas}</span>
                    <span className="block text-[10px] text-slate-400 mt-1 font-semibold">Recibos emitidos</span>
                  </div>
                </div>

                {/* Top Produtos */}
                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 text-left">
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-4">🏆 Top Produtos (No Filtro)</h3>
                  
                  {dadosRelatorio.topProdutos.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-4">Nenhuma venda encontrada para os filtros atuais.</p>
                  ) : (
                    <div className="space-y-4">
                      {dadosRelatorio.topProdutos.map((prod, index) => {
                        const porcentagemBarra = (prod.quantidade / prod.maxQtd) * 100
                        return (
                          <div key={prod.nome} className="relative">
                            <div className="flex justify-between items-end mb-1 relative z-10">
                              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{index + 1}. {prod.nome}</span>
                              <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{prod.quantidade} un</span>
                            </div>
                            <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                              <div className="h-full bg-orange-500 rounded-full" style={{ width: `${porcentagemBarra}%` }}></div>
                            </div>
                            <span className="block text-[10px] text-slate-400 dark:text-slate-500 mt-1 text-right">R$ {prod.receita.toFixed(2)} gerados</span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

              </div>
            )}
          </div>
        )}

      </main>

      {/* RODAPÉ */}
      <nav className="bg-white dark:bg-slate-900 border-t dark:border-slate-800 flex h-16 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.05)] z-30 transition-colors pb-safe">
        <button onClick={() => setAbaAtual('pdv')} className={`flex-1 flex flex-col items-center justify-center ${abaAtual === 'pdv' ? 'text-orange-500 dark:text-orange-400' : 'text-slate-400 dark:text-slate-500'}`}>
          <span className="text-xl mb-1">🛒</span>
          <span className="text-[10px] font-bold uppercase tracking-wider">Vendas</span>
        </button>
        {userRole === 'gerente' && (
          <>
            <div className="w-[1px] bg-slate-100 dark:bg-slate-800 my-2"></div>
            <button onClick={() => setAbaAtual('estoque')} className={`flex-1 flex flex-col items-center justify-center ${abaAtual === 'estoque' ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400 dark:text-slate-500'}`}>
              <span className="text-xl mb-1">📦</span>
              <span className="text-[10px] font-bold uppercase tracking-wider">Estoque</span>
            </button>
            <div className="w-[1px] bg-slate-100 dark:bg-slate-800 my-2"></div>
            <button onClick={() => setAbaAtual('painel')} className={`flex-1 flex flex-col items-center justify-center ${abaAtual === 'painel' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'}`}>
              <span className="text-xl mb-1">📊</span>
              <span className="text-[10px] font-bold uppercase tracking-wider">Painel</span>
            </button>
          </>
        )}
      </nav>

      {/* MODAL DE SUCESSO DA VENDA */}
      {vendaSucesso && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 transition-all">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-6 w-full max-w-sm flex flex-col items-center text-center animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-800">
            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mb-4 shadow-inner">
              <span className="text-3xl">✅</span>
            </div>
            <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 mb-1">Venda Finalizada!</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">O recibo foi registrado no sistema.</p>
            <div className="bg-slate-50 dark:bg-slate-800/50 w-full rounded-xl p-4 mb-6 border border-slate-100 dark:border-slate-700/50">
              <span className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Valor Recebido</span>
              <span className="text-4xl font-black text-orange-500 dark:text-orange-400">R$ {totalVendaSucesso.toFixed(2)}</span>
            </div>
            <Button onClick={() => setVendaSucesso(false)} className="w-full h-12 bg-orange-500 hover:bg-orange-600 text-white font-bold text-lg rounded-xl transition-colors shadow-lg shadow-orange-500/30">
              Nova Venda
            </Button>
          </div>
        </div>
      )}

    </div>
  )
}
