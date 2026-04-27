import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, X, Search, Pencil, Trash2, UtensilsCrossed } from 'lucide-react';
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

  useEffect(() => {
    if (open) { fetchPreparos(); fetchFichas(); fetchCatalogo(); }
  }, [open, escolaId]);

  // Filtro client-side
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

  // Tipos únicos para filtro
  const tiposUnicos = useMemo(() => {
    const s = new Set(preparos.map(p => p.fichaTecnica.type?.toUpperCase()).filter(Boolean));
    return Array.from(s) as string[];
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
      return { ...ing, [field]: val };
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
      fetchPreparos();
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
      toast({ className: "bg-emerald-50 text-emerald-900 border-emerald-200", title: "Sucesso", description: "Preparo desvinculado." });
      fetchPreparos();
    } catch (e: any) {
      console.error(e);
      toast({ variant: "destructive", title: "Erro", description: e.response?.data?.error || "Erro ao desvincular." });
    } finally {
      setIsDeleting(false);
      setPreparoParaExcluir(null);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-100">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <UtensilsCrossed className="h-5 w-5 text-amber-600" />
              Preparos — {escolaNome}
            </DialogTitle>
            <DialogDescription className="text-slate-500 dark:text-slate-400">
              Configure as receitas e quantidades de ingredientes desta unidade.
            </DialogDescription>
          </DialogHeader>

          {/* Barra de busca + filtros + botão add */}
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center mt-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input placeholder="Buscar receita..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9 h-9" />
            </div>
            <div className="flex gap-1 flex-wrap">
              <button onClick={() => setFiltroTipo('TODOS')} className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${filtroTipo === 'TODOS' ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}>Todos</button>
              {tiposUnicos.map(t => (
                <button key={t} onClick={() => setFiltroTipo(t)} className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${filtroTipo === t ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}>{t}</button>
              ))}
            </div>
            <Button size="sm" onClick={handleOpenAdd} className="bg-amber-600 hover:bg-amber-700 text-white h-9">
              <Plus className="mr-1 h-3 w-3" /> Novo Preparo
            </Button>
          </div>

          {/* Lista de preparos */}
          {loading ? (
            <div className="py-8 text-center text-slate-400">Carregando preparos...</div>
          ) : filteredPreparos.length === 0 ? (
            <div className="py-8 text-center text-slate-400 border border-dashed border-slate-200 rounded-md mt-2">
              {preparos.length === 0 ? 'Nenhum preparo configurado para esta escola.' : 'Nenhum resultado para o filtro aplicado.'}
            </div>
          ) : (
            <div className="flex flex-col gap-3 mt-2">
              {filteredPreparos.map(p => (
                <Card key={p.id} className="shadow-none border border-slate-200">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-slate-800 text-sm">{p.fichaTecnica.name}</h4>
                          <span className="text-[10px] bg-amber-100 text-amber-700 rounded px-1.5 py-0.5 font-medium">{p.fichaTecnica.type}</span>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5">
                          {p.ingredientes.map(ing => (
                            <span key={ing.id} className="text-xs text-slate-500">
                              <span className="font-medium text-slate-700">{ing.item.name}</span>
                              {' '}{ing.quantidade} {ing.item.baseUnit}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-1 ml-3 flex-shrink-0">
                        <Button variant="outline" size="sm" className="h-7 w-7 p-0 text-slate-400 hover:text-blue-600 hover:bg-blue-50 border-slate-200" onClick={() => handleOpenEdit(p)}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button variant="outline" size="sm" className="h-7 w-7 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50 border-slate-200" onClick={() => setPreparoParaExcluir(p)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Form de Add/Edit ingredientes */}
      <Dialog open={isFormOpen} onOpenChange={o => !o && setIsFormOpen(false)}>
        <DialogContent className="sm:max-w-[560px] max-h-[85vh] overflow-y-auto bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-100">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-slate-100">{editingPreparo ? 'Editar Preparo' : 'Novo Preparo'}</DialogTitle>
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
            <Button onClick={handleSubmitForm} disabled={isSubmitting} className="bg-amber-600 hover:bg-amber-700 text-white">
              {isSubmitting ? 'Salvando...' : 'Salvar Preparo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Exclusão */}
      <AlertDialog open={!!preparoParaExcluir} onOpenChange={o => !o && setPreparoParaExcluir(null)}>
        <AlertDialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-100">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-900 dark:text-slate-100">Desvincular "{preparoParaExcluir?.fichaTecnica.name}"?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500 dark:text-slate-400">Todos os ingredientes deste preparo serão removidos desta escola.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting} className="text-slate-900 dark:text-slate-100 border-slate-200">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={e => { e.preventDefault(); handleConfirmDelete(); }} disabled={isDeleting} className="bg-red-600 hover:bg-red-700 text-white">
              {isDeleting ? 'Removendo...' : 'Sim, Desvincular'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
