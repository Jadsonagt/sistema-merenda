import React, { useState, useEffect } from 'react';
import { 
  MapPin, 
  Plus, 
  Pencil, 
  Trash2, 
  Map as MapIcon, 
  Navigation,
  Building2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  getPontosInteresse,
  createPontoInteresse,
  updatePontoInteresse,
  deletePontoInteresse,
  type PontoInteresse
} from '@/services/api/pontosInteresse';

const TIPOS_PONTO = [
  { value: 'APOIO', label: 'Ponto de Apoio' },
  { value: 'SEDE', label: 'Sede Administrativa' },
  { value: 'GARAGEM', label: 'Garagem / Frota' },
  { value: 'OUTRO', label: 'Outro' }
];

export const PontosInteressePage = () => {
  const [pontos, setPontos] = useState<PontoInteresse[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingPonto, setEditingPonto] = useState<PontoInteresse | null>(null);
  
  // Form state
  const [nome, setNome] = useState('');
  const [endereco, setEndereco] = useState('');
  const [tipo, setTipo] = useState('APOIO');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');

  const { toast } = useToast();

  useEffect(() => {
    fetchPontos();
  }, []);

  const fetchPontos = async () => {
    setLoading(true);
    try {
      const data = await getPontosInteresse();
      setPontos(data);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível carregar os pontos de interesse.'
      });
    } finally {
      setLoading(false);
    }
  };

  const abrirGoogleMaps = (end: string) => {
    if (!end.trim()) {
      toast({ variant: "destructive", title: "Atenção", description: "Digite um endereço para pesquisar." });
      return;
    }
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(end)}`;
    window.open(url, '_blank');
  };

  const handleSmartPaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData('text');
    if (text.includes(',')) {
      e.preventDefault();
      const parts = text.split(',');
      setLatitude(parts[0].trim());
      setLongitude(parts[1].trim());
      toast({ 
        className: "bg-emerald-50 text-emerald-900 border-emerald-200", 
        title: "Smart Paste", 
        description: "Coordenadas extraídas e distribuídas." 
      });
    }
  };

  const handleOpenModal = (ponto?: PontoInteresse) => {
    if (ponto) {
      setEditingPonto(ponto);
      setNome(ponto.nome);
      setEndereco(ponto.endereco || '');
      setTipo(ponto.tipo);
      setLatitude(ponto.latitude ? String(ponto.latitude) : '');
      setLongitude(ponto.longitude ? String(ponto.longitude) : '');
    } else {
      setEditingPonto(null);
      setNome('');
      setEndereco('');
      setTipo('APOIO');
      setLatitude('');
      setLongitude('');
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload = { 
        nome, 
        endereco: endereco || null, 
        tipo, 
        latitude: latitude ? parseFloat(latitude) : null, 
        longitude: longitude ? parseFloat(longitude) : null 
      };
      
      if (editingPonto) {
        await updatePontoInteresse(editingPonto.id, payload);
        toast({ className: 'bg-emerald-50 text-emerald-900 border-emerald-200', title: 'Sucesso', description: 'Ponto atualizado com sucesso.' });
      } else {
        await createPontoInteresse(payload);
        toast({ className: 'bg-emerald-50 text-emerald-900 border-emerald-200', title: 'Sucesso', description: 'Ponto criado com sucesso.' });
      }
      
      setIsModalOpen(false);
      fetchPontos();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar',
        description: error.response?.data?.error || 'Erro interno do servidor.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este ponto?')) return;
    
    try {
      await deletePontoInteresse(id);
      toast({ title: 'Excluído', description: 'Ponto removido com sucesso.' });
      fetchPontos();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir',
        description: 'Erro ao remover ponto.'
      });
    }
  };

  return (
    <div className="p-4 sm:p-8 w-full max-w-6xl mx-auto space-y-6 sm:space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="w-full sm:w-auto">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Navigation className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
            Pontos de Interesse
          </h1>
          <p className="text-slate-500 mt-1 text-xs sm:text-sm font-medium">Gestão de locais estratégicos e pontos de apoio.</p>
        </div>
        <Button onClick={() => handleOpenModal()} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 shadow-lg shadow-blue-500/20">
          <Plus className="mr-2 h-5 w-5" /> Novo Ponto
        </Button>
      </div>

      <div className="bg-white shadow-md hover:shadow-lg transition-shadow duration-300 rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-0">
          {loading ? (
            <div className="py-20 text-center flex flex-col items-center gap-3 bg-white rounded-xl">
              <div className="h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-slate-400 font-medium">Buscando pontos...</span>
            </div>
          ) : (
            <>
              {/* Mobile Card List */}
              <div className="grid grid-cols-1 gap-4 sm:hidden px-0">
                {pontos.map((p) => (
                  <div key={p.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4 animate-in slide-in-from-bottom-2 duration-300">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-lg font-black shrink-0">
                          <Building2 className="h-6 w-6" />
                        </div>
                        <div className="space-y-0.5">
                          <h3 className="font-bold text-slate-900 leading-tight">{p.nome}</h3>
                          <p className="text-xs font-medium text-slate-500 break-all">{p.endereco || 'Sem endereço'}</p>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-slate-100 text-slate-600 shrink-0">
                        {p.tipo}
                      </span>
                    </div>
                    
                    <div className="pt-4 border-t border-slate-100 flex gap-3">
                      <Button
                        variant="outline"
                        className="flex-1 h-11 text-slate-600 font-bold border-slate-200"
                        onClick={() => handleOpenModal(p)}
                      >
                        <Pencil className="h-4 w-4 mr-2" /> Editar
                      </Button>
                      <Button
                        variant="outline"
                        className="w-12 h-11 text-slate-400 border-slate-200 hover:text-red-600"
                        onClick={() => handleDelete(p.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table */}
              <div className="hidden sm:block overflow-x-auto w-full">
                <Table>
                  <TableHeader className="bg-slate-50/80 border-b border-slate-200">
                    <TableRow>
                      <TableHead className="font-bold text-slate-700 px-8 py-4 h-14">Local</TableHead>
                      <TableHead className="font-bold text-slate-700 h-14 text-center">Tipo</TableHead>
                      <TableHead className="font-bold text-slate-700 h-14 text-center">Coordenadas</TableHead>
                      <TableHead className="font-bold text-slate-700 text-right px-8 h-14">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pontos.map((p) => (
                      <TableRow key={p.id} className="hover:bg-slate-50/50 transition-all">
                        <TableCell className="px-8 py-5">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold shrink-0">
                              <Building2 className="h-5 w-5" />
                            </div>
                            <div>
                              <div className="font-bold text-slate-800">{p.nome}</div>
                              <div className="text-xs text-slate-400 font-medium truncate max-w-[200px]">{p.endereco}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-600">
                            {p.tipo}
                          </span>
                        </TableCell>
                        <TableCell className="text-center text-slate-500 font-mono text-[10px]">
                          {p.latitude && p.longitude ? `${p.latitude}, ${p.longitude}` : '—'}
                        </TableCell>
                        <TableCell className="text-right px-8 py-5">
                          <div className="flex justify-end gap-3">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-9 px-3 text-slate-600 border-slate-200"
                              onClick={() => handleOpenModal(p)}
                            >
                              <Pencil className="h-4 w-4 mr-2" /> Editar
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-9 px-3 text-slate-400 border-slate-200 hover:text-red-600"
                              onClick={() => handleDelete(p.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </div>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden rounded-2xl border-none shadow-2xl">
          <DialogHeader className="bg-slate-900 text-white p-8">
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <MapPin className="h-6 w-6 text-blue-400" />
              {editingPonto ? 'Editar' : 'Novo'} Ponto
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-base mt-2">
              Cadastre locais de apoio ou sedes para o sistema.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="p-8 space-y-6 bg-white">
            <div className="grid grid-cols-1 gap-5">
              <div className="space-y-2">
                <Label className="text-sm font-bold text-slate-700 ml-1">Nome do Local</Label>
                <Input 
                  value={nome} 
                  onChange={(e) => setNome(e.target.value)} 
                  className="h-12 bg-slate-50 border-slate-200 font-medium" 
                  placeholder="Ex: Sede Administrativa"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-bold text-slate-700 ml-1">Tipo de Ponto</Label>
                <Select value={tipo} onValueChange={setTipo}>
                  <SelectTrigger className="h-12 bg-slate-50 border-slate-200">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS_PONTO.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-bold text-slate-700 ml-1">Endereço Completo</Label>
                <div className="flex gap-2">
                  <Input 
                    value={endereco} 
                    onChange={(e) => setEndereco(e.target.value)} 
                    className="flex-1 h-12 bg-slate-50 border-slate-200 font-medium" 
                    placeholder="Rua, Número, Bairro..."
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="icon" 
                    className="shrink-0 h-12 w-12 border-blue-200 text-blue-600 hover:bg-blue-50"
                    onClick={() => abrirGoogleMaps(endereco)}
                    title="Pesquisar no Google Maps"
                  >
                    <MapIcon className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-500 uppercase ml-1">Latitude</Label>
                  <Input 
                    type="text"
                    value={latitude} 
                    onChange={(e) => setLatitude(e.target.value)} 
                    onPaste={handleSmartPaste}
                    className="h-12 bg-slate-50 border-slate-200 font-medium" 
                    placeholder="-23.5505"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-500 uppercase ml-1">Longitude</Label>
                  <Input 
                    type="text"
                    value={longitude} 
                    onChange={(e) => setLongitude(e.target.value)} 
                    className="h-12 bg-slate-50 border-slate-200 font-medium" 
                    placeholder="-46.6333"
                  />
                </div>
                <p className="col-span-2 text-[10px] text-amber-600 font-bold uppercase tracking-tight leading-tight">
                  A falta de coordenadas impedirá o cálculo automático de quilometragem.
                </p>
              </div>
            </div>

            <DialogFooter className="bg-slate-50 -mx-8 -mb-8 p-6 mt-8 flex flex-row gap-3 border-t border-slate-100">
              <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)} className="flex-1 font-bold text-slate-500">
                Cancelar
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold h-11 shadow-lg shadow-blue-500/20"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Salvando...' : editingPonto ? 'Atualizar' : 'Salvar Ponto'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
