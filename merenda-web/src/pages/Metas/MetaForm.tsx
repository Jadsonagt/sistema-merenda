import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { getEscolas, type Escola } from '../../services/api/escolas';
import { getFichas, type Ficha } from '../../services/api/fichas';
import { createMeta } from '../../services/api/metas';

export const MetaForm = () => {
  const navigate = useNavigate();
  const [escolas, setEscolas] = useState<Escola[]>([]);
  const [fichas, setFichas] = useState<Ficha[]>([]);
  const [escolaId, setEscolaId] = useState('');
  const [fichaId, setFichaId] = useState('');
  const [quantidade, setQuantidade] = useState<number | ''>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [escolasData, fichasData] = await Promise.all([
          getEscolas(),
          getFichas()
        ]);
        setEscolas(escolasData);
        setFichas(fichasData);
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
      }
    };
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!escolaId || !fichaId || !quantidade) return;
    
    setLoading(true);
    try {
      await createMeta({ escolaId, fichaId, quantidade: Number(quantidade) });
      navigate('/metas');
    } catch (error) {
      console.error('Erro ao criar meta:', error);
      alert('Erro ao criar a meta. Verifique se tem permissão ou se a rota está implementada.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Definir Nova Meta</h1>
        <p className="text-slate-500">Defina uma meta de preparo para uma escola específica.</p>
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
          <Label htmlFor="ficha">Ficha Técnica</Label>
          <Select value={fichaId} onValueChange={setFichaId}>
            <SelectTrigger id="ficha">
              <SelectValue placeholder="Selecione a ficha técnica" />
            </SelectTrigger>
            <SelectContent>
              {fichas.map(ficha => (
                <SelectItem key={ficha.id} value={ficha.id}>
                  {ficha.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="quantidade">Quantidade de Porções</Label>
          <Input
            id="quantidade"
            type="number"
            min="1"
            value={quantidade}
            onChange={(e) => setQuantidade(e.target.value ? Number(e.target.value) : '')}
            placeholder="Ex: 100"
            required
          />
        </div>

        <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={() => navigate('/metas')} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" disabled={loading || !escolaId || !fichaId || !quantidade}>
            {loading ? 'Salvando...' : 'Salvar Meta'}
          </Button>
        </div>
      </form>
    </div>
  );
};
