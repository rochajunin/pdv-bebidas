import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { X, ScanBarcode, Pencil, PackagePlus, Trash2, Tag } from "lucide-react"
import { Html5Qrcode } from "html5-qrcode"

interface Produto { id: number; nome: string; preco: number; preco_custo: number; categoria: string; estoque: number; estoque_minimo: number; codigo_barras?: string; }
interface EstoqueProps { mostrarAlerta: (titulo: string, msg: string, tipo: 'erro'|'aviso'|'sucesso') => void; mostrarConfirmacao: (titulo: string, msg: string, acao: () => void) => void; }

export default function Estoque({ mostrarAlerta, mostrarConfirmacao }: EstoqueProps) {
  const [produtos, setProdutos] = useState<Produto[]>([])
  
  const [nomeForm, setNomeForm] = useState("")
  const [codigoBarrasForm, setCodigoBarrasForm] = useState("") 
  const [precoForm, setPrecoForm] = useState("")
  const [precoCustoForm, setPrecoCustoForm] = useState("")
  const [categoriaForm, setCategoriaForm] = useState("")
  const [estoqueForm, setEstoqueForm] = useState("")
  const [estoqueMinimoForm, setEstoqueMinimoForm] = useState("")
  
  const [salvandoForm, setSalvandoForm] = useState(false)
  const [idEditando, setIdEditando] = useState<number | null>(null)
  const [mostrarCategorias, setMostrarCategorias] = useState(false)
  
  const [lendoCodigo, setLendoCodigo] = useState(false)

  useEffect(() => {
    async function buscar() {
      const { data } = await supabase.from('Produtos').select('*').order('nome', { ascending: true })
      if (data) setProdutos(data)
    }
    buscar()
  }, [])

  useEffect(() => {
    let html5QrCode: Html5Qrcode | null = null;
    let isMounted = true;

    if (lendoCodigo) {
      setTimeout(() => {
        if (!isMounted) return;
        html5QrCode = new Html5Qrcode("leitor-camera-estoque");
        html5QrCode.start(
          { facingMode: "environment" }, { fps: 10, qrbox: { width: 300, height: 150 } },
          (codigoDecodificado) => {
            if (html5QrCode && html5QrCode.isScanning) {
              html5QrCode.stop().then(() => {
                setLendoCodigo(false); setCodigoBarrasForm(codigoDecodificado);
                mostrarAlerta("Código Capturado", `O código ${codigoDecodificado} foi lido com sucesso.`, "sucesso");
              }).catch(console.error);
            }
          },
          () => {} 
        ).catch(() => {
          setLendoCodigo(false);
          mostrarAlerta("Erro na Câmera", "Não foi possível acessar a câmera do seu dispositivo.", "erro");
        });
      }, 100);
    }
    return () => {
      isMounted = false;
      if (html5QrCode && html5QrCode.isScanning) html5QrCode.stop().catch(console.error);
    }
  }, [lendoCodigo])

  const categoriasExistentes = Array.from(new Set(produtos.map(p => p.categoria)))
  const categoriasFiltradas = categoriasExistentes.filter(cat => cat.toLowerCase().includes(categoriaForm.toLowerCase()))

  const salvarProduto = async (e: React.FormEvent) => {
    e.preventDefault()
    setSalvandoForm(true)
    const payload = { nome: nomeForm, codigo_barras: codigoBarrasForm.trim() || null, preco: parseFloat(precoForm.toString().replace(',', '.')), preco_custo: precoCustoForm ? parseFloat(precoCustoForm.toString().replace(',', '.')) : 0, categoria: categoriaForm, estoque: parseInt(estoqueForm) || 0, estoque_minimo: parseInt(estoqueMinimoForm) || 0 }

    if (idEditando) {
      const { data, error } = await supabase.from('Produtos').update(payload).eq('id', idEditando).select()
      if (error) mostrarAlerta("Erro", error.message, "erro")
      else if (data) setProdutos(prev => prev.map(p => p.id === idEditando ? data[0] : p).sort((a, b) => a.nome.localeCompare(b.nome)))
    } else {
      const { data, error } = await supabase.from('Produtos').insert([payload]).select()
      if (error) mostrarAlerta("Erro", error.message, "erro")
      else if (data) setProdutos(prev => [...prev, data[0]].sort((a, b) => a.nome.localeCompare(b.nome)))
    }
    setSalvandoForm(false); cancelarEdicao();
  }

  const iniciarEdicao = (produto: Produto) => {
    setIdEditando(produto.id); setNomeForm(produto.nome); setCodigoBarrasForm(produto.codigo_barras || ""); setPrecoForm(produto.preco.toString()); setPrecoCustoForm(produto.preco_custo ? produto.preco_custo.toString() : "0"); setCategoriaForm(produto.categoria); setEstoqueForm(produto.estoque ? produto.estoque.toString() : "0"); setEstoqueMinimoForm(produto.estoque_minimo !== undefined && produto.estoque_minimo !== null ? produto.estoque_minimo.toString() : "10");
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const cancelarEdicao = () => { setIdEditando(null); setNomeForm(""); setCodigoBarrasForm(""); setPrecoForm(""); setPrecoCustoForm(""); setCategoriaForm(""); setEstoqueForm(""); setEstoqueMinimoForm(""); }

  const excluirProduto = (id: number, nome: string) => {
    mostrarConfirmacao("Excluir Produto", `Excluir o produto "${nome}"?`, async () => {
      const { error } = await supabase.from('Produtos').delete().eq('id', id);
      if (!error) setProdutos(prev => prev.filter(p => p.id !== id));
      else mostrarAlerta("Erro", error.message, "erro");
    });
  }

  return (
    <div className="p-4 pt-6 h-full bg-slate-50 dark:bg-slate-950 overflow-y-auto pb-24 text-left transition-colors" onClick={() => setMostrarCategorias(false)}>
      
      {lendoCodigo && (
        <div className="fixed inset-0 z-[200] bg-black/95 flex flex-col justify-center items-center animate-in fade-in duration-200">
          <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent z-10">
            <span className="text-white font-bold tracking-wider uppercase text-sm">Escaneando Cadastro</span>
            <button type="button" onClick={() => setLendoCodigo(false)} className="flex items-center justify-center text-white hover:bg-white/20 rounded-full h-10 w-10 transition-colors"><X className="h-6 w-6" /></button>
          </div>
          <div className="w-full max-w-md overflow-hidden rounded-2xl relative shadow-[0_0_50px_rgba(249,115,22,0.3)] border border-orange-500/30">
             <div id="leitor-camera-estoque" className="w-full h-full bg-slate-900 min-h-[300px]"></div>
             <div className="absolute inset-0 border-[3px] border-orange-500/50 m-8 rounded-xl pointer-events-none"><div className="absolute top-1/2 left-0 right-0 h-0.5 bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,1)] opacity-70 animate-pulse"></div></div>
          </div>
          <p className="text-white/60 text-xs mt-8 text-center px-6">Aponte a câmera para o código de barras da embalagem.</p>
        </div>
      )}

      <div className={`bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border transition-colors text-left ${idEditando ? 'border-amber-400 dark:border-amber-500 ring-4 ring-amber-50 dark:ring-amber-900/30' : 'border-slate-200 dark:border-slate-800'}`}>
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
          {idEditando ? <><Pencil className="w-5 h-5 text-amber-500"/> Editando Produto</> : <><PackagePlus className="w-5 h-5 text-slate-600 dark:text-slate-400"/> Novo Produto</>}
        </h2>
        <form onSubmit={salvarProduto} className="space-y-4 text-left">
          <div className="text-left relative"><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 text-left">Categoria</label><Input placeholder="Ex: Cervejas" value={categoriaForm} onChange={(e) => { setCategoriaForm(e.target.value); setMostrarCategorias(true) }} onFocus={() => setMostrarCategorias(true)} className="h-12 bg-slate-50 dark:bg-slate-950 dark:border-slate-800 dark:text-white" />
            {mostrarCategorias && categoriasFiltradas.length > 0 && (<div className="absolute top-full mt-1 left-0 right-0 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 max-h-44 overflow-y-auto z-30">{categoriasFiltradas.map(cat => (<div key={cat} onClick={() => { setCategoriaForm(cat); setMostrarCategorias(false) }} className="p-3 border-b dark:border-slate-700 cursor-pointer">{cat}</div>))}</div>)}
          </div>

          <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nome da Bebida</label><Input placeholder="Ex: Cerveja Lata 350ml" value={nomeForm} onChange={(e) => setNomeForm(e.target.value)} className="h-12 dark:bg-slate-950 dark:border-slate-800" required /></div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Código de Barras</label>
            <div className="relative flex items-center w-full">
              <Input placeholder="Escaneie ou digite..." value={codigoBarrasForm} onChange={(e) => setCodigoBarrasForm(e.target.value)} className="h-12 pr-12 dark:bg-slate-950 dark:border-slate-800 w-full" />
              <button type="button" onClick={() => setLendoCodigo(true)} className="absolute right-1 h-10 w-10 flex items-center justify-center text-slate-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors"><ScanBarcode className="h-6 w-6" /></button>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">Clique no ícone para ler o código com a câmera.</p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-bold text-orange-600 dark:text-orange-500 mb-1">Estoque Atual</label><Input type="number" value={estoqueForm} onChange={(e) => setEstoqueForm(e.target.value)} className="h-12 font-bold dark:bg-orange-950/20" required /></div>
            <div><label className="block text-sm font-bold text-red-600 dark:text-red-500 mb-1">Estoque Mínimo</label><Input type="number" value={estoqueMinimoForm} onChange={(e) => setEstoqueMinimoForm(e.target.value)} className="h-12 font-bold dark:bg-red-950/20" required /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Custo (R$)</label><Input inputMode="decimal" value={precoCustoForm} onChange={(e) => setPrecoCustoForm(e.target.value)} className="h-12 dark:bg-slate-950" /></div>
            <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Venda (R$)</label><Input inputMode="decimal" value={precoForm} onChange={(e) => setPrecoForm(e.target.value)} className="h-12 dark:bg-slate-950" required /></div>
          </div>
          
          <div className="flex gap-3 mt-6">
            {idEditando && <Button type="button" onClick={cancelarEdicao} className="flex-1 h-12 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl transition-colors">Cancelar</Button>}
            <Button type="submit" disabled={salvandoForm} className={`flex-[2] h-12 text-white font-bold text-lg rounded-xl transition-colors ${idEditando ? 'bg-amber-500' : 'bg-slate-800 dark:bg-orange-600'}`}>{salvandoForm ? 'A guardar...' : (idEditando ? 'Atualizar' : 'Salvar')}</Button>
          </div>
        </form>
      </div>

      <div className="mt-8 text-left">
        <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-3">Produtos Cadastrados ({produtos.length})</h3>
        <div className="space-y-3">
          {produtos.map(produto => (
            <div key={produto.id} className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex justify-between items-center shadow-sm">
              <div className="flex flex-col flex-1 min-w-0 pr-2">
                <span className="font-bold text-slate-800 dark:text-slate-200 break-words">{produto.nome}</span>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-1">
                  <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded uppercase font-bold">{produto.categoria}</span>
                  <span className="text-orange-600 font-semibold">V: R$ {produto.preco.toFixed(2)}</span>
                </div>
                {produto.codigo_barras && (
                  <span className="text-[10px] text-slate-400 mt-1 font-mono flex items-center gap-1">
                    <Tag className="w-3 h-3" /> {produto.codigo_barras}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className={`text-[10px] px-2 py-1 rounded-md font-black uppercase tracking-wider ${produto.estoque <= (produto.estoque_minimo || 10) ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>{produto.estoque} UN</span>
                <div className="flex gap-2 border-l dark:border-slate-700 pl-3">
                  <button onClick={() => iniciarEdicao(produto)} className="w-8 h-8 flex items-center justify-center bg-amber-100 hover:bg-amber-200 text-amber-700 rounded-lg transition-colors"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => excluirProduto(produto.id, produto.nome)} className="w-8 h-8 flex items-center justify-center bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}