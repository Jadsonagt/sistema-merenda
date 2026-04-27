import React, { useState } from 'react';
import { createFicha } from '../../services/api/fichas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useNavigate } from 'react-router-dom';

export const FichaForm: React.FC = () => {
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('O nome da ficha é obrigatório.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await createFicha({ name, type });
      navigate('/fichas');
    } catch (err: any) {
      console.error(err);
      setError('Erro ao criar a ficha técnica.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-xl mx-auto flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-800">Nova Ficha Técnica</h1>
        <Button variant="outline" onClick={() => navigate('/fichas')}>Voltar</Button>
      </div>

      <form onSubmit={handleSave} className="flex flex-col gap-4 bg-white p-6 rounded-md shadow-sm border border-slate-200">
        <div className="flex flex-col gap-2">
          <Label htmlFor="name">Nome da Ficha</Label>
          <Input 
            id="name" 
            placeholder="Ex: Refeição Básica Padrão" 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="type">Tipo</Label>
          <Input 
            id="type" 
            placeholder="Ex: Almoço / Lanche" 
            value={type} 
            onChange={(e) => setType(e.target.value)} 
          />
        </div>

        {error && <p className="text-sm font-medium text-red-600">{error}</p>}

        <Button type="submit" className="mt-4" disabled={loading}>
          {loading ? 'Salvando...' : 'Salvar'}
        </Button>
      </form>
    </div>
  );
};
