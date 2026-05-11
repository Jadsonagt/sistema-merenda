import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, X, Search, Pencil, Copy, LinkIcon, AlertTriangle, UtensilsCrossed, ChefHat, Package } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { api } from '../../services/api';
import { getFichas, type Ficha } from '../../services/api/fichas';

const getHeaders = () => {
  const token = localStorage.getItem('token');
  return { headers: { Authorization: `Bearer ${token}` } };
};

interface PreparoIngrediente {
  id: string;
  itemId: string;
  quantidade: number;
  item: { id: string; name: string; baseUnit: string; packagingSize: number };
}

interface Preparo {
  id: string;
  escolaId: string;
  fichaTecnicaId: string;
  fichaTecnica: { id: string; name: string; type: string };
  ingredientes: PreparoIngrediente[];
}

interface CatalogoItem {
  id: string;
  name: string;
  baseUnit: string;
}

interface IngForm {
  itemId: string;
  quantidade: number | '';
}

interface Props {
  escolaId: string;
  escolaNome: string;
  open: boolean;
  onClose: () => void;
}

const TIPO_REFEICAO_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  DESJEJUM: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  MERENDA: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
};

const getTypeBadgeStyle = (type: string) => {
  const upper = type?.toUpperCase();
  return TIPO_REFEICAO_COLORS[upper] || { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200' };
};

export const PreparosPanel: React.FC<Props> = ({ escolaId, escolaNome, open, onClose }) => {
  const [preparos, setPreparos] = useState<Preparo[]>([]);
  const [fichas, setFichas] = useState<Ficha[]>([]);
  const [catalogoItems, setCatalogoItems] = useState<CatalogoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('TODOS');

  // Formulário de add/edit preparo
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPreparo, setEditingPreparo] = useState<Preparo | null>(null);
  const [selectedFichaId, setSelectedFichaId] = useState('');
  const [ingredientes, setIngredientes] = useState<IngForm[]>([{ itemId: '', quantidade: '' }]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Exclusão
  const [preparoParaExcluir, setPreparoParaExcluir] = useState<Preparo | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Clonagem
  const [isCloneOpen, setIsCloneOpen] = useState(false);
  const [escolas, setEscolas] = useState<{ id: string, name: string }[]>([]);
  const [escolaOrigemId, setEscolaOrigemId] = useState('');
  const [isCloning, setIsCloning] = useState(false);

  const { toast } = useToast();

  const fetchPreparos = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/escolas/${escolaId}/preparos`, getHeaders());
      setPreparos(res.data);
    } catch (e) {
      console.error('Erro ao buscar preparos:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchFichas = async () => {
    try { const d = await getFichas(); setFichas(d); } catch (e) { console.error(e); }
  };

  const fetchCatalogo = async () => {
    try { const r = await api.get('/items', getHeaders()); setCatalogoItems(r.data); } catch (e) { console.error(e); }
  };

  const fetchEscolas = async () => {
    try {
      const r = await api.get('/escolas', getHeaders());
      // Filtrar a escola atual para não aparecer na lista de origem
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setEscolas(r.data.filter((e: any) => e.id !== escolaId));
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    if (open) {
      setSearchTerm('');
      setFiltroTipo('TODOS');
      fetchPreparos();
      fetchFichas();
      fetchCatalogo();
      fetchEscolas();
    }
  }, [open, escolaId]);

  // Filtro client-side instantâneo
  const filteredPreparos = useMemo(() => {
    let list = preparos;
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      list = list.filter(p => p.fichaTecnica.name.toLowerCase().includes(term));
    }
    if (filtroTipo !== 'TODOS') {
      list = list.filter(p => p.fichaTecnica.type?.toUpperCase() === filtroTipo);
    }
    return list;
  }, [preparos, searchTerm, filtroTipo]);

  // Tipos únicos para filtro (derivados dos dados)
  const tiposUnicos = useMemo(() => {
    const s = new Set(preparos.map(p => p.fichaTecnica.type?.toUpperCase()).filter(Boolean));
    return Array.from(s) as string[];
  }, [preparos]);

  // Contagens por tipo para as tabs
  const contagensPorTipo = useMemo(() => {
    const counts: Record<string, number> = { TODOS: preparos.length };
    preparos.forEach(p => {
      const t = p.fichaTecnica.type?.toUpperCase();
      if (t) counts[t] = (counts[t] || 0) + 1;
    });
    return counts;
  }, [preparos]);

  // Fichas não vinculadas ainda
  const fichasDisponiveis = useMemo(() => {
    const vinculadas = new Set(preparos.map(p => p.fichaTecnicaId));
    return fichas.filter(f => !vinculadas.has(f.id));
  }, [fichas, preparos]);

  // --- Form handlers ---
  const handleOpenAdd = () => {
    setEditingPreparo(null);
    setSelectedFichaId('');
    setIngredientes([{ itemId: '', quantidade: '' }]);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (p: Preparo) => {
    setEditingPreparo(p);
    setSelectedFichaId(p.fichaTecnicaId);
    setIngredientes(p.ingredientes.map(i => ({ itemId: i.itemId, quantidade: i.quantidade })));
    setIsFormOpen(true);
  };

  const handleIngChange = (idx: number, field: keyof IngForm, val: string | number) => {
    setIngredientes(prev => prev.map((ing, i) => {
      if (i !== idx) return ing;
      if (field === 'quantidade') return { ...ing, quantidade: val === '' ? '' : Number(val) };
      if (field === 'itemId') return { ...ing, itemId: String(val) };
      return ing;
    }));
  };

  const handleSubmitForm = async () => {
    const fichaId = editingPreparo ? editingPreparo.fichaTecnicaId : selectedFichaId;
    if (!fichaId) {
      toast({ variant: "destructive", title: "Atenção", description: "Selecione uma ficha técnica." });
      return;
    }
    const validos = ingredientes.filter(i => i.itemId && i.quantidade !== '' && Number(i.quantidade) > 0);
    if (validos.length === 0) {
      toast({ variant: "destructive", title: "Atenção", description: "Adicione pelo menos um ingrediente." });
      return;
    }
    setIsSubmitting(true);
    try {
      await api.post(`/escolas/${escolaId}/preparos`, {
        fichaTecnicaId: fichaId,
        ingredientes: validos.map(i => ({ itemId: i.itemId, quantidade: Number(i.quantidade) })),
      }, getHeaders());
      toast({ className: "bg-emerald-50 text-emerald-900 border-emerald-200", title: "Sucesso", description: "Preparo salvo." });
      setIsFormOpen(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fetchPreparos();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      console.error(e);
      toast({ variant: "destructive", title: "Erro", description: e.response?.data?.error || "Erro ao salvar preparo." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!preparoParaExcluir) return;
    setIsDeleting(true);
    try {
      await api.delete(`/escolas/${escolaId}/preparos/${preparoParaExcluir.fichaTecnicaId}`, getHeaders());
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
      toast({ className: "bg-emerald-50 text-emerald-900 border-emerald-200", title: "Sucesso", description: "Preparo desvinculado." });
      fetchPreparos();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      console.error(e);
      toast({ variant: "destructive", title: "Erro", description: e.response?.data?.error || "Erro ao desvincular." });
    } finally {
      setIsDeleting(false);
      setPreparoParaExcluir(null);
    }
  };

  const handleClone = async () => {
    if (!escolaOrigemId) {
      toast({ variant: "destructive", title: "Atenção", description: "Selecione a escola de origem." });
      return;
    }
    setIsCloning(true);
    try {
      await api.post(`/escolas/${escolaId}/clonar-preparos`, { escolaOrigemId }, getHeaders());
      toast({ className: "bg-emerald-50 text-emerald-900 border-emerald-200", title: "Sucesso", description: "Preparos clonados com sucesso!" });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setIsCloneOpen(false);
      setEscolaOrigemId('');
      fetchPreparos();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      console.error(e);
      toast({ variant: "destructive", title: "Erro na Importação", description: e.response?.data?.error || "Erro ao clonar preparos." });
    } finally {
      setIsCloning(false);
    }
  };

  return (
    <>
      {/* ═══ PAINEL FULL-SCREEN (90% da tela) ═══ */}
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent
          className="w-[95vw] max-w-[1200px] h-[90vh] flex flex-col bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-100 p-0 gap-0 overflow-hidden"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >

          {/* ── Cabeçalho fixo ── */}
          <div className="px-6 pt-6 pb-4 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-amber-50 via-orange-50 to-white dark:from-slate-800 dark:via-slate-800 dark:to-slate-900 flex-shrink-0">
            <DialogHeader className="mb-0">
              <DialogTitle className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <ChefHat className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <span className="block text-lg leading-tight">{escolaNome}</span>
                  <span className="block text-xs font-normal text-slate-500 dark:text-slate-400 mt-0.5">Gestão de Preparos e Ingredientes</span>
                </div>
              </DialogTitle>
              <DialogDescription className="sr-only">
                Configuração de receitas e ingredientes da escola {escolaNome}.
              </DialogDescription>
            </DialogHeader>

            {/* ── Busca + Filtros + Botão ── */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center mt-4">
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="preparos-search"
                  placeholder="Buscar receita pelo nome..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-9 h-9 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-700"
                />
              </div>

              <Tabs value={filtroTipo} onValueChange={setFiltroTipo} className="flex-shrink-0">
                <TabsList className="bg-slate-100 dark:bg-slate-800 h-9">
                  <TabsTrigger value="TODOS" className="text-xs px-3 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                    Todos ({contagensPorTipo['TODOS'] || 0})
                  </TabsTrigger>
                  {tiposUnicos.map(t => (
                    <TabsTrigger key={t} value={t} className="text-xs px-3 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                      {t} ({contagensPorTipo[t] || 0})
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>

              <div className="flex items-center gap-2 flex-shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsCloneOpen(true)}
                  className="h-9 border-slate-200 text-slate-600 font-bold gap-1.5"
                >
                  <Copy className="h-3.5 w-3.5" /> Importar de outra Unidade
                </Button>
                <Button size="sm" onClick={handleOpenAdd} className="bg-blue-600 hover:bg-blue-700 text-white h-9 shadow-sm">
                  <Plus className="mr-1.5 h-3.5 w-3.5" /> Adicionar Novo Preparo
                </Button>
              </div>
            </div>
          </div>

          {/* ── Corpo scrollável ── */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {loading ? (
              <div className="py-16 text-center">
                <div className="inline-flex items-center gap-2 text-slate-400">
                  <div className="h-4 w-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                  Carregando preparos...
                </div>
              </div>
            ) : filteredPreparos.length === 0 ? (
              <div className="py-16 text-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                <UtensilsCrossed className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                  {preparos.length === 0
                    ? 'Nenhum preparo configurado para esta escola.'
                    : 'Nenhum resultado para o filtro aplicado.'}
                </p>
                {preparos.length === 0 && (
                  <Button size="sm" variant="outline" onClick={handleOpenAdd} className="mt-4 text-amber-700 border-amber-300 hover:bg-amber-50">
                    <Plus className="mr-1 h-3 w-3" /> Configurar primeiro preparo
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredPreparos.map(p => {
                  const typeStyle = getTypeBadgeStyle(p.fichaTecnica.type);
                  return (
                    <Card
                      key={p.id}
                      className="shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow duration-200 group"
                    >
                      <CardContent className="p-5">
                        {/* Header do Card */}
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-start gap-3 min-w-0 flex-1">
                            <div className="h-9 w-9 rounded-lg bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <UtensilsCrossed className="h-4 w-4 text-amber-600" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-sm leading-tight truncate">
                                {p.fichaTecnica.name}
                              </h4>
                              <div className="mt-1.5">
                                <Badge className={`${typeStyle.bg} ${typeStyle.text} ${typeStyle.border} border text-[10px] font-semibold px-2 py-0 hover:opacity-90`}>
                                  {p.fichaTecnica.type?.toUpperCase()}
                                </Badge>
                              </div>
                            </div>
                          </div>

                          {/* Ações */}
                          <div className="flex gap-1 ml-2 flex-shrink-0 opacity-70 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 px-2.5 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200 dark:border-blue-800"
                              onClick={() => handleOpenEdit(p)}
                              title="Editar ingredientes"
                            >
                              <Pencil className="h-3 w-3 mr-1" /> Editar
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 px-2.5 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 border-red-200 dark:border-red-800"
                              onClick={() => setPreparoParaExcluir(p)}
                              title="Desvincular preparo"
                            >
                              <LinkIcon className="h-3 w-3 mr-1" /> Desvincular
                            </Button>
                          </div>
                        </div>

                        {/* Ingredientes */}
                        <div className="border-t border-slate-100 dark:border-slate-700 pt-3 mt-1">
                          <div className="flex items-center gap-1.5 mb-2">
                            <Package className="h-3 w-3 text-slate-400" />
                            <span className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">
                              Ingredientes ({p.ingredientes.length})
                            </span>
                          </div>
                          {p.ingredientes.length === 0 ? (
                            <p className="text-xs text-slate-400 italic">Nenhum ingrediente configurado.</p>
                          ) : (
                            <div className="flex flex-wrap gap-1.5">
                              {p.ingredientes.map(ing => (
                                <span
                                  key={ing.id}
                                  className="inline-flex items-center gap-1 text-[11px] bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-md px-2 py-1 border border-slate-150 dark:border-slate-700"
                                >
                                  <span className="font-medium text-slate-700 dark:text-slate-200">{ing.item.name}</span>
                                  <span className="text-slate-400">·</span>
                                  <span className="text-amber-600 dark:text-amber-400 font-semibold">{ing.quantidade}</span>
                                  <span className="text-slate-400">{ing.item.baseUnit}</span>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Rodapé com contagem ── */}
          <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex-shrink-0">
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {filteredPreparos.length} de {preparos.length} preparo{preparos.length !== 1 ? 's' : ''} exibido{filteredPreparos.length !== 1 ? 's' : ''}
              </span>
              <Button variant="outline" size="sm" onClick={onClose} className="h-8 text-xs text-slate-600 border-slate-300">
                Fechar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══ FORMULÁRIO ADD/EDIT INGREDIENTES ═══ */}
      <Dialog open={isFormOpen} onOpenChange={o => !o && setIsFormOpen(false)}>
        <DialogContent
          className="sm:max-w-[560px] max-h-[85vh] overflow-y-auto bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-100"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-slate-100 flex items-center gap-2">
              {editingPreparo ? (
                <><Pencil className="h-4 w-4 text-blue-600" /> Editar Preparo</>
              ) : (
                <><Plus className="h-4 w-4 text-amber-600" /> Novo Preparo</>
              )}
            </DialogTitle>
            <DialogDescription className="text-slate-500 dark:text-slate-400">
              {editingPreparo ? `Editando ingredientes de "${editingPreparo.fichaTecnica.name}"` : 'Selecione a receita e configure os ingredientes.'}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-3">
            {!editingPreparo && (
              <div className="flex flex-col gap-2">
                <Label className="text-slate-900 dark:text-slate-200 font-semibold">Ficha Técnica</Label>
                <Select value={selectedFichaId} onValueChange={setSelectedFichaId}>
                  <SelectTrigger className="bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"><SelectValue placeholder="Selecione a receita" /></SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800">
                    {fichasDisponiveis.map(f => (
                      <SelectItem key={f.id} value={f.id} className="text-slate-900 dark:text-slate-100 focus:bg-slate-100 dark:focus:bg-slate-800">{f.name} ({f.type})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fichasDisponiveis.length === 0 && <p className="text-xs text-amber-600">Todas as fichas já estão vinculadas a esta escola.</p>}
              </div>
            )}

            <div className="border-t border-slate-200 dark:border-slate-700 pt-3">
              <div className="flex justify-between items-center mb-3">
                <Label className="text-slate-900 dark:text-slate-200 font-semibold">Ingredientes</Label>
                <Button type="button" variant="outline" size="sm" onClick={() => setIngredientes(prev => [...prev, { itemId: '', quantidade: '' }])} className="text-amber-700 border-amber-300 hover:bg-amber-50">
                  <Plus className="mr-1 h-3 w-3" /> Ingrediente
                </Button>
              </div>
              {ingredientes.length === 0 ? (
                <p className="text-sm text-slate-400 py-4 text-center border border-dashed rounded-md">Adicione ingredientes.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {ingredientes.map((ing, idx) => (
                    <div key={idx} className="flex items-end gap-2 p-2.5 bg-slate-50 dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700">
                      <div className="flex-1 flex flex-col gap-1">
                        <Label className="text-[10px] text-slate-500">Item</Label>
                        <Select value={ing.itemId} onValueChange={v => handleIngChange(idx, 'itemId', v)}>
                          <SelectTrigger className="bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 h-8 text-xs"><SelectValue placeholder="Selecione" /></SelectTrigger>
                          <SelectContent className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800">
                            {catalogoItems.map(it => (
                              <SelectItem key={it.id} value={it.id} className="text-slate-900 dark:text-slate-100 text-xs focus:bg-slate-100">{it.name} ({it.baseUnit})</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="w-28 flex flex-col gap-1">
                        <Label className="text-[10px] text-slate-500">Qtd</Label>
                        <Input type="number" min="0.01" step="0.01" placeholder="0.00" className="h-8 text-xs" value={ing.quantidade} onChange={e => handleIngChange(idx, 'quantidade', e.target.value === '' ? '' : e.target.value)} />
                      </div>
                      <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-400 hover:text-red-600" onClick={() => setIngredientes(prev => prev.filter((_, i) => i !== idx))}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)} disabled={isSubmitting}>Cancelar</Button>
            <Button onClick={handleSubmitForm} disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white">
              {isSubmitting ? 'Salvando...' : 'Salvar Preparo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ CONFIRMAÇÃO DE EXCLUSÃO ═══ */}
      <AlertDialog open={!!preparoParaExcluir} onOpenChange={o => !o && setPreparoParaExcluir(null)}>
        <AlertDialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-100">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-900 dark:text-slate-100">Desvincular "{preparoParaExcluir?.fichaTecnica.name}"?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500 dark:text-slate-400">Todos os ingredientes deste preparo serão removidos desta escola. Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting} className="text-slate-900 dark:text-slate-100 border-slate-200">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={e => { e.preventDefault(); handleConfirmDelete(); }} disabled={isDeleting} className="bg-red-600 hover:bg-red-700 text-white">
              {isDeleting ? 'Removendo...' : 'Sim, Desvincular'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* ═══ MODAL DE CLONAGEM ═══ */}
      <Dialog open={isCloneOpen} onOpenChange={o => !o && setIsCloneOpen(false)}>
        <DialogContent className="sm:max-w-[420px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-100">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Copy className="h-5 w-5 text-blue-600" /> Importar de outra Unidade
            </DialogTitle>
            <DialogDescription className="text-slate-500 dark:text-slate-400">
              Isso copiará todos os preparos e ingredientes da escola de origem para esta unidade.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label className="text-slate-900 dark:text-slate-200 font-semibold">Selecione a Escola de Origem</Label>
              <Select value={escolaOrigemId} onValueChange={setEscolaOrigemId}>
                <SelectTrigger className="bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100">
                  <SelectValue placeholder="Selecione a unidade..." />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 max-h-[300px]">
                  {escolas?.map(e => (
                    <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="p-3 rounded-md bg-amber-50 border border-amber-100 text-[11px] text-amber-800">
              <AlertTriangle className="h-3 w-3 inline mr-1 mb-0.5" />
              Atenção: Se esta unidade já possuir preparos para as mesmas fichas técnicas, os ingredientes serão <strong>substituídos</strong> pelos da escola de origem.
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCloneOpen(false)} disabled={isCloning}>Cancelar</Button>
            <Button onClick={handleClone} disabled={isCloning} className="bg-blue-600 hover:bg-blue-700 text-white">
              {isCloning ? 'Importando...' : 'Confirmar Importação'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
