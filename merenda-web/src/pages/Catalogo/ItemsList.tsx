import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pencil, Trash2, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { api } from '../../services/api';

interface Item {
  id: string;
  name: string;
  baseUnit: string;
  packagingSize: number;
}

export const ItemsList: React.FC = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);

  // States para Criação
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newBaseUnit, setNewBaseUnit] = useState('');
  const [newPackagingSize, setNewPackagingSize] = useState<number | ''>('');
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);

  // States para Edição
  const [itemEmEdicao, setItemEmEdicao] = useState<Item | null>(null);
  const [editName, setEditName] = useState('');
  const [editBaseUnit, setEditBaseUnit] = useState('');
  const [editPackagingSize, setEditPackagingSize] = useState<number | ''>('');
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // States para Exclusão
  const [itemParaExcluir, setItemParaExcluir] = useState<Item | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { toast } = useToast();

  const fetchItems = async () => {
    setLoading(true);
    try {
      const response = await api.get('/items');
      setItems(response.data);
    } catch (error) {
      console.error('Erro ao buscar itens:', error);
      toast({
        variant: "destructive",
        title: "Erro de Conexão",
        description: "Não foi possível carregar o catálogo de itens.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  // --- Handlers de Criação ---
  const handleOpenCreate = () => {
    setIsCreateModalOpen(true);
    setNewName('');
    setNewBaseUnit('');
    setNewPackagingSize('');
  };

  const handleCloseCreate = () => {
    setIsCreateModalOpen(false);
  };

  const handleSubmitCreate = async () => {
    if (!newName || !newBaseUnit || !newPackagingSize) {
      toast({
        variant: "destructive",
        title: "Atenção",
        description: "Todos os campos são obrigatórios.",
      });
      return;
    }

    const parsedSize = parseFloat(String(newPackagingSize).replace(',', '.'));
    if (isNaN(parsedSize) || parsedSize <= 0) {
      toast({
        variant: "destructive",
        title: "Atenção",
        description: "O tamanho da embalagem deve ser um número maior que zero.",
      });
      return;
    }

    setIsSubmittingCreate(true);
    try {
      await api.post('/items', {
        name: newName,
        base_unit: newBaseUnit,
        packaging_size: parsedSize
      });

      toast({
        className: "bg-emerald-50 text-emerald-900 border-emerald-200",
        title: "Sucesso",
        description: "Item criado com sucesso.",
      });
      
      handleCloseCreate();
      fetchItems();
    } catch (error: any) {
      console.error('Erro ao criar:', error);
      toast({
        variant: "destructive",
        title: "Erro na Criação",
        description: error.response?.data?.error || "Erro ao cadastrar o item. Verifique os dados e tente novamente.",
      });
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  // --- Handlers de Edição ---
  const handleOpenEdit = (item: Item) => {
    setItemEmEdicao(item);
    setEditName(item.name);
    setEditBaseUnit(item.baseUnit);
    setEditPackagingSize(item.packagingSize);
  };

  const handleCloseEdit = () => {
    setItemEmEdicao(null);
  };

  const handleSubmitEdit = async () => {
    if (!itemEmEdicao) return;
    
    if (!editName || !editBaseUnit || !editPackagingSize) {
      toast({
        variant: "destructive",
        title: "Atenção",
        description: "Todos os campos são obrigatórios.",
      });
      return;
    }

    if (Number(editPackagingSize) <= 0) {
      toast({
        variant: "destructive",
        title: "Atenção",
        description: "O tamanho da embalagem deve ser maior que zero.",
      });
      return;
    }

    setIsSubmittingEdit(true);
    try {
      await api.put(`/items/${itemEmEdicao.id}`, {
        name: editName,
        baseUnit: editBaseUnit,
        packagingSize: Number(editPackagingSize)
      });

      toast({
        title: "Sucesso",
        description: "Item atualizado com sucesso.",
      });
      
      handleCloseEdit();
      fetchItems();
    } catch (error: any) {
      console.error('Erro ao editar:', error);
      toast({
        variant: "destructive",
        title: "Erro na Edição",
        description: error.response?.data?.error || "Erro interno ao atualizar item.",
      });
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // --- Handlers de Exclusão ---
  const handleOpenDelete = (item: Item) => {
    setItemParaExcluir(item);
  };

  const handleCloseDelete = () => {
    setItemParaExcluir(null);
  };

  const handleConfirmDelete = async () => {
    if (!itemParaExcluir) return;

    setIsDeleting(true);
    try {
      await api.delete(`/items/${itemParaExcluir.id}`);
      
      toast({
        className: "bg-emerald-50 text-emerald-900 border-emerald-200",
        title: "Sucesso",
        description: "Item excluído com sucesso.",
      });

      handleCloseDelete();
      fetchItems();
    } catch (error: any) {
      console.error('Erro ao excluir:', error);
      toast({
        variant: "destructive",
        title: "Operação Bloqueada",
        description: error.response?.data?.error || "Erro interno ao excluir item.",
      });
    } finally {
      setIsDeleting(false);
      handleCloseDelete();
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto flex flex-col gap-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Catálogo de Itens</h1>
          <p className="text-muted-foreground mt-1">Gerencie os ingredientes e insumos logísticos do sistema.</p>
        </div>
        <Button onClick={handleOpenCreate} className="bg-blue-600 hover:bg-blue-700 text-white">
          <Plus className="mr-2 h-4 w-4" />
          Novo Item
        </Button>
      </div>

      <Card className="shadow-sm border-slate-200">
        <CardHeader>
          <CardTitle className="text-xl text-slate-700">Itens Cadastrados</CardTitle>
          <CardDescription>
            Listagem do catálogo. Alterações impactam fichas técnicas e estoques físicos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-slate-500">Carregando itens...</div>
          ) : (
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="font-semibold text-slate-700 px-6 py-4">Nome do Item</TableHead>
                  <TableHead className="font-semibold text-slate-700 px-6 py-4">Unidade Base</TableHead>
                  <TableHead className="font-semibold text-slate-700 px-6 py-4">Tamanho da Embalagem</TableHead>
                  <TableHead className="text-right font-semibold text-slate-700 px-6 py-4">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-slate-500">
                      Nenhum item encontrado no catálogo.
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((item) => (
                    <TableRow key={item.id} className="hover:bg-slate-50 transition-colors">
                      <TableCell className="font-medium text-slate-800 px-6 py-4">{item.name}</TableCell>
                      <TableCell className="text-slate-600 px-6 py-4">{item.baseUnit}</TableCell>
                      <TableCell className="text-slate-600 px-6 py-4">{item.packagingSize}</TableCell>
                      <TableCell className="text-right px-6 py-4">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 w-8 p-0 text-slate-500 hover:text-blue-600 hover:bg-blue-50 border-slate-200"
                            onClick={() => handleOpenEdit(item)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 w-8 p-0 text-slate-500 hover:text-red-600 hover:bg-red-50 border-slate-200"
                            onClick={() => handleOpenDelete(item)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Modal de Criação (POST) */}
      <Dialog open={isCreateModalOpen} onOpenChange={(open) => !open && handleCloseCreate()}>
        <DialogContent className="sm:max-w-[425px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-100">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-slate-100">Criar Novo Item</DialogTitle>
            <DialogDescription className="text-slate-500 dark:text-slate-400">
              Preencha os dados do novo item a ser inserido no catálogo.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="newName" className="text-slate-900 dark:text-slate-200 font-semibold">Nome do Item</Label>
              <Input
                id="newName"
                placeholder="Ex: Arroz Agulhinha"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="newBaseUnit" className="text-slate-900 dark:text-slate-200 font-semibold">Unidade de Medida</Label>
              <Select value={newBaseUnit} onValueChange={setNewBaseUnit}>
                <SelectTrigger className="bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100">
                  <SelectValue placeholder="Selecione a unidade" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800">
                  <SelectItem value="KG" className="text-slate-900 dark:text-slate-100 focus:bg-slate-100 dark:focus:bg-slate-800">Quilograma (KG)</SelectItem>
                  <SelectItem value="L" className="text-slate-900 dark:text-slate-100 focus:bg-slate-100 dark:focus:bg-slate-800">Litro (L)</SelectItem>
                  <SelectItem value="UN" className="text-slate-900 dark:text-slate-100 focus:bg-slate-100 dark:focus:bg-slate-800">Unidade (UN)</SelectItem>
                  <SelectItem value="PCT" className="text-slate-900 dark:text-slate-100 focus:bg-slate-100 dark:focus:bg-slate-800">Pacote (PCT)</SelectItem>
                  <SelectItem value="CX" className="text-slate-900 dark:text-slate-100 focus:bg-slate-100 dark:focus:bg-slate-800">Caixa (CX)</SelectItem>
                  <SelectItem value="G" className="text-slate-900 dark:text-slate-100 focus:bg-slate-100 dark:focus:bg-slate-800">Grama (G)</SelectItem>
                  <SelectItem value="ML" className="text-slate-900 dark:text-slate-100 focus:bg-slate-100 dark:focus:bg-slate-800">Mililitro (ML)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="newPackagingSize" className="text-slate-900 dark:text-slate-200 font-semibold">Tamanho da Embalagem / Conversão</Label>
              <Input
                id="newPackagingSize"
                type="number"
                min="0.1"
                step="any"
                placeholder="Ex: 5"
                value={newPackagingSize}
                onChange={(e) => setNewPackagingSize(e.target.value === '' ? '' : Number(e.target.value))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseCreate} disabled={isSubmittingCreate}>Cancelar</Button>
            <Button onClick={handleSubmitCreate} disabled={isSubmittingCreate} className="bg-blue-600 hover:bg-blue-700 text-white">
              {isSubmittingCreate ? 'Criando...' : 'Criar Item'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Edição (PUT) */}
      <Dialog open={!!itemEmEdicao} onOpenChange={(open) => !open && handleCloseEdit()}>
        <DialogContent className="sm:max-w-[425px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-100">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-slate-100">Editar Item</DialogTitle>
            <DialogDescription className="text-slate-500 dark:text-slate-400">
              Ajuste as propriedades do item. Essa alteração refletirá em todos os históricos.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="name" className="text-slate-900 dark:text-slate-200 font-semibold">Nome do Item</Label>
              <Input
                id="name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="baseUnit" className="text-slate-900 dark:text-slate-200 font-semibold">Unidade Base (Ex: KG, L)</Label>
              <Input
                id="baseUnit"
                value={editBaseUnit}
                onChange={(e) => setEditBaseUnit(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="packagingSize" className="text-slate-900 dark:text-slate-200 font-semibold">Tamanho da Embalagem</Label>
              <Input
                id="packagingSize"
                type="number"
                min="0.1"
                step="any"
                value={editPackagingSize}
                onChange={(e) => setEditPackagingSize(e.target.value === '' ? '' : Number(e.target.value))}
              />
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

      {/* Modal de Exclusão (DELETE) */}
      <AlertDialog open={!!itemParaExcluir} onOpenChange={(open) => !open && handleCloseDelete()}>
        <AlertDialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-100">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-900 dark:text-slate-100">Tem certeza que deseja excluir "{itemParaExcluir?.name}"?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500 dark:text-slate-400">
              Esta ação removerá permanentemente o item do catálogo. Se o item estiver em uso, a operação será bloqueada por segurança.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting} className="text-slate-900 dark:text-slate-100 border-slate-200 dark:border-slate-800">Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault(); 
                handleConfirmDelete();
              }} 
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting ? 'Excluindo...' : 'Sim, Excluir Item'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
};
