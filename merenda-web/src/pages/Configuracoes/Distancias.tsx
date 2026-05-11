import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, MapPin, ArrowRightLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { api } from '../../services/api';

interface Distancia {
  id: string;
  origemId: string;
  destinoId: string;
  quilometros: number;
}

interface Escola {
  id: string;
  name: string;
}

interface PontoInteresse {
  id: string;
  nome: string;
}

const getHeaders = () => {
  const token = localStorage.getItem('token');
  return { headers: { Authorization: `Bearer ${token}` } };
};

export const Distancias: React.FC = () => {
  const [distancias, setDistancias] = useState<Distancia[]>([]);
  const [escolas, setEscolas] = useState<Escola[]>([]);
  const [pontos, setPontos] = useState<PontoInteresse[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Novo registro
  const [origem, setOrigem] = useState('');
  const [destino, setDestino] = useState('');
  const [kmIda, setKmIda] = useState<number | ''>('');
  const [kmVolta, setKmVolta] = useState<number | ''>('');

  const { toast } = useToast();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [distRes, escRes, pontoRes] = await Promise.all([
        api.get('/configuracoes/distancias', getHeaders()),
        api.get('/escolas', getHeaders()),
        api.get('/supervisao/pontos-interesse', getHeaders())
      ]);
      setDistancias(distRes.data);
      setEscolas(escRes.data);
      setPontos(pontoRes.data);
    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", title: "Erro", description: "Falha ao carregar dados." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleAdd = async () => {
    if (!origem || !destino || kmIda === '' || kmVolta === '') {
      toast({ variant: "destructive", title: "Atenção", description: "Preencha todos os campos (Ida e Volta)." });
      return;
    }
    setSaving(true);
    try {
      await Promise.all([
        api.post('/configuracoes/distancias', { origemId: origem, destinoId: destino, quilometros: kmIda }, getHeaders()),
        api.post('/configuracoes/distancias', { origemId: destino, destinoId: origem, quilometros: kmVolta }, getHeaders())
      ]);
      toast({ className: "bg-emerald-50 text-emerald-900 border-emerald-200", title: "Sucesso", description: "Distâncias de Ida e Volta cadastradas." });
      setOrigem('');
      setDestino('');
      setKmIda('');
      setKmVolta('');
      fetchData();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: error.response?.data?.error || "Falha ao salvar." });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/configuracoes/distancias/${id}`, getHeaders());
      toast({ title: "Removido", description: "Distância excluída." });
      fetchData();
    } catch (error) {
      toast({ variant: "destructive", title: "Erro", description: "Falha ao excluir." });
    }
  };

  const getPontoName = (id: string) => {
    if (id === 'CASA') return 'Minha Casa';
    const esc = escolas.find(e => e.id === id);
    if (esc) return esc.name;
    const p = pontos.find(p => p.id === id);
    return p ? p.nome : id;
  };

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Carregando distâncias...</div>;
  }

  return (
    <div className="p-8 max-w-5xl mx-auto flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <ArrowRightLeft className="h-8 w-8 text-blue-600" />
          Configuração de Distâncias
        </h1>
        <p className="text-muted-foreground mt-1">Defina as distâncias padrão entre os pontos de visitação.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Novo Trecho de Referência</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="flex flex-col gap-2">
              <Label>Ponto de Origem</Label>
              <Select value={origem} onValueChange={setOrigem}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASA">Minha Casa (Sede)</SelectItem>
                  <SelectGroup>
                    <SelectLabel>Escolas</SelectLabel>
                    {escolas.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel>Pontos de Apoio</SelectLabel>
                    {pontos.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Ponto de Destino</Label>
              <Select value={destino} onValueChange={setDestino}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASA">Minha Casa (Sede)</SelectItem>
                  <SelectGroup>
                    <SelectLabel>Escolas</SelectLabel>
                    {escolas.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel>Pontos de Apoio</SelectLabel>
                    {pontos.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>KM Ida (Origem ➔ Destino)</Label>
              <Input type="number" step="0.1" value={kmIda} onChange={e => setKmIda(e.target.value === '' ? '' : Number(e.target.value))} placeholder="Ex: 12.5" />
            </div>
            <div className="flex flex-col gap-2">
              <Label>KM Volta (Destino ➔ Origem)</Label>
              <Input type="number" step="0.1" value={kmVolta} onChange={e => setKmVolta(e.target.value === '' ? '' : Number(e.target.value))} placeholder="Ex: 13.2" />
            </div>
            <div className="md:col-span-4 flex justify-end">
              <Button onClick={handleAdd} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg">
                <Plus className="mr-2 h-4 w-4" /> Salvar Configuração de Ida e Volta
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Tabela de Referências</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left p-3 font-semibold text-slate-700">Origem</th>
                  <th className="p-3 text-center w-10 text-slate-400"><ArrowRightLeft className="h-4 w-4 mx-auto" /></th>
                  <th className="text-left p-3 font-semibold text-slate-700">Destino</th>
                  <th className="text-right p-3 font-semibold text-slate-700">KM</th>
                  <th className="text-center p-3 font-semibold text-slate-700">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {distancias.length === 0 ? (
                  <tr><td colSpan={5} className="p-8 text-center text-slate-400 italic">Nenhuma distância cadastrada.</td></tr>
                ) : (
                  distancias.map(d => (
                    <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3 w-3 text-slate-400" />
                          {getPontoName(d.origemId)}
                        </div>
                      </td>
                      <td className="p-3 text-center text-slate-300">→</td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3 w-3 text-slate-400" />
                          {getPontoName(d.destinoId)}
                        </div>
                      </td>
                      <td className="p-3 text-right font-mono font-semibold text-blue-600">{d.quilometros.toFixed(1)} km</td>
                      <td className="p-3 text-center">
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(d.id)} className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1 h-8 w-8">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
