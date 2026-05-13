import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pencil, Trash2, Plus, School, UtensilsCrossed, MapPin } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { api } from '../../services/api';
import { PreparosPanel } from './PreparosPanel';

const getHeaders = () => {
  const token = localStorage.getItem('token');
  return { headers: { Authorization: `Bearer ${token}` } };
};

interface Rota {
  id: string;
  name: string;
}

interface Escola {
  id: string;
  name: string;
  type: string;
  rotaId: string;
  endereco?: string;
  latitude?: number;
  longitude?: number;
  rota?: Rota;
}

const TIPOS_UNIDADE = [
  { value: 'CRECHE', label: 'Creche' },
  { value: 'FUNDAMENTAL', label: 'Fundamental' },
  { value: 'INTEGRAL', label: 'Integral' },
  { value: 'PARCIAL', label: 'Parcial' },
  { value: 'EJA', label: 'EJA' },
];

export const Escolas: React.FC = () => {
  const [escolas, setEscolas] = useState<Escola[]>([]);
  const [rotas, setRotas] = useState<Rota[]>([]);
  const [filtroRota, setFiltroRota] = useState<string>('todas');
  const [loading, setLoading] = useState(false);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('');
  const [newEndereco, setNewEndereco] = useState('');
  const [newLatitude, setNewLatitude] = useState('');
  const [newLongitude, setNewLongitude] = useState('');
  const [newRotaId, setNewRotaId] = useState('');
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);

  const [escolaEmEdicao, setEscolaEmEdicao] = useState<Escola | null>(null);
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState('');
  const [editEndereco, setEditEndereco] = useState('');
  const [editLatitude, setEditLatitude] = useState('');
  const [editLongitude, setEditLongitude] = useState('');
  const [editRotaId, setEditRotaId] = useState('');
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  const [escolaParaExcluir, setEscolaParaExcluir] = useState<Escola | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Preparos
  const [escolaPreparos, setEscolaPreparos] = useState<Escola | null>(null);

  const abrirGoogleMaps = (endereco: string) => {
    if (!endereco.trim()) {
      toast({ variant: "destructive", title: "Atenção", description: "Digite um endereço para pesquisar." });
      return;
    }
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(endereco)}`;
    window.open(url, '_blank');
  };

  const handleSmartPaste = (e: React.ClipboardEvent, type: 'create' | 'edit') => {
    const text = e.clipboardData.getData('text');
    if (text.includes(',')) {
      e.preventDefault();
      const parts = text.split(',');
      const lat = parts[0].trim();
      const lon = parts[1].trim();
      
      if (type === 'create') {
        setNewLatitude(lat);
        setNewLongitude(lon);
      } else {
        setEditLatitude(lat);
        setEditLongitude(lon);
      }
      
      toast({ 
        className: "bg-emerald-50 text-emerald-900 border-emerald-200", 
        title: "Smart Paste", 
        description: "Coordenadas extraídas e distribuídas." 
      });
    }
  };

  const { toast } = useToast();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [user, setUser] = useState<any>(() => {
    const raw = localStorage.getItem('usuario');
    return raw ? JSON.parse(raw) : null;
  });

  const fetchProfile = async () => {
    if (!user) {
      try {
        const response = await api.get('/auth/me', getHeaders());
        localStorage.setItem('usuario', JSON.stringify(response.data));
        setUser(response.data);
      } catch (error) {
        console.error('Erro ao buscar perfil:', error);
      }
    }
  };

  useEffect(() => {
    fetchEscolas();
    fetchRotas();
    fetchProfile();
  }, []);

  const isAdmin = user?.role === 'ADMIN';
  const isNutri = user?.role === 'NUTRICIONISTA';
  const canCreate = isAdmin || isNutri;

  const fetchEscolas = async () => {
    setLoading(true);
    try {
      const response = await api.get('/escolas', getHeaders());
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setEscolas(response.data);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error('Erro ao buscar escolas:', error);
      toast({ variant: "destructive", title: "Erro", description: "Não foi possível carregar as escolas." });
    } finally {
      setLoading(false);
    }
  };

  const fetchRotas = async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await api.get('/rotas', getHeaders());
      setRotas(response.data);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error('Erro ao buscar rotas:', error);
    }
  };

  const getRotaName = (rotaId: string) => {
    const rota = rotas.find(r => r.id === rotaId);
    return rota?.name || '—';
  };

  // --- Criação ---
  const handleOpenCreate = () => {
    setNewName(''); setNewType(''); setNewEndereco(''); setNewLatitude(''); setNewLongitude(''); setNewRotaId('');
    setIsCreateOpen(true);
  };

  const canSaveCreate = newName.trim() && newType && newRotaId;

  const handleSubmitCreate = async () => {
    if (!newName.trim() || !newType || !newRotaId) {
      toast({ variant: "destructive", title: "Atenção", description: "Todos os campos são obrigatórios. Selecione uma Rota." });
      return;
    }

    if (!newLatitude || !newLongitude) {
      toast({ 
        className: "bg-amber-50 text-amber-900 border-amber-200", 
        title: "Aviso de Coordenadas", 
        description: "A falta de Latitude/Longitude impedirá o cálculo automático de KM no Diário de Bordo." 
      });
    }

    setIsSubmittingCreate(true);
    try {
      await api.post('/escolas', {
        name: newName.trim(),
        type: newType,
        endereco: newEndereco.trim(),
        latitude: newLatitude ? parseFloat(newLatitude) : null,
        longitude: newLongitude ? parseFloat(newLongitude) : null,
        rota_id: newRotaId
      }, getHeaders());
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      toast({ className: "bg-emerald-50 text-emerald-900 border-emerald-200", title: "Sucesso", description: "Escola criada com sucesso." });
      setIsCreateOpen(false);
      fetchEscolas();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error('Erro ao criar escola:', error);
      toast({ variant: "destructive", title: "Erro", description: error.response?.data?.error || "Erro ao criar escola." });
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  // --- Edição ---
  const handleOpenEdit = (escola: Escola) => {
    setEscolaEmEdicao(escola);
    setEditName(escola.name);
    setEditType(escola.type);
    setEditEndereco(escola.endereco || '');
    setEditLatitude(escola.latitude?.toString() || '');
    setEditLongitude(escola.longitude?.toString() || '');
    setEditRotaId(escola.rotaId);
  };

  const canSaveEdit = editName.trim() && editType && editRotaId;

  const handleSubmitEdit = async () => {
    if (!escolaEmEdicao || !editName.trim() || !editType || !editRotaId) {
      toast({ variant: "destructive", title: "Atenção", description: "Todos os campos são obrigatórios. Selecione uma Rota." });
      return;
    }

    if (!editLatitude || !editLongitude) {
      toast({ 
        className: "bg-amber-50 text-amber-900 border-amber-200", 
        title: "Aviso de Coordenadas", 
        description: "A falta de Latitude/Longitude impedirá o cálculo automático de KM no Diário de Bordo." 
      });
    }

    setIsSubmittingEdit(true);
    try {
      await api.put(`/escolas/${escolaEmEdicao.id}`, {
        name: editName.trim(),
        type: editType,
        endereco: editEndereco.trim(),
        latitude: editLatitude ? parseFloat(editLatitude) : null,
        longitude: editLongitude ? parseFloat(editLongitude) : null,
        rota_id: editRotaId
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }, getHeaders());
      toast({ className: "bg-emerald-50 text-emerald-900 border-emerald-200", title: "Sucesso", description: "Escola atualizada." });
      setEscolaEmEdicao(null);
      fetchEscolas();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error('Erro ao editar escola:', error);
      toast({ variant: "destructive", title: "Erro", description: error.response?.data?.error || "Erro ao atualizar." });
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // --- Exclusão ---
  const handleConfirmDelete = async () => {
    if (!escolaParaExcluir) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setIsDeleting(true);
    try {
      await api.delete(`/escolas/${escolaParaExcluir.id}`, getHeaders());
      toast({ className: "bg-emerald-50 text-emerald-900 border-emerald-200", title: "Sucesso", description: "Escola excluída." });
      fetchEscolas();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      if (error.response?.status === 400) {
        toast({ variant: "destructive", title: "Exclusão Bloqueada", description: error.response?.data?.error || "Escola possui histórico de estoque ou metas vinculados." });
      } else {
        toast({ variant: "destructive", title: "Erro", description: "Erro ao excluir escola." });
      }
    } finally {
      setIsDeleting(false);
      setEscolaParaExcluir(null);
    }
  };

  const getTipoBadgeColor = (type: string) => {
    const colors: Record<string, string> = {
      CRECHE: 'bg-pink-50 text-pink-700',
      FUNDAMENTAL: 'bg-indigo-50 text-indigo-700',
      INTEGRAL: 'bg-amber-50 text-amber-700',
      PARCIAL: 'bg-cyan-50 text-cyan-700',
      EJA: 'bg-violet-50 text-violet-700',
    };
    return colors[type] || 'bg-slate-100 text-slate-700';
  };

  const escolasFiltradas = escolas.filter(escola => 
    filtroRota === 'todas' || escola.rotaId === filtroRota
  );

  return (
    <div className="p-8 max-w-6xl mx-auto flex flex-col gap-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <School className="h-8 w-8 text-blue-600" />
            Escolas
          </h1>
          <p className="text-muted-foreground mt-1">Gerencie as unidades escolares da rede.</p>
        </div>
        {canCreate && (
          <Button onClick={handleOpenCreate} className="bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="mr-2 h-4 w-4" /> Nova Escola
          </Button>
        )}
      </div>

      <div className="flex items-center gap-4 bg-white p-4 rounded-lg border shadow-sm">
        <div className="flex flex-col gap-1.5 min-w-[240px]">
          <Label className="text-xs font-bold text-slate-500 uppercase">Filtrar por Rota</Label>
          <Select value={filtroRota} onValueChange={setFiltroRota}>
            <SelectTrigger className="h-9 bg-slate-50 border-slate-200">
              <SelectValue placeholder="Selecione uma rota" />
            </SelectTrigger>
            <SelectContent className="bg-white border shadow-xl">
              <SelectItem value="todas">Todas as Rotas</SelectItem>
              {rotas.map(r => (
                <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1" />
        <div className="text-right">
          <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Exibido</span>
          <span className="text-xl font-black text-blue-600">{escolasFiltradas.length}</span>
        </div>
      </div>

      <Card className="bg-white shadow-md hover:shadow-lg transition-shadow duration-300 rounded-xl border border-slate-200 overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100">
          <CardTitle className="text-xl text-slate-700">Escolas Cadastradas</CardTitle>
          <CardDescription>Unidades escolares vinculadas às rotas de entrega.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-slate-500">Carregando escolas...</div>
          ) : (
            <>
              {/* Visualização em Tabela (Desktop) */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader className="bg-slate-50/80 border-b border-slate-200">
                    <TableRow>
                      <TableHead className="font-semibold text-slate-700 px-6 py-4">Nome da Escola</TableHead>
                      <TableHead className="font-semibold text-slate-700 px-6 py-4">Tipo</TableHead>
                      <TableHead className="font-semibold text-slate-700 px-6 py-4">Rota</TableHead>
                      <TableHead className="text-right font-semibold text-slate-700 px-6 py-4">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {escolasFiltradas.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-slate-500">Nenhuma escola encontrada para este filtro.</TableCell>
                      </TableRow>
                    ) : escolasFiltradas.map((escola) => (
                      <TableRow key={escola.id} className="hover:bg-slate-50 transition-colors">
                        <TableCell className="font-medium text-slate-800 px-6 py-4">{escola.name}</TableCell>
                        <TableCell className="px-6 py-4">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getTipoBadgeColor(escola.type)}`}>
                            {escola.type}
                          </span>
                        </TableCell>
                        <TableCell className="text-slate-600 px-6 py-4">{getRotaName(escola.rotaId)}</TableCell>
                        <TableCell className="text-right px-6 py-4">
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" className="h-8 px-2 text-xs text-amber-700 hover:text-amber-800 hover:bg-amber-50 border-amber-200" onClick={() => setEscolaPreparos(escola)} title="Configurar Preparos">
                              <UtensilsCrossed className="h-3.5 w-3.5 mr-1" /> Preparos
                            </Button>
                            <Button variant="outline" size="sm" className="h-8 w-8 p-0 text-slate-500 hover:text-blue-600 hover:bg-blue-50 border-slate-200" onClick={() => handleOpenEdit(escola)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            {(isAdmin || isNutri) && (
                              <Button variant="outline" size="sm" className="h-8 w-8 p-0 text-slate-500 hover:text-red-600 hover:bg-red-50 border-slate-200" onClick={() => setEscolaParaExcluir(escola)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Visualização em Cards (Mobile) */}
              <div className="grid grid-cols-1 gap-4 md:hidden">
                {escolasFiltradas.length === 0 ? (
                  <div className="py-8 text-center text-slate-500 border-2 border-dashed rounded-xl border-slate-100">
                    <School className="h-8 w-8 mx-auto mb-2 opacity-20" />
                    <p className="text-xs font-medium">Nenhuma escola encontrada.</p>
                  </div>
                ) : (
                  escolasFiltradas.map((escola) => (
                    <div key={escola.id} className="bg-slate-50 rounded-xl border p-4 shadow-sm space-y-4">
                      <div className="space-y-1">
                        <h3 className="font-bold text-slate-800 text-lg leading-tight">{escola.name}</h3>
                        <div className="flex flex-wrap gap-2 pt-1">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${getTipoBadgeColor(escola.type)}`}>
                            {escola.type}
                          </span>
                          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-slate-200 text-slate-600">
                            {getRotaName(escola.rotaId)}
                          </span>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-slate-200 flex flex-wrap gap-2">
                        <Button 
                          variant="outline" 
                          className="flex-1 min-w-[140px] bg-white border-amber-200 text-amber-700 hover:bg-amber-50"
                          onClick={() => setEscolaPreparos(escola)}
                        >
                          <UtensilsCrossed className="h-4 w-4 mr-2" /> Preparos
                        </Button>
                        <div className="flex gap-2 w-full">
                          <Button 
                            variant="outline" 
                            className="flex-1 bg-white border-slate-200 text-slate-600"
                            onClick={() => handleOpenEdit(escola)}
                          >
                            <Pencil className="h-4 w-4 mr-2" /> Editar
                          </Button>
                          {(isAdmin || isNutri) && (
                            <Button 
                              variant="outline" 
                              className="flex-1 bg-white border-slate-200 text-red-600 hover:bg-red-50"
                              onClick={() => setEscolaParaExcluir(escola)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" /> Excluir
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Modal de Criação */}
      <Dialog open={isCreateOpen} onOpenChange={(open) => !open && setIsCreateOpen(false)}>
        <DialogContent
          className="sm:max-w-[480px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-100"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-slate-100">Nova Escola</DialogTitle>
            <DialogDescription className="text-slate-500 dark:text-slate-400">Preencha os dados da unidade escolar.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col gap-2">
              <Label className="text-slate-900 dark:text-slate-200 font-semibold">Nome da Escola</Label>
              <Input placeholder="Ex: EMEI Monteiro Lobato" value={newName} onChange={(e) => setNewName(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label className="text-slate-900 dark:text-slate-200 font-semibold">Tipo de Unidade</Label>
              <Select value={newType} onValueChange={setNewType}>
                <SelectTrigger className="bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100">
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800">
                  {TIPOS_UNIDADE.map((t) => (
                    <SelectItem key={t.value} value={t.value} className="text-slate-900 dark:text-slate-100 focus:bg-slate-100 dark:focus:bg-slate-800">{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label className="text-slate-900 dark:text-slate-200 font-semibold">Rota de Entrega</Label>
              <Select value={newRotaId} onValueChange={setNewRotaId}>
                <SelectTrigger className="bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100">
                  <SelectValue placeholder="Selecione a rota" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800">
                  {rotas.map((r) => (
                    <SelectItem key={r.id} value={r.id} className="text-slate-900 dark:text-slate-100 focus:bg-slate-100 dark:focus:bg-slate-800">{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {rotas.length === 0 && (
                <p className="text-xs text-amber-600">Nenhuma rota cadastrada. Cadastre uma rota primeiro.</p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label className="text-slate-900 dark:text-slate-200 font-semibold">Endereço Completo</Label>
              <div className="flex gap-2">
                <Input placeholder="Rua, Número, Bairro..." value={newEndereco} onChange={(e) => setNewEndereco(e.target.value)} className="flex-1" />
                <Button 
                  type="button" 
                  variant="outline" 
                  size="icon" 
                  className="shrink-0 border-blue-200 text-blue-600 hover:bg-blue-50"
                  onClick={() => abrirGoogleMaps(newEndereco)}
                  title="Pesquisar no Google Maps"
                >
                  <MapPin className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label className="text-slate-900 dark:text-slate-200 font-semibold">Latitude</Label>
                <Input 
                  type="text" 
                  placeholder="-23.5505" 
                  value={newLatitude} 
                  onChange={(e) => setNewLatitude(e.target.value)} 
                  onPaste={(e) => handleSmartPaste(e, 'create')}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label className="text-slate-900 dark:text-slate-200 font-semibold">Longitude</Label>
                <Input type="number" step="any" placeholder="-46.6333" value={newLongitude} onChange={(e) => setNewLongitude(e.target.value)} />
              </div>
              <p className="col-span-2 text-[10px] text-amber-600 font-medium leading-tight">
                Atenção: Cadastrar sem coordenadas impedirá o cálculo automático de quilometragem no Diário de Bordo.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)} disabled={isSubmittingCreate}>Cancelar</Button>
            <Button onClick={handleSubmitCreate} disabled={isSubmittingCreate || !canSaveCreate} className="bg-blue-600 hover:bg-blue-700 text-white">
              {isSubmittingCreate ? 'Criando...' : 'Criar Escola'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Edição */}
      <Dialog open={!!escolaEmEdicao} onOpenChange={(open) => !open && setEscolaEmEdicao(null)}>
        <DialogContent
          className="sm:max-w-[480px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-100"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-slate-100">Editar Escola</DialogTitle>
            <DialogDescription className="text-slate-500 dark:text-slate-400">Ajuste os dados da unidade escolar.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col gap-2">
              <Label className="text-slate-900 dark:text-slate-200 font-semibold">Nome da Escola</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label className="text-slate-900 dark:text-slate-200 font-semibold">Tipo de Unidade</Label>
              <Select value={editType} onValueChange={setEditType}>
                <SelectTrigger className="bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100">
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800">
                  {TIPOS_UNIDADE.map((t) => (
                    <SelectItem key={t.value} value={t.value} className="text-slate-900 dark:text-slate-100 focus:bg-slate-100 dark:focus:bg-slate-800">{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label className="text-slate-900 dark:text-slate-200 font-semibold">Rota de Entrega</Label>
              <Select value={editRotaId} onValueChange={setEditRotaId}>
                <SelectTrigger className="bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100">
                  <SelectValue placeholder="Selecione a rota" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800">
                  {rotas.map((r) => (
                    <SelectItem key={r.id} value={r.id} className="text-slate-900 dark:text-slate-100 focus:bg-slate-100 dark:focus:bg-slate-800">{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label className="text-slate-900 dark:text-slate-200 font-semibold">Endereço Completo</Label>
              <div className="flex gap-2">
                <Input value={editEndereco} onChange={(e) => setEditEndereco(e.target.value)} className="flex-1" />
                <Button 
                  type="button" 
                  variant="outline" 
                  size="icon" 
                  className="shrink-0 border-blue-200 text-blue-600 hover:bg-blue-50"
                  onClick={() => abrirGoogleMaps(editEndereco)}
                  title="Pesquisar no Google Maps"
                >
                  <MapPin className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label className="text-slate-900 dark:text-slate-200 font-semibold">Latitude</Label>
                <Input 
                  type="text" 
                  value={editLatitude} 
                  onChange={(e) => setEditLatitude(e.target.value)} 
                  onPaste={(e) => handleSmartPaste(e, 'edit')}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label className="text-slate-900 dark:text-slate-200 font-semibold">Longitude</Label>
                <Input type="number" step="any" value={editLongitude} onChange={(e) => setEditLongitude(e.target.value)} />
              </div>
              <p className="col-span-2 text-[10px] text-amber-600 font-medium leading-tight">
                Atenção: Cadastrar sem coordenadas impedirá o cálculo automático de quilometragem no Diário de Bordo.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEscolaEmEdicao(null)} disabled={isSubmittingEdit}>Cancelar</Button>
            <Button onClick={handleSubmitEdit} disabled={isSubmittingEdit || !canSaveEdit} className="bg-blue-600 hover:bg-blue-700 text-white">
              {isSubmittingEdit ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Exclusão */}
      <AlertDialog open={!!escolaParaExcluir} onOpenChange={(open) => !open && setEscolaParaExcluir(null)}>
        <AlertDialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-100">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-900 dark:text-slate-100">Excluir "{escolaParaExcluir?.name}"?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500 dark:text-slate-400">
              Se a escola possuir histórico de estoque ou metas, a exclusão será bloqueada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting} className="text-slate-900 dark:text-slate-100 border-slate-200 dark:border-slate-800">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); handleConfirmDelete(); }} disabled={isDeleting} className="bg-red-600 hover:bg-red-700 text-white">
              {isDeleting ? 'Excluindo...' : 'Sim, Excluir Escola'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Panel de Preparos */}
      <PreparosPanel
        escolaId={escolaPreparos?.id || ''}
        escolaNome={escolaPreparos?.name || ''}
        open={!!escolaPreparos}
        onClose={() => setEscolaPreparos(null)}
      />
    </div>
  );
};
