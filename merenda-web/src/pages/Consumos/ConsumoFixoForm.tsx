import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { getEscolas } from '../../services/api/escolas';
import type { Escola } from '../../services/api/escolas';
import { getItems } from '../../services/api/items';
import type { Item } from '../../services/api/items';
import { createConsumoFixo } from '../../services/api/consumos';

export const ConsumoFixoForm = () => {
  const navigate = useNavigate();
  const [escolas, setEscolas] = useState<Escola[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [escolaId, setEscolaId] = useState('');
  const [itemId, setItemId] = useState('');
  const [quantidade, setQuantidade] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [escolasData, itemsData] = await Promise.all([
          getEscolas(),
          getItems()
        ]);
        setEscolas(escolasData);
        setItems(itemsData);
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
      }
    };
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!escolaId || !itemId || !quantidade) return;
    
    setLoading(true);
    try {
      await createConsumoFixo({ escolaId, itemId, quantidade });
      navigate('/consumos-fixos');
    } catch (error) {
      console.error('Erro ao criar consumo fixo:', error);
      alert('Erro ao registrar consumo fixo. Verifique permissões ou parâmetros.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Novo Consumo Fixo</h1>
        <p className="text-slate-500">Defina a quantidade de pacotes/unidades inteiras que uma escola consome diariamente de um item fixo.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow-sm border border-slate-200">
        <div className="space-y-2">
          <Label htmlFor="escola">Escola</Label>
          <Select value={escolaId} onValueChange={setEscolaId}>
            <SelectTrigger id="escola">
              <SelectValue placeholder="Selecione a escola" />
            </SelectTrigger>
            <SelectContent>
              {escolas.map(escola => (
                <SelectItem key={escola.id} value={escola.id}>
                  {escola.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="item">Item de Consumo (Produto)</Label>
          <Select value={itemId} onValueChange={setItemId}>
            <SelectTrigger id="item">
              <SelectValue placeholder="Selecione o produto" />
            </SelectTrigger>
            <SelectContent>
              {items.map(item => (
                <SelectItem key={item.id} value={item.id}>
                  {item.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="quantidade">Quantidade (Pacotes/Unidades)</Label>
          <Input
            id="quantidade"
            type="number"
            step="1"
            min="1"
            value={quantidade}
            onChange={(e) => setQuantidade(e.target.value)}
            placeholder="Ex: 5"
            required
          />
        </div>

        <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={() => navigate('/consumos-fixos')} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" disabled={loading || !escolaId || !itemId || !quantidade}>
            {loading ? 'Salvando...' : 'Salvar Consumo Fixo'}
          </Button>
        </div>
      </form>
    </div>
  );
};
