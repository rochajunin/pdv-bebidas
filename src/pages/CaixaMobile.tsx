import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Minus, ShoppingCart } from "lucide-react"; // Ícones

// Dados simulados (depois virão do Supabase)
const produtosMock = [
  { id: 1, nome: "Heineken Long Neck", preco: 8.50 },
  { id: 2, nome: "Brahma Lata 350ml", preco: 4.50 },
  { id: 3, nome: "Gin Tanqueray 750ml", preco: 120.00 },
];

export default function CaixaMobile() {
  const [carrinho, setCarrinho] = useState<{id: number, quantidade: number}[]>([]);

  // Lógica simples para adicionar item
  const adicionarItem = (id: number) => {
    setCarrinho(prev => {
      const existe = prev.find(item => item.id === id);
      if (existe) return prev.map(item => item.id === id ? { ...item, quantidade: item.quantidade + 1 } : item);
      return [...prev, { id, quantidade: 1 }];
    });
  };

  // Calcula o total da venda
  const total = carrinho.reduce((acc, item) => {
    const produto = produtosMock.find(p => p.id === item.id);
    return acc + (produto ? produto.preco * item.quantidade : 0);
  }, 0);

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      
      {/* Cabeçalho */}
      <header className="p-4 bg-white shadow-sm flex justify-between items-center z-10">
        <h1 className="text-xl font-bold text-slate-800">Nova Venda</h1>
        <div className="bg-slate-100 p-2 rounded-full text-sm font-medium">
          Vendedor: João
        </div>
      </header>

      {/* Área de Produtos (Rolável) */}
      <ScrollArea className="flex-1 p-4">
        <div className="flex flex-col gap-3 pb-24">
          {produtosMock.map((produto) => (
            <Card key={produto.id} className="flex flex-row justify-between items-center p-4">
              <div>
                <h3 className="font-semibold text-slate-800">{produto.nome}</h3>
                <p className="text-slate-500">R$ {produto.preco.toFixed(2)}</p>
              </div>
              <Button 
                onClick={() => adicionarItem(produto.id)}
                size="icon" 
                variant="secondary"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </Card>
          ))}
        </div>
      </ScrollArea>

      {/* Barra Inferior Fixa (Carrinho e Finalizar) */}
      <div className="fixed bottom-0 w-full bg-white border-t p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <div className="flex justify-between items-center mb-3">
          <span className="text-slate-500 flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            {carrinho.length} itens
          </span>
          <span className="text-2xl font-bold text-slate-800">
            R$ {total.toFixed(2)}
          </span>
        </div>
        <Button className="w-full h-14 text-lg font-bold">
          Cobrar e Finalizar
        </Button>
      </div>

    </div>
  );
}