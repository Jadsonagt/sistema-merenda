import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Pencil, Trash2, Plus, Route } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { api } from '../../services/api';

const getHeaders = () => {
  const token = localStorage.getItem('token');
  return { headers: { Authorization: `Bearer ${token}` } };
};

interface Rota {
  id: string;
  name: string;
  escolas?: { id: string; name: string }[];
}

export const Rotas: React.FC = () => {
  const [rotas, setRotas] = useState<Rota[]>([]);
  const [loading, setLoading] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);
  const [rotaEmEdicao, setRotaEmEdicao] = useState<Rota | null>(null);
  const [editName, setEditName] = useState('');
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [rotaParaExcluir, setRotaParaExcluir] = useState<Rota | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const fetchRotas = async () => {
    setLoading(true);
    try {
      const response = await api.get('/rotas', getHeaders());
      setRotas(response.data);
    } catch (error: any) {
      console.error('Erro ao buscar rotas:', error);
      toast({ variant: "destructive", title: "Erro", description: "Não foi possível carregar as rotas." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRotas(); }, []);

  const handleSubmitCreate = async () => {
    if (!newName.trim()) {
      toast({ variant: "destructive", title: "Atenção", description: "O nome da rota é obrigatório." });
      return;
    }
    setIsSubmittingCreate(true);
    try {
      await api.post('/rotas', { name: newName.trim() }, getHeaders());
      toast({ className: "bg-emerald-50 text-emerald-900 border-emerald-200", title: "Sucesso", description: "Rota criada com sucesso." });
      setIsCreateModalOpen(false);
      fetchRotas();
    } catch (error: any) {
      console.error('Erro ao criar rota:', error);
      toast({ variant: "destructive", title: "Erro", description: error.response?.data?.error || "Erro ao criar rota." });
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  const handleOpenEdit = (rota: Rota) => { setRotaEmEdicao(rota); setEditName(rota.name); };

  const handleSubmitEdit = async () => {
    if (!rotaEmEdicao || !editName.trim()) {
      toast({ variant: "destructive", title: "Atenção", description: "O nome da rota é obrigatório." });
      return;
    }
    setIsSubmittingEdit(true);
    try {
      await api.put(`/rotas/${rotaEmEdicao.id}`, { name: editName.trim() }, getHeaders());
      toast({ className: "bg-emerald-50 text-emerald-900 border-emerald-200", title: "Sucesso", description: "Rota atualizada." });
      setRotaEmEdicao(null);
      fetchRotas();
    } catch (error: any) {
      console.error('Erro ao editar rota:', error);
      toast({ variant: "destructive", title: "Erro", description: error.response?.data?.error || "Erro ao atualizar." });
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!rotaParaExcluir) return;
    setIsDeleting(true);
    try {
      await api.delete(`/rotas/${rotaParaExcluir.id}`, getHeaders());
      toast({ className: "bg-emerald-50 text-emerald-900 border-emerald-200", title: "Sucesso", description: "Rota excluída." });
      fetchRotas();
    } catch (error: any) {
      if (error.response?.status === 400) {
        toast({ variant: "destructive", title: "Exclusão Bloqueada", description: error.response?.data?.error || "Rota possui escolas vinculadas." });
      } else {
        toast({ variant: "destructive", title: "Erro", description: "Erro ao excluir a rota." });
      }
    } finally {
      setIsDeleting(false);
      setRotaParaExcluir(null);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto flex flex-col gap-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Route className="h-8 w-8 text-teal-600" />
            Rotas de Entrega
          </h1>
          <p className="text-muted-foreground mt-1">Gerencie as rotas logísticas de distribuição.</p>
        </div>
        <Button onClick={() => { setNewName(''); setIsCreateModalOpen(true); }} className="bg-teal-600 hover:bg-teal-700 text-white">
          <Plus className="mr-2 h-4 w-4" /> Nova Rota
        </Button>
      </div>

      <Card className="shadow-sm border-slate-200">
        <CardHeader>
          <CardTitle className="text-xl text-slate-700">Rotas Cadastradas</CardTitle>
          <CardDescription>Cada rota agrupa escolas para a logística de entrega.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-slate-500">Carregando rotas...</div>
          ) : (
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="font-semibold text-slate-700 px-6 py-4">Nome da Rota</TableHead>
                  <TableHead className="font-semibold text-slate-700 px-6 py-4">Escolas Vinculadas</TableHead>
                  <TableHead className="text-right font-semibold text-slate-700 px-6 py-4">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rotas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-slate-500">Nenhuma rota cadastrada.</TableCell>
                  </TableRow>
                ) : rotas.map((rota) => (
                  <TableRow key={rota.id} className="hover:bg-slate-50 transition-colors">
                    <TableCell className="font-medium text-slate-800 px-6 py-4">{rota.name}</TableCell>
                    <TableCell className="text-slate-600 px-6 py-4">
                      {rota.escolas && rota.escolas.length > 0 ? (
                        <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                          {rota.escolas.length} escola(s)
                        </span>
                      ) : (
                        <span className="text-slate-400 text-sm">Nenhuma</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" className="h-8 w-8 p-0 text-slate-500 hover:text-blue-600 hover:bg-blue-50 border-slate-200" onClick={() => handleOpenEdit(rota)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" className="h-8 w-8 p-0 text-slate-500 hover:text-red-600 hover:bg-red-50 border-slate-200" onClick={() => setRotaParaExcluir(rota)}>
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
      <Dialog open={isCreateModalOpen} onOpenChange={(open) => !open && setIsCreateModalOpen(false)}>
        <DialogContent className="sm:max-w-[425px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-100">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-slate-100">Nova Rota de Entrega</DialogTitle>
            <DialogDescription className="text-slate-500 dark:text-slate-400">Defina o nome da nova rota logística.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="newRotaName" className="text-slate-900 dark:text-slate-200 font-semibold">Nome da Rota</Label>
              <Input id="newRotaName" placeholder="Ex: Rota Norte - Zona Rural" value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSubmitCreate()} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateModalOpen(false)} disabled={isSubmittingCreate}>Cancelar</Button>
            <Button onClick={handleSubmitCreate} disabled={isSubmittingCreate} className="bg-teal-600 hover:bg-teal-700 text-white">
              {isSubmittingCreate ? 'Criando...' : 'Criar Rota'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Edição */}
      <Dialog open={!!rotaEmEdicao} onOpenChange={(open) => !open && setRotaEmEdicao(null)}>
        <DialogContent className="sm:max-w-[425px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-100">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-slate-100">Editar Rota</DialogTitle>
            <DialogDescription className="text-slate-500 dark:text-slate-400">Altere o nome da rota de entrega.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="editRotaName" className="text-slate-900 dark:text-slate-200 font-semibold">Nome da Rota</Label>
              <Input id="editRotaName" value={editName} onChange={(e) => setEditName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSubmitEdit()} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRotaEmEdicao(null)} disabled={isSubmittingEdit}>Cancelar</Button>
            <Button onClick={handleSubmitEdit} disabled={isSubmittingEdit} className="bg-teal-600 hover:bg-teal-700 text-white">
              {isSubmittingEdit ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Exclusão */}
      <AlertDialog open={!!rotaParaExcluir} onOpenChange={(open) => !open && setRotaParaExcluir(null)}>
        <AlertDialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-100">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-900 dark:text-slate-100">Excluir "{rotaParaExcluir?.name}"?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500 dark:text-slate-400">
              Se houver escolas vinculadas, a exclusão será bloqueada por segurança.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting} className="text-slate-900 dark:text-slate-100 border-slate-200 dark:border-slate-800">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); handleConfirmDelete(); }} disabled={isDeleting} className="bg-red-600 hover:bg-red-700 text-white">
              {isDeleting ? 'Excluindo...' : 'Sim, Excluir Rota'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
