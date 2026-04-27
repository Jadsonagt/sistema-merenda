import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pencil, Trash2, Plus, School, UtensilsCrossed } from 'lucide-react';
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
  const [loading, setLoading] = useState(false);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('');
  const [newRotaId, setNewRotaId] = useState('');
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);

  const [escolaEmEdicao, setEscolaEmEdicao] = useState<Escola | null>(null);
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState('');
  const [editRotaId, setEditRotaId] = useState('');
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  const [escolaParaExcluir, setEscolaParaExcluir] = useState<Escola | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Preparos
  const [escolaPreparos, setEscolaPreparos] = useState<Escola | null>(null);

  const { toast } = useToast();

  const fetchEscolas = async () => {
    setLoading(true);
    try {
      const response = await api.get('/escolas', getHeaders());
      setEscolas(response.data);
    } catch (error: any) {
      console.error('Erro ao buscar escolas:', error);
      toast({ variant: "destructive", title: "Erro", description: "Não foi possível carregar as escolas." });
    } finally {
      setLoading(false);
    }
  };

  const fetchRotas = async () => {
    try {
      const response = await api.get('/rotas', getHeaders());
      setRotas(response.data);
    } catch (error: any) {
      console.error('Erro ao buscar rotas:', error);
    }
  };

  useEffect(() => { fetchEscolas(); fetchRotas(); }, []);

  const getRotaName = (rotaId: string) => {
    const rota = rotas.find(r => r.id === rotaId);
    return rota?.name || '—';
  };

  // --- Criação ---
  const handleOpenCreate = () => {
    setNewName(''); setNewType(''); setNewRotaId('');
    setIsCreateOpen(true);
  };

  const canSaveCreate = newName.trim() && newType && newRotaId;

  const handleSubmitCreate = async () => {
    if (!newName.trim() || !newType || !newRotaId) {
      toast({ variant: "destructive", title: "Atenção", description: "Todos os campos são obrigatórios. Selecione uma Rota." });
      return;
    }
    setIsSubmittingCreate(true);
    try {
      await api.post('/escolas', { name: newName.trim(), type: newType, rota_id: newRotaId }, getHeaders());
      toast({ className: "bg-emerald-50 text-emerald-900 border-emerald-200", title: "Sucesso", description: "Escola criada com sucesso." });
      setIsCreateOpen(false);
      fetchEscolas();
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
    setEditRotaId(escola.rotaId);
  };

  const canSaveEdit = editName.trim() && editType && editRotaId;

  const handleSubmitEdit = async () => {
    if (!escolaEmEdicao || !editName.trim() || !editType || !editRotaId) {
      toast({ variant: "destructive", title: "Atenção", description: "Todos os campos são obrigatórios. Selecione uma Rota." });
      return;
    }
    setIsSubmittingEdit(true);
    try {
      await api.put(`/escolas/${escolaEmEdicao.id}`, { name: editName.trim(), type: editType, rota_id: editRotaId }, getHeaders());
      toast({ className: "bg-emerald-50 text-emerald-900 border-emerald-200", title: "Sucesso", description: "Escola atualizada." });
      setEscolaEmEdicao(null);
      fetchEscolas();
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
    setIsDeleting(true);
    try {
      await api.delete(`/escolas/${escolaParaExcluir.id}`, getHeaders());
      toast({ className: "bg-emerald-50 text-emerald-900 border-emerald-200", title: "Sucesso", description: "Escola excluída." });
      fetchEscolas();
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

  return (
    <div className="p-8 max-w-6xl mx-auto flex flex-col gap-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <School className="h-8 w-8 text-indigo-600" />
            Escolas
          </h1>
          <p className="text-muted-foreground mt-1">Gerencie as unidades escolares da rede.</p>
        </div>
        <Button onClick={handleOpenCreate} className="bg-indigo-600 hover:bg-indigo-700 text-white">
          <Plus className="mr-2 h-4 w-4" /> Nova Escola
        </Button>
      </div>

      <Card className="shadow-sm border-slate-200">
        <CardHeader>
          <CardTitle className="text-xl text-slate-700">Escolas Cadastradas</CardTitle>
          <CardDescription>Unidades escolares vinculadas às rotas de entrega.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-slate-500">Carregando escolas...</div>
          ) : (
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="font-semibold text-slate-700 px-6 py-4">Nome da Escola</TableHead>
                  <TableHead className="font-semibold text-slate-700 px-6 py-4">Tipo</TableHead>
                  <TableHead className="font-semibold text-slate-700 px-6 py-4">Rota</TableHead>
                  <TableHead className="text-right font-semibold text-slate-700 px-6 py-4">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {escolas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-slate-500">Nenhuma escola cadastrada.</TableCell>
                  </TableRow>
                ) : escolas.map((escola) => (
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
                        <Button variant="outline" size="sm" className="h-8 w-8 p-0 text-slate-500 hover:text-red-600 hover:bg-red-50 border-slate-200" onClick={() => setEscolaParaExcluir(escola)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Modal de Criação */}
      <Dialog open={isCreateOpen} onOpenChange={(open) => !open && setIsCreateOpen(false)}>
        <DialogContent className="sm:max-w-[480px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-100">
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)} disabled={isSubmittingCreate}>Cancelar</Button>
            <Button onClick={handleSubmitCreate} disabled={isSubmittingCreate || !canSaveCreate} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              {isSubmittingCreate ? 'Criando...' : 'Criar Escola'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Edição */}
      <Dialog open={!!escolaEmEdicao} onOpenChange={(open) => !open && setEscolaEmEdicao(null)}>
        <DialogContent className="sm:max-w-[480px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-100">
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEscolaEmEdicao(null)} disabled={isSubmittingEdit}>Cancelar</Button>
            <Button onClick={handleSubmitEdit} disabled={isSubmittingEdit || !canSaveEdit} className="bg-indigo-600 hover:bg-indigo-700 text-white">
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
