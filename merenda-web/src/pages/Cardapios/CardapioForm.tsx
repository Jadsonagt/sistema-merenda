import React, { useEffect, useState } from 'react';
import { createCardapio } from '../../services/api/cardapios';
import { getFichas, type Ficha } from '../../services/api/fichas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNavigate } from 'react-router-dom';

const TIPOS_ESCOLA_OPCOES = ["Creche", "Integral", "Parcial"];

export const CardapioForm: React.FC = () => {
  const [fichas, setFichas] = useState<Ficha[]>([]);
  const [fichaId, setFichaId] = useState('');
  const [date, setDate] = useState('');
  
  // Novos estados
  const [isFeriado, setIsFeriado] = useState(false);
  const [tiposEscola, setTiposEscola] = useState<string[]>([]);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchFichas = async () => {
      try {
        const data = await getFichas();
        setFichas(data);
      } catch (error) {
        console.error('Erro ao carregar fichas:', error);
      }
    };
    fetchFichas();
  }, []);

  const handleTipoEscolaChange = (tipo: string) => {
    setTiposEscola((prev) => 
      prev.includes(tipo) 
        ? prev.filter((t) => t !== tipo) 
        : [...prev, tipo]
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!date) {
      setError('A Data de Agendamento é obrigatória.');
      return;
    }
    
    if (!isFeriado && !fichaId) {
      setError('A Ficha Técnica é obrigatória em dias normais (não feriado).');
      return;
    }

    if (tiposEscola.length === 0) {
      setError('Selecione pelo menos um Tipo de Escola.');
      return;
    }

    setLoading(true);
    setError('');

    let formattedDate = date;
    if (date.includes('T')) {
      formattedDate = new Date(date).toISOString().split('T')[0];
    } else {
      formattedDate = new Date(`${date}T00:00:00`).toISOString().split('T')[0];
    }

    try {
      await createCardapio({
        date: formattedDate,
        fichaId: isFeriado ? undefined : fichaId,
        is_feriado: isFeriado,
        tipos_escola: tiposEscola
      });
      navigate('/cardapios');
    } catch (err: any) {
      console.error(err);
      setError('Erro ao criar o cardápio. Verifique os dados e tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-xl mx-auto flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-800">Agendar Novo Cardápio</h1>
        <Button variant="outline" onClick={() => navigate('/cardapios')}>Voltar</Button>
      </div>

      <form onSubmit={handleSave} className="flex flex-col gap-6 bg-white p-6 rounded-md shadow-sm border border-slate-200">
        
        {/* Data */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="date">Data de Agendamento <span className="text-red-500">*</span></Label>
          <Input 
            id="date" 
            type="date"
            value={date} 
            onChange={(e) => setDate(e.target.value)} 
          />
        </div>

        {/* Feriado (Switch) */}
        <div className="flex items-center justify-between p-3 border border-slate-100 bg-slate-50 rounded-md">
          <div className="flex flex-col gap-1">
            <Label htmlFor="isFeriado" className="font-semibold text-slate-800 cursor-pointer">É Feriado/Facultativo?</Label>
            <span className="text-xs text-slate-500">O cardápio será desativado neste dia para as escolas.</span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              className="sr-only peer" 
              checked={isFeriado}
              onChange={(e) => {
                setIsFeriado(e.target.checked);
                if (e.target.checked) setFichaId(''); // Limpa a ficha se for feriado
              }}
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        {/* Ficha Técnica (Oculto se for Feriado) */}
        {!isFeriado && (
          <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
            <Label htmlFor="ficha">Ficha Técnica <span className="text-red-500">*</span></Label>
            <Select value={fichaId} onValueChange={setFichaId}>
              <SelectTrigger id="ficha">
                <SelectValue placeholder="Selecione a Ficha Técnica" className="text-slate-900" />
              </SelectTrigger>
              <SelectContent>
                {fichas.map((ficha) => (
                  <SelectItem key={ficha.id} value={String(ficha.id)} className="text-slate-900">
                    {ficha.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Filtro de Escolas (Multi-select / Checkboxes) */}
        <div className="flex flex-col gap-3">
          <Label>Tipos de Escola <span className="text-red-500">*</span></Label>
          <div className="grid grid-cols-2 gap-3 p-3 border border-slate-100 rounded-md">
            {TIPOS_ESCOLA_OPCOES.map((tipo) => (
              <label key={tipo} className="flex items-center gap-2 cursor-pointer group">
                <div className="relative flex items-center justify-center">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-blue-600 bg-white border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                    checked={tiposEscola.includes(tipo)}
                    onChange={() => handleTipoEscolaChange(tipo)}
                  />
                </div>
                <span className="text-sm text-slate-700 group-hover:text-slate-900 transition-colors">{tipo}</span>
              </label>
            ))}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded-r-md">
            <p className="text-sm font-medium text-red-800">{error}</p>
          </div>
        )}

        <Button type="submit" className="mt-2 py-6 text-md font-semibold" disabled={loading}>
          {loading ? 'Processando Registro...' : (isFeriado ? 'Salvar Feriado Global' : 'Agendar Cardápio Diário')}
        </Button>
      </form>
    </div>
  );
};
