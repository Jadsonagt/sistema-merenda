import React, { useEffect, useState } from 'react';
import { getFichas, createFicha, updateFicha, deleteFicha, type Ficha } from '../../services/api/fichas';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Pencil, Trash2, Plus, ClipboardList, ChefHat } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const FichasList: React.FC = () => {
  const [fichas, setFichas] = useState<Ficha[]>([]);
  const [loading, setLoading] = useState(false);

  // Criação
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('');
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);

  // Edição
  const [fichaEmEdicao, setFichaEmEdicao] = useState<Ficha | null>(null);
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState('');
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // Exclusão
  const [fichaParaExcluir, setFichaParaExcluir] = useState<Ficha | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { toast } = useToast();

  const fetchFichas = async () => {
    setLoading(true);
    try {
      const data = await getFichas();
      setFichas(data);
    } catch (error) {
      console.error('Erro ao buscar fichas:', error);
      toast({ variant: "destructive", title: "Erro", description: "Não foi possível carregar o catálogo de receitas." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchFichas(); }, []);

  // --- Criação ---
  const handleOpenCreate = () => {
    setNewName('');
    setNewType('');
    setIsCreateOpen(true);
  };

  const handleSubmitCreate = async () => {
    if (!newName.trim() || !newType.trim()) {
      toast({ variant: "destructive", title: "Atenção", description: "Nome e Tipo são obrigatórios." });
      return;
    }
    setIsSubmittingCreate(true);
    try {
      await createFicha({ name: newName.trim(), type: newType.trim() });
      toast({ className: "bg-emerald-50 text-emerald-900 border-emerald-200", title: "Sucesso", description: "Receita criada com sucesso." });
      setIsCreateOpen(false);
      fetchFichas();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error('Erro ao criar ficha:', error);
      toast({ variant: "destructive", title: "Erro", description: error.response?.data?.error || "Erro ao criar a receita." });
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  // --- Edição ---
  const handleOpenEdit = (ficha: Ficha) => {
    setFichaEmEdicao(ficha);
    setEditName(ficha.name);
    setEditType(ficha.type || '');
  };

  const handleCloseEdit = () => setFichaEmEdicao(null);

  const handleSubmitEdit = async () => {
    if (!fichaEmEdicao) return;
    if (!editName.trim() || !editType.trim()) {
      toast({ variant: "destructive", title: "Atenção", description: "Nome e Tipo são obrigatórios." });
      return;
    }
    setIsSubmittingEdit(true);
    try {
      await updateFicha(fichaEmEdicao.id, { name: editName.trim(), type: editType.trim() });
      toast({ className: "bg-emerald-50 text-emerald-900 border-emerald-200", title: "Sucesso", description: "Receita atualizada." });
      handleCloseEdit();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fetchFichas();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error('Erro ao editar ficha:', error);
      toast({ variant: "destructive", title: "Erro", description: error.response?.data?.error || "Erro ao atualizar." });
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // --- Exclusão ---
  const handleConfirmDelete = async () => {
    if (!fichaParaExcluir) return;
    setIsDeleting(true);
    try {
      await deleteFicha(fichaParaExcluir.id);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
      toast({ className: "bg-emerald-50 text-emerald-900 border-emerald-200", title: "Sucesso", description: "Receita excluída." });
      fetchFichas();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error('Erro ao excluir ficha:', error);
      if (error.response?.status === 400) {
        toast({ variant: "destructive", title: "Exclusão Bloqueada", description: error.response?.data?.error || "Esta ficha está vinculada a um cardápio ou preparo." });
      } else {
        toast({ variant: "destructive", title: "Erro", description: "Erro interno ao excluir ficha." });
      }
    } finally {
      setIsDeleting(false);
      setFichaParaExcluir(null);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto flex flex-col gap-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <ClipboardList className="h-8 w-8 text-blue-600" />
            Catálogo de Receitas
          </h1>
          <p className="text-muted-foreground mt-1">Catálogo de receitas. Os ingredientes são configurados por escola.</p>
        </div>
        <Button onClick={handleOpenCreate} className="bg-blue-600 hover:bg-blue-700 text-white">
          <Plus className="mr-2 h-4 w-4" /> Nova Receita
        </Button>
      </div>

      <Card className="shadow-md border-slate-200 bg-white overflow-hidden">
        <CardHeader className="border-b border-slate-100 bg-blue-50/40 p-6">
          <CardTitle className="text-xl text-slate-800 font-bold flex items-center gap-2">
            <ChefHat className="h-5 w-5 text-blue-600" />
            Receitas Cadastradas
          </CardTitle>
          <CardDescription className="text-slate-500 font-medium">Cada item define uma receita. As quantidades são configuradas por unidade escolar.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-8 text-center text-slate-500">Carregando fichas...</div>
          ) : (
            <>
              {/* Visualização em Tabela (Desktop) */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="font-semibold text-slate-700 px-6 py-4">Nome da Receita</TableHead>
                      <TableHead className="font-semibold text-slate-700 px-6 py-4">Tipo</TableHead>
                      <TableHead className="font-semibold text-slate-700 px-6 py-4">Data de Criação</TableHead>
                      <TableHead className="text-right font-semibold text-slate-700 px-6 py-4">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fichas.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-slate-500">
                          Nenhuma receita encontrada.
                        </TableCell>
                      </TableRow>
                    ) : (
                      fichas.map((ficha) => (
                        <TableRow key={ficha.id} className="hover:bg-slate-50 transition-colors">
                          <TableCell className="font-medium text-slate-800 px-6 py-4">{ficha.name}</TableCell>
                          <TableCell className="text-slate-600 px-6 py-4">{ficha.type || '—'}</TableCell>
                          <TableCell className="text-slate-600 px-6 py-4">
                            {ficha.createdAt ? new Date(ficha.createdAt).toLocaleDateString('pt-BR') : '—'}
                          </TableCell>
                          <TableCell className="text-right px-6 py-4">
                            <div className="flex justify-end gap-2">
                              <Button variant="outline" size="sm" className="h-8 w-8 p-0 text-slate-500 hover:text-blue-600 hover:bg-blue-50 border-slate-200" onClick={() => handleOpenEdit(ficha)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="outline" size="sm" className="h-8 w-8 p-0 text-slate-500 hover:text-red-600 hover:bg-red-50 border-slate-200" onClick={() => setFichaParaExcluir(ficha)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Visualização em Cards (Mobile) */}
              <div className="grid grid-cols-1 gap-4 md:hidden">
                {fichas.length === 0 ? (
                  <div className="py-8 text-center text-slate-500 border-2 border-dashed rounded-xl border-slate-100">
                    <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-20" />
                    <p className="text-xs font-medium">Nenhuma receita encontrada.</p>
                  </div>
                ) : (
                  fichas.map((ficha) => (
                    <div key={ficha.id} className="bg-slate-50 rounded-xl border p-4 shadow-sm space-y-4">
                      <div className="space-y-1">
                        <h3 className="font-bold text-slate-800 text-lg leading-tight">{ficha.name}</h3>
                        <div className="flex flex-wrap gap-2 pt-1">
                          <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-[10px] font-bold text-blue-700 uppercase tracking-wider">
                            {ficha.type || 'Sem Categoria'}
                          </span>
                          <span className="inline-flex items-center rounded-full bg-slate-200 px-2.5 py-0.5 text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                            Criada em {ficha.createdAt ? new Date(ficha.createdAt).toLocaleDateString('pt-BR') : '—'}
                          </span>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-slate-200 flex gap-2">
                        <Button 
                          variant="outline" 
                          className="flex-1 bg-white border-slate-200 text-slate-600"
                          onClick={() => handleOpenEdit(ficha)}
                        >
                          <Pencil className="h-4 w-4 mr-2" /> Editar
                        </Button>
                        <Button 
                          variant="outline" 
                          className="flex-1 bg-white border-slate-200 text-red-600 hover:bg-red-50"
                          onClick={() => setFichaParaExcluir(ficha)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" /> Excluir
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ========== Modal de Criação ========== */}
      <Dialog open={isCreateOpen} onOpenChange={(open) => !open && setIsCreateOpen(false)}>
        <DialogContent 
          className="sm:max-w-[450px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-100"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-slate-100">Nova Receita</DialogTitle>
            <DialogDescription className="text-slate-500 dark:text-slate-400">
              Cadastre a receita. Os ingredientes serão configurados por escola.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col gap-2">
              <Label className="text-slate-900 dark:text-slate-200 font-semibold">Nome da Receita</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Ex: Bolo de Cenoura" />
            </div>
            <div className="flex flex-col gap-2">
              <Label className="text-slate-900 dark:text-slate-200 font-semibold">Tipo</Label>
              <Input value={newType} onChange={(e) => setNewType(e.target.value)} placeholder="Ex: Sobremesa, Café da Manhã" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)} disabled={isSubmittingCreate}>Cancelar</Button>
            <Button onClick={handleSubmitCreate} disabled={isSubmittingCreate} className="bg-blue-600 hover:bg-blue-700 text-white">
              {isSubmittingCreate ? 'Criando...' : 'Criar Receita'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========== Modal de Edição ========== */}
      <Dialog open={!!fichaEmEdicao} onOpenChange={(open) => !open && handleCloseEdit()}>
        <DialogContent className="sm:max-w-[450px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-100">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-slate-100">Editar Receita</DialogTitle>
            <DialogDescription className="text-slate-500 dark:text-slate-400">Ajuste os dados da receita.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col gap-2">
              <Label className="text-slate-900 dark:text-slate-200 font-semibold">Nome da Receita</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Ex: Bolo de Cenoura" />
            </div>
            <div className="flex flex-col gap-2">
              <Label className="text-slate-900 dark:text-slate-200 font-semibold">Tipo</Label>
              <Input value={editType} onChange={(e) => setEditType(e.target.value)} placeholder="Ex: Sobremesa, Café da Manhã" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseEdit} disabled={isSubmittingEdit}>Cancelar</Button>
            <Button onClick={handleSubmitEdit} disabled={isSubmittingEdit} className="bg-blue-600 hover:bg-blue-700 text-white">
              {isSubmittingEdit ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========== Modal de Exclusão ========== */}
      <AlertDialog open={!!fichaParaExcluir} onOpenChange={(open) => !open && setFichaParaExcluir(null)}>
        <AlertDialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-100">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-900 dark:text-slate-100">
              Excluir "{fichaParaExcluir?.name}"?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500 dark:text-slate-400">
              Se vinculada a um cardápio ou preparo de escola, a exclusão será bloqueada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting} className="text-slate-900 dark:text-slate-100 border-slate-200 dark:border-slate-800">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); handleConfirmDelete(); }} disabled={isDeleting} className="bg-red-600 hover:bg-red-700 text-white">
              {isDeleting ? 'Excluindo...' : 'Sim, Excluir Receita'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
