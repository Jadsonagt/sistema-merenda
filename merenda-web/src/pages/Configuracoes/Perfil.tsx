import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, Home, Save, Map } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { api } from '../../services/api';

const getHeaders = () => {
  const token = localStorage.getItem('token');
  return { headers: { Authorization: `Bearer ${token}` } };
};

export const Perfil: React.FC = () => {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [enderecoResidencial, setEnderecoResidencial] = useState('');
  const [latitudeResidencial, setLatitudeResidencial] = useState('');
  const [longitudeResidencial, setLongitudeResidencial] = useState('');
  const [rotaId, setRotaId] = useState('');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [rotas, setRotas] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [perfilRes, rotasRes] = await Promise.all([
        api.get('/auth/me', getHeaders()),
        api.get('/rotas', getHeaders())
      ]);

      const data = perfilRes.data;
      setNome(data.nome);
      setEmail(data.email);
      setEnderecoResidencial(data.enderecoResidencial || '');
      setLatitudeResidencial(data.latitudeResidencial ? String(data.latitudeResidencial) : '');
      setLongitudeResidencial(data.longitudeResidencial ? String(data.longitudeResidencial) : '');
      setRotaId(data.rotaId || '');
      setRotas(rotasRes.data);
    } catch (error) {
      console.error('Erro ao buscar perfil:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/auth/me', {
        nome,
        enderecoResidencial,
        latitudeResidencial: latitudeResidencial ? parseFloat(latitudeResidencial) : null,
        longitudeResidencial: longitudeResidencial ? parseFloat(longitudeResidencial) : null,
        rotaId: rotaId || null
      }, getHeaders());

      if (!latitudeResidencial || !longitudeResidencial) {
        toast({ 
          className: "bg-amber-50 text-amber-900 border-amber-200", 
          title: "Perfil salvo sem Coordenadas", 
          description: "Sem as coordenadas da sua residência, o sistema não calculará automaticamente o ponto de partida no Diário de Bordo." 
        });
      }

      // Atualizar o localStorage para refletir as mudanças
      const userRaw = localStorage.getItem('usuario');
      if (userRaw) {
        const user = JSON.parse(userRaw);
        user.nome = nome;
        localStorage.setItem('usuario', JSON.stringify(user));
      }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
      toast({ className: "bg-emerald-50 text-emerald-900 border-emerald-200", title: "Sucesso", description: "Perfil atualizado com sucesso." });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: error.response?.data?.error || "Falha ao atualizar perfil." });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Carregando perfil...</div>;
  }

  return (
    <div className="p-8 max-w-2xl mx-auto flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <User className="h-8 w-8 text-blue-600" />
          Meu Perfil
        </h1>
        <p className="text-muted-foreground mt-1">Gerencie seus dados pessoais e de deslocamento.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Informações Pessoais</CardTitle>
          <CardDescription>Estes dados são usados para identificação no sistema e relatórios.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label>Nome Completo</Label>
              <Input value={nome} onChange={e => setNome(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2 opacity-60">
              <Label>E-mail (Login)</Label>
              <Input value={email} disabled />
            </div>

            <div className="flex flex-col gap-2 pt-4 border-t">
              <Label className="flex items-center gap-2">
                <Map className="h-4 w-4 text-blue-500" />
                Minha Rota (Setor)
              </Label>
              <Select value={rotaId} onValueChange={setRotaId}>
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Selecione sua rota" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  {rotas.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">
                Define quais escolas aparecerão por padrão para você.
              </p>
            </div>

            <div className="flex flex-col gap-2 pt-4 border-t">
              <Label className="flex items-center gap-2">
                <Home className="h-4 w-4 text-blue-500" />
                Endereço Residencial (Ponto de Partida)
              </Label>
              <Input
                placeholder="Rua, Número, Bairro, Cidade..."
                value={enderecoResidencial}
                onChange={e => setEnderecoResidencial(e.target.value)}
              />
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label className="text-[10px] font-bold uppercase text-slate-500">Latitude</Label>
                  <Input
                    type="number"
                    step="any"
                    placeholder="-23.5505..."
                    value={latitudeResidencial}
                    onChange={e => setLatitudeResidencial(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label className="text-[10px] font-bold uppercase text-slate-500">Longitude</Label>
                  <Input
                    type="number"
                    step="any"
                    placeholder="-46.6333..."
                    value={longitudeResidencial}
                    onChange={e => setLongitudeResidencial(e.target.value)}
                  />
                </div>
              </div>
              <p className="text-[10px] text-amber-600 uppercase font-bold tracking-tight leading-tight">
                Utilizado como origem padrão no Diário de Bordo. A falta de coordenadas impedirá o cálculo automático de quilometragem.
              </p>
            </div>
            <div className="pt-4 flex justify-end">
              <Button onClick={handleSave} disabled={saving} className="bg-blue-600 text-white">
                <Save className="mr-2 h-4 w-4" /> Salvar Perfil
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
