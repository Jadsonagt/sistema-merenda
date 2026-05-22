import { useState, useEffect, useRef } from 'react';
import {
  Plus,
  Trash2,
  Pencil,
  ClipboardList,
  School,
  AlertCircle,
  Search,
  Check,
  ChevronDown,
  Copy
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { getEscolas, type Escola } from '@/services/api/escolas';
import { getItems, type Item } from '@/services/api/items';
import {
  getConsumosFixosByEscola,
  saveConsumoFixo,
  deleteConsumoFixo,
  type ConsumoFixo
} from '@/services/api/consumos';

export const ConsumosFixosList = () => {
  const [escolas, setEscolas] = useState<Escola[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [selectedEscolaId, setSelectedEscolaId] = useState<string>("");
  const [consumos, setConsumos] = useState<ConsumoFixo[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingConsumo, setEditingConsumo] = useState<ConsumoFixo | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [quantidade, setQuantidade] = useState<string>("");
  const [frequencia, setFrequencia] = useState<'DIARIO' | 'SEMANAL'>('DIARIO');
  const [cart, setCart] = useState<{ item: Item; quantidade: string }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Import State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importOriginEscolaId, setImportOriginEscolaId] = useState<string>("");
  const [isImporting, setIsImporting] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const loadInitialData = async () => {
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
          description: "Não foi possível carregar os dados iniciais."
        });
      }
    };
    loadInitialData();
  }, [toast]);

  useEffect(() => {
    if (selectedEscolaId) {
      fetchConsumos();
    } else {
      setConsumos([]);
    }
  }, [selectedEscolaId]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const fetchConsumos = async () => {
    if (!selectedEscolaId) return;
    setLoading(true);
    try {
      const data = await getConsumosFixosByEscola(selectedEscolaId);
      const sortedData = [...data].sort((a, b) => a.item.name.localeCompare(b.item.name));
      setConsumos(sortedData);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível carregar os consumos fixos."
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (consumo?: ConsumoFixo) => {
    if (consumo) {
      setEditingConsumo(consumo);
      setSelectedItemId(consumo.itemId);
      setSearchTerm(consumo.item.name);
      setQuantidade(String(consumo.quantidadeDiaria));
      setFrequencia(consumo.frequencia || 'DIARIO');
    } else {
      setEditingConsumo(null);
      setSelectedItemId("");
      setSearchTerm("");
      setQuantidade("");
      setFrequencia('DIARIO');
    }
    setCart([]);
    setIsDropdownOpen(false);
    setIsModalOpen(true);
  };

  const handleSelectItem = (item: Item) => {
    if (editingConsumo) {
      setSelectedItemId(item.id);
      setSearchTerm(item.name);
    } else {
      if (cart.some(c => c.item.id === item.id)) {
         toast({ variant: "destructive", title: "Atenção", description: "Item já adicionado à lista." });
      } else {
         setCart([...cart, { item, quantidade: "1" }]);
         setSearchTerm("");
      }
    }
    setIsDropdownOpen(false);
  };

  const handleUpdateCartQuantity = (itemId: string, newQuantidade: string) => {
    setCart(cart.map(c => c.item.id === itemId ? { ...c, quantidade: newQuantidade } : c));
  };

  const handleRemoveFromCart = (itemId: string) => {
    setCart(cart.filter(c => c.item.id !== itemId));
  };

  const handleSave = async () => {
    if (editingConsumo) {
      if (!selectedItemId || !quantidade) {
        toast({ variant: "destructive", title: "Atenção", description: "Preencha todos os campos." });
        return;
      }
      setIsSubmitting(true);
      try {
        await saveConsumoFixo(selectedEscolaId, {
          itemId: selectedItemId,
          quantidadeDiaria: parseFloat(quantidade),
          frequencia
        });
        toast({ className: "bg-emerald-50 text-emerald-900 border-emerald-200", title: "Sucesso", description: "Consumo atualizado com sucesso." });
        setIsModalOpen(false);
        fetchConsumos();
      } catch (error) {
        toast({ variant: "destructive", title: "Erro", description: "Não foi possível atualizar o consumo." });
      } finally { setIsSubmitting(false); }
    } else {
      // Criação em lote
      if (cart.length === 0) {
        toast({ variant: "destructive", title: "Atenção", description: "Adicione pelo menos um item à lista de inclusão." });
        return;
      }
      setIsSubmitting(true);
      try {
        await Promise.all(cart.map(c => saveConsumoFixo(selectedEscolaId, {
          itemId: c.item.id,
          quantidadeDiaria: parseFloat(c.quantidade),
          frequencia
        })));
        toast({ className: "bg-emerald-50 text-emerald-900 border-emerald-200", title: "Sucesso", description: `${cart.length} itens adicionados com sucesso.` });
        setIsModalOpen(false);
        fetchConsumos();
      } catch (error) {
        toast({ variant: "destructive", title: "Erro", description: "Erro ao salvar os itens em lote." });
      } finally { setIsSubmitting(false); }
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteConsumoFixo(id);
      toast({
        title: "Removido",
        description: "Consumo fixo removido com sucesso."
      });
      fetchConsumos();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao remover o item."
      });
    }
  };

  const handleImport = async () => {
    if (!importOriginEscolaId) {
      toast({ variant: "destructive", title: "Atenção", description: "Selecione uma escola de origem." });
      return;
    }
    setIsImporting(true);
    try {
      const consumosOrigin = await getConsumosFixosByEscola(importOriginEscolaId);
      const existingItemIds = consumos.map(c => c.itemId);
      const itemsToImport = consumosOrigin.filter(c => !existingItemIds.includes(c.itemId));

      if (itemsToImport.length === 0) {
        toast({ title: "Aviso", description: "Nenhum item novo para importar desta escola." });
        setIsImportModalOpen(false);
        return;
      }

      await Promise.all(itemsToImport.map(c => saveConsumoFixo(selectedEscolaId, {
        itemId: c.itemId,
        quantidadeDiaria: c.quantidadeDiaria
      })));

      toast({ className: "bg-emerald-50 text-emerald-900 border-emerald-200", title: "Sucesso", description: `${itemsToImport.length} itens importados com sucesso.` });
      setIsImportModalOpen(false);
      setImportOriginEscolaId("");
      fetchConsumos();
    } catch (error) {
      toast({ variant: "destructive", title: "Erro", description: "Falha ao importar consumos." });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header & Escola Selector */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <ClipboardList className="h-8 w-8 text-blue-600" />
            Consumo Fixo Diário
          </h1>
          <p className="text-slate-500 mt-1 text-sm font-medium">Itens consumidos diariamente independente do cardápio.</p>
        </div>

        <div className="w-full md:w-80 space-y-2">
          <Label className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">Selecionar Unidade Escolar</Label>
          <Select value={selectedEscolaId} onValueChange={setSelectedEscolaId}>
            <SelectTrigger className="h-11 bg-white border-slate-200 shadow-sm focus:ring-2 focus:ring-blue-500/20 transition-all">
              <SelectValue placeholder="Escolha uma escola..." />
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
            <div className="h-20 w-20 bg-blue-100/50 rounded-full flex items-center justify-center mb-6 animate-pulse">
              <School className="h-10 w-10 text-blue-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Selecione uma Escola</h3>
            <p className="text-slate-500 max-w-sm mt-2 font-medium">
              Para visualizar ou configurar o consumo fixo, escolha uma unidade escolar no seletor acima.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-md border-slate-200 overflow-hidden bg-white">
          <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-slate-100 bg-slate-50/30 px-6 py-6 gap-4">
            <div className="space-y-1">
              <CardTitle className="text-xl text-slate-800 font-bold">Itens em Consumo</CardTitle>
              <CardDescription className="text-slate-500 font-medium">Insumos com saída automática para a unidade selecionada.</CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row flex-wrap gap-2 w-full md:w-auto">
              <Button onClick={() => setIsImportModalOpen(true)} variant="outline" className="w-full sm:w-auto text-blue-600 border-blue-200 hover:bg-blue-50 px-4 font-semibold shadow-sm">
                <Copy className="mr-2 h-4 w-4 shrink-0" /> Importar Padrão
              </Button>
              <Button onClick={() => handleOpenModal()} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20 px-6 font-semibold">
                <Plus className="mr-2 h-4 w-4 shrink-0" /> Adicionar Item
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="py-20 text-center flex flex-col items-center gap-3">
                <div className="h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <span className="text-slate-400 font-medium">Buscando configurações...</span>
              </div>
            ) : consumos.length === 0 ? (
              <div className="py-20 text-center flex flex-col items-center gap-4">
                <div className="h-12 w-12 bg-slate-100 rounded-full flex items-center justify-center">
                  <AlertCircle className="h-6 w-6 text-slate-400" />
                </div>
                <div className="space-y-1">
                  <p className="text-slate-800 font-bold">Nenhum consumo configurado</p>
                  <p className="text-slate-400 text-sm">Adicione o primeiro item para esta escola usando o botão acima.</p>
                </div>
              </div>
            ) : (
              <>
                {/* Visualização em Tabela (Desktop) */}
                <div className="hidden md:block">
                  <Table>
                    <TableHeader className="bg-slate-50/80">
                      <TableRow>
                        <TableHead className="font-bold text-slate-700 px-8 py-4 h-14">Nome do Item</TableHead>
                        <TableHead className="font-bold text-slate-700 text-center h-14">Unidade</TableHead>
                        <TableHead className="font-bold text-slate-700 text-center h-14">Quantidade Diária</TableHead>
                        <TableHead className="font-bold text-slate-700 text-right px-8 h-14">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {consumos.map((c) => (
                        <TableRow key={c.id} className="hover:bg-slate-50/80 transition-all border-b border-slate-100">
                          <TableCell className="px-8 py-5 font-semibold text-slate-800">{c.item.name}</TableCell>
                          <TableCell className="text-center">
                            <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-[10px] font-bold uppercase tracking-wider">
                              {c.item.baseUnit || 'un'}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="inline-flex items-center justify-center px-4 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm font-black border border-blue-100 shadow-sm">
                              {c.quantidadeDiaria}
                            </div>
                          </TableCell>
                          <TableCell className="text-right px-8 py-5">
                            <div className="flex justify-end gap-3">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-9 px-3 text-slate-600 hover:text-blue-600 hover:bg-blue-50 border-slate-200 hover:border-blue-200 transition-all"
                                onClick={() => handleOpenModal(c)}
                              >
                                <Pencil className="h-4 w-4 mr-2" />
                                Editar
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-9 px-3 text-slate-400 hover:text-red-600 hover:bg-red-50 border-slate-200 hover:border-red-200 transition-all"
                                onClick={() => handleDelete(c.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Visualização em Cards (Mobile) */}
                <div className="grid grid-cols-1 gap-4 md:hidden px-6 pb-6">
                  {consumos.map((c) => (
                    <div key={c.id} className="bg-slate-50 rounded-xl border p-4 shadow-sm space-y-4">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <h3 className="font-bold text-slate-800 text-lg leading-tight">{c.item.name}</h3>
                          <span className="inline-flex items-center rounded-full bg-slate-200 px-2.5 py-0.5 text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                            Unidade: {c.item.baseUnit || 'un'}
                          </span>
                        </div>
                        <div className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-lg font-black shadow-md">
                          {c.quantidadeDiaria}
                        </div>
                      </div>

                      <div className="pt-4 border-t border-slate-200 flex gap-2">
                        <Button 
                          variant="outline" 
                          className="flex-1 bg-white border-slate-200 text-slate-600"
                          onClick={() => handleOpenModal(c)}
                        >
                          <Pencil className="h-4 w-4 mr-2" /> Editar
                        </Button>
                        <Button 
                          variant="outline" 
                          className="flex-none bg-white border-slate-200 text-red-600 hover:bg-red-50"
                          onClick={() => handleDelete(c.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent
          className="bg-white text-slate-900 sm:max-w-[480px] p-0 overflow-visible rounded-2xl border-none shadow-2xl"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader className="p-8">
            <DialogTitle className="text-2xl font-bold text-slate-900">{editingConsumo ? 'Editar' : 'Novo'} Consumo Fixo</DialogTitle>
            <DialogDescription className="text-slate-500 text-base mt-2">
              Defina a quantidade de saída automática por dia letivo para esta unidade.
            </DialogDescription>
          </DialogHeader>

          <div className="p-8 space-y-6">
            <div className="flex flex-col gap-4 py-4 md:py-6 relative">
              <Label className="text-sm font-bold text-slate-700 ml-1">Item do Catálogo</Label>
              <div className="relative group" ref={dropdownRef}>
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                <Input
                  placeholder="Pesquisar e adicionar itens..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    if (!isDropdownOpen) setIsDropdownOpen(true);
                    if (selectedItemId) setSelectedItemId(""); // Reset selection if user starts typing
                  }}
                  onFocus={() => setIsDropdownOpen(true)}
                  disabled={!!editingConsumo}
                  className="h-12 text-base pl-11 pr-10 bg-slate-50 border-slate-200 focus:ring-2 focus:ring-blue-500/20 font-medium"
                />
                <ChevronDown className={`absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />

              {isDropdownOpen && !editingConsumo && (
                <div className="absolute top-[calc(100%+4px)] left-0 z-50 w-full bg-white border border-slate-200 rounded-xl shadow-2xl max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
                  {items.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 ? (
                    <div className="p-4 text-center text-slate-400 text-sm italic">Nenhum item encontrado.</div>
                  ) : (
                    items
                      .filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()))
                      .map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 cursor-pointer transition-colors border-b border-slate-50 last:border-none"
                          onClick={() => handleSelectItem(item)}
                        >
                          <span className={`text-sm font-medium ${selectedItemId === item.id ? 'text-blue-600' : 'text-slate-700'}`}>
                            {item.name}
                          </span>
                          {selectedItemId === item.id && <Check className="h-4 w-4 text-blue-600" />}
                        </div>
                      ))
                  )}
                </div>
              )}
              </div>
              {!editingConsumo && (
                <p className="text-xs text-slate-500 mt-2 flex items-center gap-1.5">
                  <span className="text-blue-500 font-bold">*</span> Você pode pesquisar e adicionar quantos itens desejar à cesta antes de salvar.
                </p>
              )}
            </div>

            {editingConsumo && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2.5">
                  <Label className="text-sm font-bold text-slate-700 ml-1">
                    Quantidade {selectedItemId ? `(${items.find(i => i.id === selectedItemId)?.baseUnit})` : '(na Unidade Base)'}
                  </Label>
                  <div className="relative">
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Ex: 0.5"
                      value={quantidade}
                      onChange={(e) => setQuantidade(e.target.value)}
                      className="h-12 bg-slate-50 border-slate-200 pl-4 pr-12 font-bold text-lg focus:ring-2 focus:ring-blue-500/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs uppercase tracking-widest">
                      {selectedItemId ? items.find(i => i.id === selectedItemId)?.baseUnit : 'unid.'}
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400 italic ml-1">* Use ponto para decimais (ex: 1.5)</p>
                </div>
                
                <div className="space-y-2.5">
                  <Label className="text-sm font-bold text-slate-700 ml-1">
                    Frequência de Saída
                  </Label>
                  <Select value={frequencia} onValueChange={(val) => setFrequencia(val as 'DIARIO' | 'SEMANAL')}>
                    <SelectTrigger className="h-12 bg-slate-50 border-slate-200 focus:ring-2 focus:ring-blue-500/20 font-medium">
                      <SelectValue placeholder="Selecione a frequência" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DIARIO">Diário</SelectItem>
                      <SelectItem value="SEMANAL">Semanal</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-slate-400 italic ml-1">* Quando o estoque será abatido</p>
                </div>
              </div>
            )}


            {/* Lista Temporária (Carrinho) */}
            {!editingConsumo && cart.length > 0 && (
               <div className="pt-6 mt-6 border-t border-slate-100 space-y-6">
                 {/* Frequencia Global para Lote */}
                 <div className="space-y-2.5">
                   <Label className="text-sm font-bold text-slate-700 ml-1">Frequência de Saída (Lote)</Label>
                   <Select value={frequencia} onValueChange={(val) => setFrequencia(val as 'DIARIO' | 'SEMANAL')}>
                     <SelectTrigger className="h-12 bg-slate-50 border-slate-200 focus:ring-2 focus:ring-blue-500/20 font-medium max-w-xs">
                       <SelectValue placeholder="Selecione a frequência" />
                     </SelectTrigger>
                     <SelectContent>
                       <SelectItem value="DIARIO">Diário</SelectItem>
                       <SelectItem value="SEMANAL">Semanal</SelectItem>
                     </SelectContent>
                   </Select>
                 </div>

                 <div className="border border-blue-100 rounded-xl overflow-hidden bg-white shadow-sm ring-4 ring-blue-50/50 transition-all animate-in fade-in slide-in-from-top-4">
                   <div className="bg-blue-50/80 px-4 py-3 border-b border-blue-100 flex justify-between items-center">
                     <span className="font-bold text-blue-900 text-sm flex items-center gap-2">
                       <ClipboardList className="h-4 w-4 text-blue-600" />
                       Cesta de Inclusão
                     </span>
                     <span className="bg-white text-blue-700 text-[10px] font-black px-2.5 py-1 rounded-full shadow-sm border border-blue-100">
                       {cart.length} {cart.length === 1 ? 'item' : 'itens'}
                     </span>
                   </div>
                   <ul className="divide-y divide-slate-50 max-h-48 overflow-y-auto">
                   {cart.map(c => (
                     <li key={c.item.id} className="p-3 flex justify-between items-center hover:bg-slate-50 transition-colors">
                       <div className="flex flex-col flex-1">
                         <span className="text-sm font-bold text-slate-800 leading-tight">{c.item.name}</span>
                         <span className="text-[10px] font-medium text-slate-400 mt-0.5 uppercase tracking-wider">
                           Unidade: {c.item.baseUnit}
                         </span>
                       </div>
                       <div className="flex items-center gap-2">
                         <Input 
                           type="number"
                           step="0.01"
                           value={c.quantidade}
                           onChange={(e) => handleUpdateCartQuantity(c.item.id, e.target.value)}
                           className="w-24 h-9 font-bold text-center text-sm focus:ring-blue-500/20"
                         />
                         <Button 
                           variant="ghost" 
                           size="sm" 
                           onClick={() => handleRemoveFromCart(c.item.id)} 
                           className="text-slate-400 hover:text-red-600 hover:bg-red-50 h-9 w-9 p-0 shrink-0"
                         >
                           <Trash2 className="h-4 w-4"/>
                         </Button>
                       </div>
                     </li>
                   ))}
                   </ul>
                 </div>
               </div>
            )}
          </div>

          <DialogFooter className="bg-slate-50 p-6 pt-4 mt-2 flex flex-row gap-3 border-t border-slate-100 rounded-b-2xl">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)} className="flex-1 font-bold text-slate-500 hover:bg-slate-200">
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold h-11 shadow-lg shadow-blue-500/20"
              disabled={isSubmitting || (!editingConsumo && cart.length === 0)}
            >
              {isSubmitting ? 'Processando...' : editingConsumo ? 'Atualizar' : `Salvar ${cart.length > 0 ? `(${cart.length})` : ''}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Importação */}
      <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
        <DialogContent className="sm:max-w-[420px] rounded-2xl border-none shadow-2xl p-0 overflow-hidden">
          <DialogHeader className="bg-slate-900 text-white p-6 pb-8">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Copy className="h-5 w-5 text-blue-400" />
              Importar Consumo
            </DialogTitle>
            <DialogDescription className="text-slate-400 mt-2">
              Selecione a unidade escolar de origem para copiar o padrão de consumo para a unidade atual. Itens já existentes não serão duplicados.
            </DialogDescription>
          </DialogHeader>
          <div className="p-6 space-y-4 bg-white -mt-4 rounded-t-2xl relative z-10">
            <div className="space-y-2">
              <Label className="text-sm font-bold text-slate-700 ml-1">Escola de Origem</Label>
              <Select value={importOriginEscolaId} onValueChange={setImportOriginEscolaId}>
                <SelectTrigger className="h-12 bg-slate-50 border-slate-200">
                  <SelectValue placeholder="Escolha a escola de origem..." />
                </SelectTrigger>
                <SelectContent>
                  {escolas.filter(e => e.id !== selectedEscolaId).map((escola) => (
                    <SelectItem key={escola.id} value={escola.id}>
                      {escola.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="bg-slate-50 p-6 flex flex-row gap-3 border-t border-slate-100 rounded-b-2xl">
            <Button variant="ghost" onClick={() => setIsImportModalOpen(false)} disabled={isImporting} className="flex-1 font-bold text-slate-500 hover:bg-slate-200">
              Cancelar
            </Button>
            <Button onClick={handleImport} disabled={isImporting || !importOriginEscolaId} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold h-11 shadow-lg shadow-blue-500/20">
              {isImporting ? 'Importando...' : 'Confirmar Importação'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

