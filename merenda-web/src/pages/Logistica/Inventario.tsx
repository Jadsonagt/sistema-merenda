import { useState, useEffect } from 'react';
import {
  ClipboardCheck,
  Save,
  History,
  CalendarDays,
  FileSearch,
  PackageSearch,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { getEscolas, type Escola } from '@/services/api/escolas';
import { getItems, type Item } from '@/services/api/items';
import { api } from '@/services/api';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface HistoricoItem {
  id: string;
  quantidadeFisica: number;
  estoqueTeoricoNoMomento: number;
  dataContagem: string;
  item: Item;
}

export function Inventario() {
  const [escolas, setEscolas] = useState<Escola[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [selectedEscolaId, setSelectedEscolaId] = useState<string>("");
  const [estoqueAtual, setEstoqueAtual] = useState<Record<string, number>>({});
  const [contagemFisica, setContagemFisica] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  // Histórico states
  const [historico, setHistorico] = useState<HistoricoItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [mes, setMes] = useState<string>(String(new Date().getMonth() + 1));
  const [ano, setAno] = useState<string>(String(new Date().getFullYear()));

  const meses = [
    { value: "1", label: "Janeiro" }, { value: "2", label: "Fevereiro" },
    { value: "3", label: "Março" }, { value: "4", label: "Abril" },
    { value: "5", label: "Maio" }, { value: "6", label: "Junho" },
    { value: "7", label: "Julho" }, { value: "8", label: "Agosto" },
    { value: "9", label: "Setembro" }, { value: "10", label: "Outubro" },
    { value: "11", label: "Novembro" }, { value: "12", label: "Dezembro" },
  ];

  const anos = ["2024", "2025", "2026"];

  // Estados do Modal de Descarte
  const [isDescarteModalOpen, setIsDescarteModalOpen] = useState(false);
  const [itemToDescarte, setItemToDescarte] = useState<Item | null>(null);
  const [descarteQuantidade, setDescarteQuantidade] = useState("");
  const [descarteMotivo, setDescarteMotivo] = useState("");
  const [descarteObservacao, setDescarteObservacao] = useState("");
  const [isDescartando, setIsDescartando] = useState(false);

  const handleOpenDescarte = (item: Item) => {
    setItemToDescarte(item);
    setDescarteQuantidade("");
    setDescarteMotivo("");
    setDescarteObservacao("");
    setIsDescarteModalOpen(true);
  };

  const handleConfirmDescarte = async () => {
    if (!itemToDescarte || !descarteQuantidade || !descarteMotivo) {
      toast({ variant: "destructive", title: "Atenção", description: "Preencha a quantidade e o motivo." });
      return;
    }
    
    setIsDescartando(true);
    try {
      await api.post(`/escolas/${selectedEscolaId}/estoque/descarte`, {
        itemId: itemToDescarte.id,
        quantidade: descarteQuantidade,
        motivo: descarteMotivo,
        observacao: descarteObservacao
      });
      toast({ className: "bg-emerald-50 text-emerald-900 border-emerald-200", title: "Sucesso", description: "Baixa de estoque registrada com sucesso." });
      setIsDescarteModalOpen(false);
      fetchEstoque();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: error.response?.data?.error || "Erro ao dar baixa no estoque." });
    } finally {
      setIsDescartando(false);
    }
  };

  useEffect(() => {
    const loadBaseData = async () => {
      try {
        const [escolasData, itemsData] = await Promise.all([
          getEscolas(),
          getItems()
        ]);
        setEscolas(escolasData);
        setItems(itemsData);
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Não foi possível carregar os dados base."
        });
      }
    };
    loadBaseData();
  }, [toast]);

  useEffect(() => {
    if (selectedEscolaId) {
      fetchEstoque();
      fetchHistorico();
    } else {
      setEstoqueAtual({});
      setContagemFisica({});
      setHistorico([]);
    }
  }, [selectedEscolaId, mes, ano]);

  const fetchEstoque = async () => {
    if (!selectedEscolaId) return;
    setLoading(true);
    try {
      const response = await api.get(`/escolas/${selectedEscolaId}/estoque`);
      const estoqueMap: Record<string, number> = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
      response.data.forEach((e: any) => {
        estoqueMap[e.itemId] = e.quantidade;
      });
      setEstoqueAtual(estoqueMap);
      setContagemFisica({});
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao buscar estoque atual."
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchHistorico = async () => {
    if (!selectedEscolaId) return;
    setLoadingHistory(true);
    try {
      const response = await api.get(`/escolas/${selectedEscolaId}/inventario/historico`, {
        params: { mes, ano }
      });
      setHistorico(response.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleInputChange = (itemId: string, value: string) => {
    setContagemFisica(prev => ({
      ...prev,
      [itemId]: value
    }));
  };

  const handleSave = async () => {
    const itensParaSalvar = Object.entries(contagemFisica)
      .filter(([_, value]) => value !== "")
      .map(([itemId, value]) => ({
        itemId,
        quantidadeFisica: parseFloat(value)
      }));

    if (itensParaSalvar.length === 0) {
      toast({
        title: "Nenhuma alteração",
        description: "Informe a contagem física de pelo menos um item."
      });
      return;
    }

    setSaving(true);
    try {
      await api.post(`/escolas/${selectedEscolaId}/inventario`, {
        itens: itensParaSalvar
      });
      toast({
        title: "Sucesso!",
        description: "Inventário físico processado e registrado no histórico.",
        className: "bg-emerald-50 text-emerald-900 border-emerald-200"
      });
      fetchEstoque();
      fetchHistorico();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro ao salvar",
        description: "Não foi possível registrar o inventário."
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header unificado */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <ClipboardCheck className="h-8 w-8 text-blue-600" />
            Gestão de Inventário
          </h1>
          <p className="text-slate-500 mt-1 text-sm font-medium">Controle físico e histórico de auditoria de estoque.</p>
        </div>

        <div className="w-full md:w-80 space-y-2">
          <Label className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">Selecione a Escola</Label>
          <Select value={selectedEscolaId} onValueChange={setSelectedEscolaId}>
            <SelectTrigger className="h-11 bg-white border-slate-200 shadow-sm">
              <SelectValue placeholder="Escolha uma unidade..." />
            </SelectTrigger>
            <SelectContent>
              {escolas.map((escola) => (
                <SelectItem key={escola.id} value={escola.id}>
                  {escola.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!selectedEscolaId ? (
        <Card className="border-dashed border-2 bg-slate-50/50 shadow-none">
          <CardContent className="flex flex-col items-center justify-center py-24 text-center">
            <div className="h-20 w-20 bg-blue-100/50 rounded-full flex items-center justify-center mb-6">
              <PackageSearch className="h-10 w-10 text-blue-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Aguardando Seleção</h3>
            <p className="text-slate-500 max-w-sm mt-2 font-medium">
              Selecione uma escola acima para gerenciar o estoque e visualizar o histórico.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="lancamento" className="space-y-6">
          <TabsList className="bg-slate-100 p-1 rounded-lg w-full flex h-auto">
            <TabsTrigger value="lancamento" className="flex-1 py-3 px-6 rounded-md font-bold data-[state=active]:bg-white data-[state=active]:text-blue-600 shadow-sm transition-all">
              <Save className="h-4 w-4 mr-2" />
              Lançamento
            </TabsTrigger>
            <TabsTrigger value="auditoria" className="flex-1 py-3 px-6 rounded-md font-bold data-[state=active]:bg-white data-[state=active]:text-blue-600 shadow-sm transition-all">
              <History className="h-4 w-4 mr-2" />
              Histórico
            </TabsTrigger>
          </TabsList>

          <TabsContent value="lancamento" className="animate-in fade-in slide-in-from-left-2 duration-300">
            <Card className="shadow-md border-slate-200 overflow-hidden bg-white">
              <CardHeader className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between border-b border-slate-100 bg-slate-50/30 px-6 py-6">
                <div className="space-y-1">
                  <CardTitle className="text-xl text-slate-800 font-bold">Planilha de Contagem</CardTitle>
                  <CardDescription className="text-slate-500 font-medium">Atualize o estoque real disponível hoje.</CardDescription>
                </div>
                <Button
                  onClick={handleSave}
                  disabled={saving || Object.keys(contagemFisica).length === 0}
                  className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20 px-8 font-bold h-11 transition-all active:scale-95"
                >
                  <Save className="mr-2 h-5 w-5" />
                  {saving ? 'Processando...' : 'Salvar e Registrar'}
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                {loading ? (
                  <div className="py-20 text-center flex flex-col items-center gap-3">
                    <div className="h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    <span className="text-slate-400 font-medium">Carregando itens...</span>
                  </div>
                ) : (
                  <>
                    {/* Visualização em Tabela (Desktop) */}
                    <div className="hidden md:block max-h-[60vh] overflow-y-auto relative border-b border-slate-100 custom-scrollbar">
                      <Table>
                        <TableHeader className="bg-white sticky top-0 z-10 shadow-sm">
                          <TableRow className="hover:bg-transparent border-b border-slate-100">
                            <TableHead className="font-bold text-slate-700 px-8 py-4 h-14">Item / Produto</TableHead>
                            <TableHead className="font-bold text-slate-700 text-center h-14">Unidade</TableHead>
                            <TableHead className="font-bold text-slate-700 text-center h-14">Estoque Teórico</TableHead>
                            <TableHead className="font-bold text-slate-700 text-center w-48 h-14">Contagem Física</TableHead>
                            <TableHead className="font-bold text-slate-700 text-center h-14">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {items.map((item) => {
                            const teorico = estoqueAtual[item.id] || 0;
                            const hasChanged = contagemFisica[item.id] !== undefined && contagemFisica[item.id] !== "";

                            return (
                              <TableRow key={item.id} className={`hover:bg-slate-50/80 transition-all border-b border-slate-100 ${hasChanged ? 'bg-blue-50/30' : ''}`}>
                                <TableCell className="px-8 py-4 font-semibold text-slate-800">{item.name}</TableCell>
                                <TableCell className="text-center">
                                  <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-[10px] font-bold uppercase tracking-wider">
                                    {item.unidadeMedida || 'UN'}
                                  </span>
                                </TableCell>
                                <TableCell className="text-center font-medium text-slate-500">{teorico}</TableCell>
                                <TableCell className="px-8 py-4">
                                  <Input
                                    type="number"
                                    step="1"
                                    placeholder="0"
                                    onKeyDown={(e) => ['e', 'E', '+', '-', '.', ','].includes(e.key) && e.preventDefault()}
                                    value={contagemFisica[item.id] || ""}
                                    onChange={(e) => handleInputChange(item.id, e.target.value)}
                                    className={`h-11 font-bold text-center transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${hasChanged ? 'border-blue-500 ring-2 ring-blue-500/10' : 'bg-slate-50/50'}`} />
                                </TableCell>
                                <TableCell className="text-center">
                                  <button onClick={() => handleOpenDescarte(item)} className="text-red-600 hover:text-red-800 flex items-center justify-center gap-1 text-sm font-medium w-full">
                                    <Trash2 size={16} /> Baixa
                                  </button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Visualização em Cards (Mobile) */}
                    <div className="grid grid-cols-1 gap-4 md:hidden p-4 bg-slate-50/50">
                      {items.map((item) => {
                        const teorico = estoqueAtual[item.id] || 0;
                        const hasChanged = contagemFisica[item.id] !== undefined && contagemFisica[item.id] !== "";

                        return (
                          <div key={item.id} className={`bg-white rounded-xl border p-4 shadow-sm space-y-4 transition-all ${hasChanged ? 'border-blue-300 ring-1 ring-blue-100' : 'border-slate-200'}`}>
                            <div className="flex justify-between items-start">
                              <h3 className="font-bold text-slate-800 text-base leading-tight flex-1">{item.name}</h3>
                              <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px] font-black uppercase tracking-widest ml-2">
                                {item.unidadeMedida || 'UN'}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-slate-400 font-medium tracking-tight">Estoque no Sistema:</span>
                              <span className="font-bold text-slate-600">{teorico}</span>
                            </div>

                            <div className="pt-3 border-t border-slate-100 space-y-2">
                              <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Contagem Física</Label>
                              <Input
                                type="number"
                                step="1"
                                placeholder="0"
                                onKeyDown={(e) => ['e', 'E', '+', '-', '.', ','].includes(e.key) && e.preventDefault()}
                                value={contagemFisica[item.id] || ""}
                                onChange={(e) => handleInputChange(item.id, e.target.value)}
                                className="h-12 text-lg font-black text-center bg-slate-50/50 border-slate-200 focus:bg-white focus:border-blue-500 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              />
                            </div>
                            <button onClick={() => handleOpenDescarte(item)} className="w-full mt-2 py-2 flex items-center justify-center gap-2 text-red-600 hover:bg-red-50 rounded-md transition-colors border border-red-100 font-bold text-sm">
                              <Trash2 size={16} /> Dar Baixa (Descarte)
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
                </CardContent>
              </Card>

              {/* Modal de Quebra/Descarte */}
              <Dialog open={isDescarteModalOpen} onOpenChange={setIsDescarteModalOpen}>
                <DialogContent className="max-w-md bg-white">
                  <DialogHeader>
                    <DialogTitle className="text-red-600 flex items-center gap-2">
                      <Trash2 className="h-5 w-5" />
                      Registrar Quebra de Estoque
                    </DialogTitle>
                    <DialogDescription>
                      Abaixe o saldo de itens vencidos, avariados ou descartados.
                    </DialogDescription>
                  </DialogHeader>
                  
                  {itemToDescarte && (
                    <div className="space-y-4 my-4">
                      <div className="bg-slate-50 p-3 rounded-md border border-slate-100">
                        <Label className="text-xs text-slate-500 uppercase font-bold">Item Selecionado</Label>
                        <div className="font-bold text-slate-800 text-lg">{itemToDescarte.name}</div>
                        <div className="text-sm text-slate-500">Saldo Atual: {estoqueAtual[itemToDescarte.id] || 0} {itemToDescarte.unidadeMedida || 'UN'}</div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="qtdDescarte">Quantidade a Descartar</Label>
                        <Input 
                          id="qtdDescarte"
                          type="number" 
                          min="0.1" 
                          step="0.1"
                          value={descarteQuantidade} 
                          onChange={(e) => setDescarteQuantidade(e.target.value)} 
                          placeholder="0"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Motivo do Descarte</Label>
                        <Select value={descarteMotivo} onValueChange={setDescarteMotivo}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um motivo..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Vencimento">Vencimento</SelectItem>
                            <SelectItem value="Avaria/Dano">Avaria/Dano</SelectItem>
                            <SelectItem value="Pragas/Insetos">Pragas/Insetos</SelectItem>
                            <SelectItem value="Outros">Outros</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="obsDescarte">Observação (Opcional)</Label>
                        <Input 
                          id="obsDescarte"
                          value={descarteObservacao} 
                          onChange={(e) => setDescarteObservacao(e.target.value)} 
                          placeholder="Detalhes adicionais..."
                        />
                      </div>
                    </div>
                  )}

                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsDescarteModalOpen(false)}>Cancelar</Button>
                    <Button 
                      className="bg-blue-600 text-white hover:bg-blue-700 font-bold"
                      onClick={handleConfirmDescarte} 
                      disabled={isDescartando || !descarteQuantidade || !descarteMotivo}
                    >
                      {isDescartando ? "Processando..." : "Confirmar Baixa"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </TabsContent>

          <TabsContent value="auditoria" className="animate-in fade-in slide-in-from-right-2 duration-300">
            <div className="space-y-6">
              {/* Filtros de Auditoria */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-slate-400">Mês</Label>
                  <Select value={mes} onValueChange={setMes}>
                    <SelectTrigger className="bg-slate-50 border-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {meses.map(m => (
                        <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-slate-400">Ano</Label>
                  <Select value={ano} onValueChange={setAno}>
                    <SelectTrigger className="bg-slate-50 border-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {anos.map(a => (
                        <SelectItem key={a} value={a}>{a}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button variant="outline" className="w-full" onClick={fetchHistorico}>
                    <CalendarDays className="h-4 w-4 mr-2" />
                    Atualizar Auditoria
                  </Button>
                </div>
              </div>

              <Card className="shadow-md border-slate-200 overflow-hidden bg-white">
                <CardHeader className="bg-slate-900 text-white px-6 py-6">
                  <div className="flex items-center gap-3">
                    <div className="bg-white/10 p-2 rounded-lg">
                      <FileSearch className="h-5 w-5 text-blue-400" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Registros de Auditoria</CardTitle>
                      <CardDescription className="text-slate-400">Histórico de todas as contagens realizadas no período.</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {loadingHistory ? (
                    <div className="py-20 text-center text-slate-400">Buscando histórico...</div>
                  ) : historico.length === 0 ? (
                    <div className="py-20 text-center flex flex-col items-center gap-4">
                      <PackageSearch className="h-12 w-12 text-slate-200" />
                      <p className="text-slate-400 font-medium italic">Nenhum registro encontrado para este período.</p>
                    </div>
                  ) : (
                    <>
                      {/* Visualização em Tabela (Desktop) */}
                      <div className="hidden md:block">
                        <Table>
                          <TableHeader className="bg-slate-50">
                            <TableRow>
                              <TableHead className="font-bold text-slate-700 px-8 py-4">Data/Hora</TableHead>
                              <TableHead className="font-bold text-slate-700">Item</TableHead>
                              <TableHead className="font-bold text-slate-700 text-center">Teórico Anterior</TableHead>
                              <TableHead className="font-bold text-slate-700 text-center">Contagem Física</TableHead>
                              <TableHead className="font-bold text-slate-700 text-center">Divergência</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {historico.map((h) => {
                              const diff = h.quantidadeFisica - h.estoqueTeoricoNoMomento;
                              return (
                                <TableRow key={h.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                                  <TableCell className="px-8 py-4 font-medium text-slate-500 text-xs">
                                    {format(new Date(h.dataContagem), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                                  </TableCell>
                                  <TableCell className="font-bold text-slate-800">{h.item.name}</TableCell>
                                  <TableCell className="text-center font-medium text-slate-400">{h.estoqueTeoricoNoMomento}</TableCell>
                                  <TableCell className="text-center font-black text-slate-900">{h.quantidadeFisica}</TableCell>
                                  <TableCell className="text-center">
                                    <span className={`px-2 py-1 rounded text-[10px] font-bold ${diff === 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                                      {diff > 0 ? `+${diff}` : diff}
                                    </span>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>

                      {/* Visualização em Cards (Mobile) */}
                      <div className="grid grid-cols-1 gap-3 md:hidden p-4 bg-slate-50/50">
                        {historico.map((h) => {
                          const diff = h.quantidadeFisica - h.estoqueTeoricoNoMomento;
                          return (
                            <div key={h.id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
                              <div className="flex justify-between items-center">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                  {format(new Date(h.dataContagem), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                                </span>
                                {diff !== 0 && (
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${diff > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                    {diff > 0 ? `Sobra: +${diff}` : `Falta: ${diff}`}
                                  </span>
                                )}
                              </div>

                              <h3 className="font-bold text-slate-800 text-base">{h.item.name}</h3>

                              <div className="flex items-center justify-between bg-slate-50 rounded-lg p-3 border border-slate-100">
                                <div className="text-center flex-1">
                                  <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Teórico</p>
                                  <p className="text-sm font-bold text-slate-500">{h.estoqueTeoricoNoMomento}</p>
                                </div>
                                <div className="text-slate-300">➔</div>
                                <div className="text-center flex-1">
                                  <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Físico</p>
                                  <p className={`text-sm font-black ${diff !== 0 ? 'text-blue-600' : 'text-slate-700'}`}>
                                    {h.quantidadeFisica}
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
