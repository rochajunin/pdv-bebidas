import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function Painel() {
  const [filtroData, setFiltroData] = useState<"hoje" | "7dias" | "mes" | "personalizado">("hoje")
  const [carregandoRelatorio, setCarregandoRelatorio] = useState(false)
  const [mostrarMaisFiltros, setMostrarMaisFiltros] = useState(false)
  const [triggerFiltro, setTriggerFiltro] = useState(0)
  
  const [formFiltros, setFormFiltros] = useState({ dataInicial: "", dataFinal: "", clienteId: "", valorMin: "", valorMax: "", produtoId: "" })
  const [dadosRelatorio, setDadosRelatorio] = useState({ faturamento: 0, lucro: 0, qtdVendas: 0, ticketMedio: 0, margem: 0, topProdutos: [] as any[] })
  
  const [clientes, setClientes] = useState<{id: string, nome: string}[]>([])

  // Busca os clientes só pro dropdown do filtro
  useEffect(() => {
    supabase.from('Clientes').select('id, nome').then(({ data }) => { if (data) setClientes(data) })
  }, [])

  useEffect(() => {
    async function gerarRelatorio() {
      setCarregandoRelatorio(true)
      try {
        let query = supabase.from('Vendas').select('*, Itens_Venda(*)')

        if (filtroData === "personalizado") {
          if (formFiltros.dataInicial) query = query.gte('created_at', formFiltros.dataInicial + 'T00:00:00-03:00')
          if (formFiltros.dataFinal) query = query.lte('created_at', formFiltros.dataFinal + 'T23:59:59-03:00')
          if (formFiltros.clienteId) query = query.eq('cliente_id', formFiltros.clienteId)
        } else {
          const dataCorte = new Date()
          dataCorte.setHours(0, 0, 0, 0)
          if (filtroData === "7dias") dataCorte.setDate(dataCorte.getDate() - 7)
          else if (filtroData === "mes") dataCorte.setDate(1)
          query = query.gte('created_at', dataCorte.toISOString())
        }

        const { data: vendas } = await query
        let faturamentoTotal = 0; let lucroTotal = 0; let qtdVendasValidas = 0;
        let produtosVendidos: Record<string, any> = {}

        vendas?.forEach(venda => {
          venda.Itens_Venda?.forEach((item: any) => {
            const pv = Number(item.preco_venda); const pc = Number(item.preco_custo); const qtd = Number(item.quantidade);
            faturamentoTotal += (pv * qtd); lucroTotal += ((pv - pc) * qtd);
            if (!produtosVendidos[item.nome_produto]) produtosVendidos[item.nome_produto] = { quantidade: 0, receita: 0 }
            produtosVendidos[item.nome_produto].quantidade += qtd
            produtosVendidos[item.nome_produto].receita += (pv * qtd)
          })
          qtdVendasValidas++
        })

        const top = Object.entries(produtosVendidos).map(([nome, d]) => ({ nome, ...d as any })).sort((a, b) => b.quantidade - a.quantidade).slice(0, 5)
        const maxQtd = top.length > 0 ? Math.max(...top.map(p => p.quantidade)) : 1

        setDadosRelatorio({ faturamento: faturamentoTotal, lucro: lucroTotal, qtdVendas: qtdVendasValidas, ticketMedio: qtdVendasValidas > 0 ? faturamentoTotal / qtdVendasValidas : 0, margem: faturamentoTotal > 0 ? (lucroTotal / faturamentoTotal) * 100 : 0, topProdutos: top.map(p => ({...p, maxQtd})) })
      } catch (e) { console.error(e) } finally { setCarregandoRelatorio(false) }
    }
    gerarRelatorio()
  }, [filtroData, triggerFiltro])

  return (
    <div className="p-4 pt-6 h-full bg-slate-50 dark:bg-slate-950 overflow-y-auto pb-24 transition-colors">
      <div className="flex bg-white dark:bg-slate-900 p-1 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 mb-3">
        <button onClick={() => setFiltroData('hoje')} className={`flex-1 py-2 text-sm font-bold rounded-lg ${filtroData === 'hoje' ? 'bg-orange-500 text-white shadow' : 'text-slate-500'}`}>Hoje</button>
        <button onClick={() => setFiltroData('7dias')} className={`flex-1 py-2 text-sm font-bold rounded-lg ${filtroData === '7dias' ? 'bg-orange-500 text-white shadow' : 'text-slate-500'}`}>7 Dias</button>
        <button onClick={() => setFiltroData('mes')} className={`flex-1 py-2 text-sm font-bold rounded-lg ${filtroData === 'mes' ? 'bg-orange-500 text-white shadow' : 'text-slate-500'}`}>Este Mês</button>
      </div>

      <button onClick={() => setMostrarMaisFiltros(!mostrarMaisFiltros)} className="w-full mb-6 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 py-2">
        {mostrarMaisFiltros ? "Esconder Filtros ▲" : "Mais Filtros ▼"}
      </button>

      {mostrarMaisFiltros && (
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl mb-6 shadow-sm border border-slate-200 dark:border-slate-800 space-y-4 text-left">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-bold text-slate-500">Data Inicial</label><Input type="date" value={formFiltros.dataInicial} onChange={e => setFormFiltros({...formFiltros, dataInicial: e.target.value})} className="h-10 mt-1 text-sm dark:bg-slate-950" /></div>
            <div><label className="text-xs font-bold text-slate-500">Data Final</label><Input type="date" value={formFiltros.dataFinal} onChange={e => setFormFiltros({...formFiltros, dataFinal: e.target.value})} className="h-10 mt-1 text-sm dark:bg-slate-950" /></div>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500">Cliente Específico</label>
            <select className="w-full h-10 mt-1 px-3 text-sm rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white" value={formFiltros.clienteId} onChange={e => setFormFiltros({...formFiltros, clienteId: e.target.value})}>
              <option value="">Todos</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <div className="flex gap-2 pt-2">
            <Button onClick={() => setFiltroData("hoje")} className="flex-1 h-10 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-lg">Limpar</Button>
            <Button onClick={() => {setFiltroData("personalizado"); setTriggerFiltro(p => p+1)}} className="flex-[2] h-10 bg-orange-500 text-white font-bold rounded-lg">Aplicar Filtros</Button>
          </div>
        </div>
      )}

      {carregandoRelatorio ? (
        <div className="flex flex-col items-center justify-center h-40 text-slate-400">⏳ Calculando...</div>
      ) : (
        <div className="space-y-6 text-left">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800"><span className="block text-xs font-bold text-slate-400 uppercase mb-1">Faturamento</span><span className="text-xl font-black">R$ {dadosRelatorio.faturamento.toFixed(2)}</span></div>
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-emerald-200 dark:border-emerald-900/30"><span className="block text-xs font-bold text-emerald-600 uppercase mb-1">Lucro Bruto</span><span className="text-xl font-black text-emerald-600">R$ {dadosRelatorio.lucro.toFixed(2)}</span></div>
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800"><span className="block text-xs font-bold text-slate-400 uppercase mb-1">Ticket Médio</span><span className="text-xl font-black">R$ {dadosRelatorio.ticketMedio.toFixed(2)}</span></div>
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800"><span className="block text-xs font-bold text-slate-400 uppercase mb-1">Vendas (Recibos)</span><span className="text-xl font-black">{dadosRelatorio.qtdVendas}</span></div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
            <h3 className="text-base font-bold mb-4">🏆 Top Produtos</h3>
            {dadosRelatorio.topProdutos.length === 0 ? <p className="text-sm text-slate-400 text-center py-4">Nenhuma venda encontrada.</p> : (
              <div className="space-y-4">
                {dadosRelatorio.topProdutos.map((prod, index) => (
                  <div key={prod.nome} className="relative">
                    <div className="flex justify-between items-end mb-1"><span className="text-sm font-semibold">{index + 1}. {prod.nome}</span><span className="text-xs font-bold">{prod.quantidade} un</span></div>
                    <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-orange-500 rounded-full" style={{ width: `${(prod.quantidade / prod.maxQtd) * 100}%` }}></div></div>
                    <span className="block text-[10px] text-slate-400 mt-1 text-right">R$ {prod.receita.toFixed(2)} gerados</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}