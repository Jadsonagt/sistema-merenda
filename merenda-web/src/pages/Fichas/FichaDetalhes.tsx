import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { addIngrediente } from '../../services/api/fichas';
import { getItems, type Item } from '../../services/api/items';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export const FichaDetalhes: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [items, setItems] = useState<Item[]>([]);
  const [itemId, setItemId] = useState('');
  const [quantity, setQuantity] = useState<number | ''>('');
  const [loading, setLoading] = useState(false);
  const [mensagem, setMensagem] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);

  useEffect(() => {
    const fetchItems = async () => {
      try {
        const data = await getItems();
        setItems(data);
      } catch (error) {
        console.error('Erro ao carregar itens:', error);
      }
    };
    fetchItems();
  }, []);

  const handleAddIngrediente = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensagem(null);
    if (!id || !itemId || quantity === '') {
      setMensagem({ tipo: 'erro', texto: 'Preencha todos os campos corretamente.' });
      return;
    }

    setLoading(true);
    try {
      await addIngrediente(id, { itemId, quantity: Number(quantity) });
      setMensagem({ tipo: 'sucesso', texto: 'Ingrediente adicionado com sucesso!' });
      setItemId('');
      setQuantity('');
    } catch (error) {
      console.error(error);
      setMensagem({ tipo: 'erro', texto: 'Erro ao adicionar ingrediente.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-800">Vincular Ingrediente</h1>
        <Button variant="outline" onClick={() => navigate('/fichas')}>Voltar</Button>
      </div>

      <form onSubmit={handleAddIngrediente} className="flex flex-col gap-4 bg-white p-6 rounded-md shadow-sm border border-slate-200">
        <div className="space-y-2">
          <Label htmlFor="item">Item do Catálogo</Label>
          <Select value={itemId} onValueChange={setItemId}>
            <SelectTrigger id="item">
              <SelectValue placeholder="Selecione um Item" className="text-slate-900" />
            </SelectTrigger>
            <SelectContent>
              {items.map((item) => (
                <SelectItem key={item.id} value={item.id} className="text-slate-900">
                  {item.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="quantidade">Quantidade Necessária (Fração)</Label>
          <Input 
            id="quantidade" 
            type="number"
            step="0.001"
            min="0"
            placeholder="Ex: 0.500" 
            value={quantity} 
            onChange={(e) => setQuantity(e.target.value === '' ? '' : Number(e.target.value))} 
          />
        </div>

        {mensagem && (
          <div className={`p-3 rounded-md text-sm font-medium ${mensagem.tipo === 'sucesso' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {mensagem.texto}
          </div>
        )}

        <Button type="submit" className="mt-4" disabled={loading}>
          {loading ? 'Adicionando...' : 'Adicionar Ingrediente'}
        </Button>
      </form>
    </div>
  );
};
