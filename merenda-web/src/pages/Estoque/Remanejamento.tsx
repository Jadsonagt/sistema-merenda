import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowRightLeft, Plus, Trash2, History, Search, Box } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { api } from '../../services/api';

const getHeaders = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

export const Remanejamento: React.FC = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'FORM' | 'HISTORICO'>('FORM');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [escolas, setEscolas] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [produtos, setProdutos] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [historico, setHistorico] = useState<any[]>([]);
  
  // Estado do Formulário
  const [escolaOrigem, setEscolaOrigem] = useState('');
  const [escolaDestino, setEscolaDestino] = useState('');
  const [itensLote, setItensLote] = useState([{ itemId: '', quantidade: '' }]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Estado do Histórico
  const [filtroEscolaHistorico, setFiltroEscolaHistorico] = useState('');

  useEffect(() => {
    carregarDadosBase();
    carregarHistorico();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    carregarHistorico(filtroEscolaHistorico === 'all' ? '' : filtroEscolaHistorico);
  }, [filtroEscolaHistorico]);

  const carregarDadosBase = async () => {
    try {
      const [escRes, prodRes] = await Promise.all([
        api.get('/escolas', getHeaders()),
        api.get('/items', getHeaders()) // Ajuste a rota de itens/produtos conforme seu projeto
      ]);
      setEscolas(escRes.data || []);
      setProdutos(prodRes.data || []);
    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", title: "Erro", description: "Falha ao carregar escolas ou itens." });
    }
  };

  const carregarHistorico = async (escolaId = '') => {
    try {
      const url = escolaId ? `/remanejamentos/historico?escolaId=${escolaId}` : '/remanejamentos/historico';
      const res = await api.get(url, getHeaders());
      setHistorico(res.data || []);
    } catch (error) {
      console.error("Erro ao carregar histórico", error);
    }
  };

  const handleAdicionarItemRow = () => {
    setItensLote([...itensLote, { itemId: '', quantidade: '' }]);
  };

  const handleRemoverItemRow = (index: number) => {
    const novosItens = itensLote.filter((_, i) => i !== index);
    setItensLote(novosItens);
  };

  const handleItemChange = (index: number, campo: string, valor: string) => {
    const novosItens = [...itensLote];
    novosItens[index] = { ...novosItens[index], [campo]: valor };
    setItensLote(novosItens);
  };

  const handleTransferir = async () => {
    if (!escolaOrigem || !escolaDestino) {
      return toast({ variant: "destructive", title: "Atenção", description: "Selecione origem e destino." });
    }
    if (escolaOrigem === escolaDestino) {
      return toast({ variant: "destructive", title: "Atenção", description: "Origem e destino não podem ser iguais." });
    }

    const payloadItens = itensLote
      .filter(i => i.itemId && Number(i.quantidade) > 0)
      .map(i => ({ itemId: i.itemId, quantidade: Number(i.quantidade) }));

    if (payloadItens.length === 0) {
      return toast({ variant: "destructive", title: "Atenção", description: "Adicione ao menos um item válido." });
    }

    setIsSubmitting(true);
    try {
      await api.post('/remanejamentos/lote', {
        escolaOrigemId: escolaOrigem,
        escolaDestinoId: escolaDestino,
        itens: payloadItens
      }, getHeaders());
      
      toast({ className: "bg-emerald-50 text-emerald-900 border-emerald-200", title: "Sucesso", description: "Lote remanejado com sucesso!" });
      setItensLote([{ itemId: '', quantidade: '' }]);
      setEscolaOrigem('');
      setEscolaDestino('');
      carregarHistorico(filtroEscolaHistorico === 'all' ? '' : filtroEscolaHistorico);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro na Transferência", description: error.response?.data?.error || "Verifique o saldo da escola de origem." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3 text-slate-800"><ArrowRightLeft className="h-8 w-8 text-emerald-600" /> Remanejamento Web</h1>
        <p className="text-muted-foreground mt-1 mb-6">Transferência logística de múltiplos pacotes entre unidades.</p>
      </div>

      {/* NAVEGAÇÃO POR ABAS */}
      <div className="flex gap-2 border-b mb-6">
        <button 
          onClick={() => setActiveTab('FORM')} 
          className={`px-4 py-2 font-bold text-sm border-b-2 transition-colors ${activeTab === 'FORM' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Nova Transferência
        </button>
        <button 
          onClick={() => setActiveTab('HISTORICO')} 
          className={`px-4 py-2 font-bold text-sm border-b-2 transition-colors ${activeTab === 'HISTORICO' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Histórico de Lotes
        </button>
      </div>

      {/* CONTEÚDO DA ABA: FORMULÁRIO */}
      {activeTab === 'FORM' && (
        <div className="bg-white p-6 md:p-8 rounded-xl border shadow-sm w-full animate-in fade-in duration-300">
          
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="space-y-2">
              <Label className="text-slate-500 font-bold uppercase text-[10px]">Escola de Origem (Sai o produto)</Label>
              <Select value={escolaOrigem} onValueChange={setEscolaOrigem}>
                <SelectTrigger className="border-slate-200 focus:ring-emerald-500"><SelectValue placeholder="Selecione a origem..." /></SelectTrigger>
                <SelectContent>{escolas.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-500 font-bold uppercase text-[10px]">Escola de Destino (Recebe o produto)</Label>
              <Select value={escolaDestino} onValueChange={setEscolaDestino}>
                <SelectTrigger className="border-slate-200 focus:ring-emerald-500"><SelectValue placeholder="Selecione o destino..." /></SelectTrigger>
                <SelectContent>{escolas.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-4 mb-8">
            <div className="flex justify-between items-end mb-2">
              <Label className="text-slate-500 font-bold uppercase text-[10px]">Itens do Lote</Label>
            </div>
            
            {itensLote.map((item, index) => (
              <div key={index} className="flex items-center gap-3 bg-slate-50 p-3 rounded-lg border border-slate-100 relative group">
                <div className="flex-1 space-y-1">
                  <Select value={item.itemId} onValueChange={(val) => handleItemChange(index, 'itemId', val)}>
                    <SelectTrigger className="bg-white"><SelectValue placeholder="Selecione o item..." /></SelectTrigger>
                    <SelectContent>{produtos.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="w-28 space-y-1">
                  <Input type="number" min="1" placeholder="Qtd" value={item.quantidade} onChange={(e) => handleItemChange(index, 'quantidade', e.target.value)} className="bg-white text-center font-bold" />
                </div>
                <Button variant="ghost" size="icon" onClick={() => handleRemoverItemRow(index)} disabled={itensLote.length === 1} className="text-slate-400 hover:text-red-500 shrink-0">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
            
            <Button variant="outline" onClick={handleAdicionarItemRow} className="w-full border-dashed border-2 text-slate-500 hover:text-emerald-700 hover:border-emerald-200 hover:bg-emerald-50">
              <Plus className="w-4 h-4 mr-2" /> Adicionar outro item ao lote
            </Button>
          </div>

          <div className="flex justify-end pt-4 border-t">
            <Button onClick={handleTransferir} disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-6 text-lg shadow-md hover:shadow-lg transition-all w-full md:w-auto">
              <ArrowRightLeft className="w-5 h-5 mr-2" /> Confirmar Transferência
            </Button>
          </div>
        </div>
      )}

      {/* CONTEÚDO DA ABA: HISTÓRICO */}
      {activeTab === 'HISTORICO' && (
        <div className="bg-white p-6 md:p-8 rounded-xl border shadow-sm w-full animate-in fade-in duration-300 min-h-[500px]">
          <h2 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2 border-b pb-2">
            <History className="w-5 h-5 text-slate-400" /> Histórico de Lotes
          </h2>
          
          <div className="relative mb-4">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <Select value={filtroEscolaHistorico} onValueChange={setFiltroEscolaHistorico}>
              <SelectTrigger className="pl-9 bg-slate-50 border-transparent focus:bg-white"><SelectValue placeholder="Filtrar por escola..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as escolas</SelectItem>
                {escolas.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 space-y-3">
            {historico.length === 0 ? (
              <p className="text-center text-sm text-slate-400 mt-10">Nenhuma transferência registrada.</p>
            ) : (
              historico.map((mov, i) => (
                <div key={i} className="p-3 bg-slate-50 border rounded-lg text-sm group hover:border-emerald-200 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-bold text-slate-700 flex items-center gap-1.5"><Box className="w-3 h-3 text-emerald-600"/> {mov.quantidade}x {mov.item?.name}</span>
                    <span className="text-[10px] text-slate-400">{new Date(mov.createdAt).toLocaleDateString('pt-BR')}</span>
                  </div>
                  <div className="text-xs text-slate-500 space-y-1">
                    {/* Renderizando as escolas origem/destino baseadas na estrutura ideal do front ou na real do back */}
                    <p><span className="font-semibold text-rose-600">Escola Afetada:</span> {mov.escola?.name || mov.escolaOrigem?.name}</p>
                    <p><span className="font-semibold text-emerald-600">Tipo da Movimentação:</span> TRANSFERÊNCIA</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
