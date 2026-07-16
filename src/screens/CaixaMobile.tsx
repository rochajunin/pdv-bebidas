import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { X } from "lucide-react"

interface Produto {
  id: number
  nome: string
  preco: number
  preco_custo: number
  categoria: string
  estoque: number
  estoque_minimo: number
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

interface CaixaMobileProps {
  userEmail: string
  mostrarAlerta: (titulo: string, mensagem: string, tipo: 'erro' | 'aviso' | 'sucesso') => void
}

export default function CaixaMobile({ userEmail, mostrarAlerta }: CaixaMobileProps) {
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [carregandoDados, setCarregandoDados] = useState(true)

  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([])
  const [busca, setBusca] = useState("")
  const [mostrarResultados, setMostrarResultados] = useState(false)
  const [nomeClientePDV, setNomeClientePDV] = useState("")
  const [mostrarClientes, setMostrarClientes] = useState(false)
  const [salvandoVenda, setSalvandoVenda] = useState(false)
  const [vendaSucesso, setVendaSucesso] = useState(false)
  const [totalVendaSucesso, setTotalVendaSucesso] = useState(0)

  // Busca os dados iniciais ao montar a tela
  useEffect(() => {
    async function buscarDados() {
      setCarregandoDados(true)
      try {
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
  }, [])

  const produtosFiltrados = produtos.filter(produto => produto.nome.toLowerCase().includes(busca.toLowerCase()) || produto.id.toString() === busca.toLowerCase())
  const clientesFiltrados = clientes.filter(cliente => cliente.nome.toLowerCase().includes(nomeClientePDV.toLowerCase()))

  const adicionarAoCarrinho = (produto: Produto) => {
    if (produto.estoque <= 0) {
      mostrarAlerta("Produto Esgotado", `O item "${produto.nome}" está sem estoque no momento e não pode ser vendido.`, "erro");
      return;
    }

    setCarrinho(prev => {
      const itemExistente = prev.find(item => item.produto.id === produto.id)
      if (itemExistente) {
        if (Number(itemExistente.quantidade) + 1 > produto.estoque) {
          mostrarAlerta("Estoque Insuficiente", `Temos apenas ${produto.estoque} unidades de "${produto.nome}" disponíveis.`, "aviso");
          return prev;
        }
        return prev.map(item => item.produto.id === produto.id ? { ...item, quantidade: Number(item.quantidade) + 1 } : item)
      }
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
        
        if (qtdNumerica > item.produto.estoque) {
           mostrarAlerta("Limite Atingido", `Você não pode adicionar mais do que o estoque disponível (${item.produto.estoque} unidades).`, "aviso");
           return { ...item, quantidade: item.produto.estoque }
        }
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
        if (clienteExistente) clienteIdFinal = clienteExistente.id
        else {
          const { data: novoCliente, error: erroCliente } = await supabase.from('Clientes').insert([{ nome: nomeFormatado }]).select()
          if (!erroCliente && novoCliente) {
            clienteIdFinal = novoCliente[0].id
            setClientes(prev => [...prev, novoCliente[0]].sort((a, b) => a.nome.localeCompare(b.nome)))
          }
        }
      }

      // Salva a Venda Geral
      const { data: vendaData, error: vendaError } = await supabase.from('Vendas').insert([{ total: totalVenda, vendedor_email: userEmail, cliente_id: clienteIdFinal }]).select()
      if (vendaError) throw vendaError
      const idDaVenda = vendaData[0].id

      // Prepara e Salva Itens da Venda
      const itensParaSalvar = carrinho.map(item => ({
        venda_id: idDaVenda, produto_id: item.produto.id, nome_produto: item.produto.nome,
        quantidade: Number(item.quantidade), preco_venda: item.produto.preco, preco_custo: item.produto.preco_custo || 0
      }))
      const { error: itensError } = await supabase.from('Itens_Venda').insert(itensParaSalvar)
      if (itensError) throw itensError

      // Desconta o Estoque
      for (const item of carrinho) {
        const novoEstoque = (item.produto.estoque || 0) - Number(item.quantidade);
        const { data: checkData, error: erroEstoque } = await supabase.from('Produtos').update({ estoque: novoEstoque }).eq('id', item.produto.id).select();

        if (erroEstoque) {
          mostrarAlerta("Erro de Banco de Dados", `Falha ao dar baixa no estoque de ${item.produto.nome}.\n\nDetalhe: ${erroEstoque.message}`, "erro");
        } else if (!checkData || checkData.length === 0) {
          mostrarAlerta("Acesso Negado (RLS)", `O estoque de ${item.produto.nome} não pôde ser atualizado.`, "erro");
        }
      }

      // Atualiza o estoque localmente
      setProdutos(prev => prev.map(p => {
        const itemVendido = carrinho.find(c => c.produto.id === p.id);
        if (itemVendido) return { ...p, estoque: (p.estoque || 0) - Number(itemVendido.quantidade) };
        return p;
      }))

      setTotalVendaSucesso(totalVenda)
      setVendaSucesso(true)
      setCarrinho([])
      setNomeClientePDV("")
    } catch (error) {
      console.error(error)
      mostrarAlerta("Falha na Venda", "Ocorreu um erro inesperado ao tentar registrar esta venda.", "erro");
    } finally {
      setSalvandoVenda(false)
    }
  }

  return (
    <div className="flex flex-col h-full w-full relative text-left" onClick={() => { setMostrarResultados(false); setMostrarClientes(false); }}>
      
      {/* CAMPO DE BUSCA */}
      <div className="bg-white dark:bg-slate-900 p-4 pt-6 shadow-sm z-20 relative border-b dark:border-slate-800 transition-colors" onClick={(e) => e.stopPropagation()}>
        <Input type="text" placeholder="Código ou nome..." value={busca} onChange={(e) => setBusca(e.target.value)} onFocus={() => setMostrarResultados(true)} className="h-12 text-base bg-slate-50 dark:bg-slate-950 dark:text-white dark:border-slate-800" />
        {mostrarResultados && (
          <div className="absolute top-full mt-1 left-3 right-3 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 max-h-60 overflow-y-auto z-30 transition-colors">
            {produtosFiltrados.length === 0 ? (
              <div className="p-4 text-center text-slate-500 dark:text-slate-400 text-sm">Nenhum produto encontrado.</div>
            ) : (
              produtosFiltrados.map(produto => {
                const semEstoque = produto.estoque <= 0;
                const limiteMinimo = produto.estoque_minimo !== undefined && produto.estoque_minimo !== null ? produto.estoque_minimo : 10;
                const emAlerta = produto.estoque <= limiteMinimo;

                return (
                  <div key={produto.id} onClick={() => !semEstoque && adicionarAoCarrinho(produto)} className={`p-3 border-b dark:border-slate-700 active:bg-slate-100 dark:active:bg-slate-700 flex justify-between items-center transition-colors ${semEstoque ? 'opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-900/50' : 'cursor-pointer'}`}>
                    <div className="flex flex-col flex-1 min-w-0 pr-2">
                      <span className="font-semibold text-slate-800 dark:text-slate-100 break-words">{produto.nome}</span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-2 mt-0.5">
                          <span className={`font-bold ${emAlerta ? 'text-red-500' : 'text-emerald-500'}`}>{produto.estoque} UN</span>
                          • {produto.categoria}
                      </span>
                    </div>
                    <span className={`font-bold whitespace-nowrap ${semEstoque ? 'text-slate-400' : 'text-orange-500 dark:text-orange-400'}`}>R$ {produto.preco.toFixed(2)}</span>
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>

      {/* LISTA DO CARRINHO */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-44">
        {carregandoDados ? (
          <div className="h-full flex items-center justify-center text-slate-400 text-sm">Sincronizando banco de dados...</div>
        ) : carrinho.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 opacity-50"><p>Carrinho vazio</p></div>
        ) : (
          carrinho.map(item => (
            <div key={item.produto.id} className="bg-white dark:bg-slate-900 p-3 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col gap-3 transition-colors">
              
              <div className="flex justify-between items-center w-full gap-2">
                <span className="font-bold text-slate-700 dark:text-slate-200 flex-1 truncate">{item.produto.nome}</span>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                    R$ {(item.produto.preco * (Number(item.quantidade) || 0)).toFixed(2)}
                  </span>
                  <button type="button" onClick={() => alterarQuantidade(item.produto.id, 0)} className="flex items-center justify-center h-8 w-8 text-slate-400 hover:text-red-500 bg-transparent border-0 rounded-md transition-colors" title="Remover">
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
              
              <div className="flex justify-between items-end w-full">
                <div className="flex flex-col">
                  <span className="text-xs text-slate-400 dark:text-slate-500">R$ {item.produto.preco.toFixed(2)} / un</span>
                  <span className="text-[10px] font-bold text-orange-500 dark:text-orange-400 mt-1">Estoque disp: {item.produto.estoque}</span>
                </div>
                <div className="flex items-center border dark:border-slate-700 rounded-lg overflow-hidden bg-slate-50 dark:bg-slate-800 transition-colors">
                  <button type="button" onClick={() => alterarQuantidade(item.produto.id, Number(item.quantidade) - 1)} className="w-10 h-10 border-r dark:border-slate-700 text-lg dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">-</button>
                  <input type="number" value={item.quantidade} onChange={(e) => alterarQuantidade(item.produto.id, e.target.value)} onBlur={() => validarQuantidadeFinal(item.produto.id)} className="w-14 h-10 text-center font-bold bg-transparent dark:text-white" />
                  <button type="button" onClick={() => alterarQuantidade(item.produto.id, Number(item.quantidade) + 1)} className="w-10 h-10 border-l dark:border-slate-700 text-lg dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">+</button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ÁREA INFERIOR (CLIENTE E FINALIZAR) */}
      <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-slate-900 p-4 border-t dark:border-slate-800 shadow-[0_-4px_10px_-5px_rgba(0,0,0,0.1)] z-20 transition-colors" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 relative">
          <Input placeholder="Nome do Cliente (Opcional)" value={nomeClientePDV} onChange={(e) => { setNomeClientePDV(e.target.value); setMostrarClientes(true) }} onFocus={() => setMostrarClientes(true)} className="h-10 bg-slate-50 dark:bg-slate-950 dark:text-white dark:border-slate-800" />
          {mostrarClientes && (
            <div className="absolute bottom-full mb-1 left-0 right-0 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 max-h-44 overflow-y-auto z-30 transition-colors">
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

      {/* MODAL DE SUCESSO DA VENDA */}
      {vendaSucesso && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 transition-all">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-6 w-full max-w-sm flex flex-col items-center text-center animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-800">
            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mb-4 shadow-inner"><span className="text-3xl">✅</span></div>
            <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 mb-1">Venda Finalizada!</h3><p className="text-slate-500 dark:text-slate-400 text-sm mb-6">O recibo foi registrado no sistema.</p>
            <div className="bg-slate-50 dark:bg-slate-800/50 w-full rounded-xl p-4 mb-6 border border-slate-100 dark:border-slate-700/50"><span className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Valor Recebido</span><span className="text-4xl font-black text-orange-500 dark:text-orange-400">R$ {totalVendaSucesso.toFixed(2)}</span></div>
            <Button onClick={() => setVendaSucesso(false)} className="w-full h-12 bg-orange-500 hover:bg-orange-600 text-white font-bold text-lg rounded-xl transition-colors shadow-lg shadow-orange-500/30">Nova Venda</Button>
          </div>
        </div>
      )}
    </div>
  )
}