import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ShieldPlus, Apple, School, Save, Trash2, Plus, Route, Search, ChevronsUpDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { api } from '../../services/api';

const getHeaders = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

export const GestaoDietas: React.FC = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'ESCOLAS' | 'CATALOGO'>('ESCOLAS');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [escolas, setEscolas] = useState<any[]>([]);
  const [tiposDieta, setTiposDieta] = useState<any[]>([]);
  const [rotas, setRotas] = useState<any[]>([]);
  const [filtroRota, setFiltroRota] = useState<string>('todas');
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [escolaSelecionada, setEscolaSelecionada] = useState<string>('');
  const [quantidades, setQuantidades] = useState<Record<string, number | string>>({});
  const [novoTipoNome, setNovoTipoNome] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (escolaSelecionada) {
      const escola = escolas.find(e => e.id === escolaSelecionada);
      if (escola && filtroRota !== 'todas' && escola.rotaId !== filtroRota) {
        setEscolaSelecionada('');
        setQuantidades({});
      }
    }
  }, [filtroRota, escolas, escolaSelecionada]);

  const carregarDadosBase = async () => {
    try {
      const [escRes, tiposRes, rotasRes] = await Promise.all([
        api.get('/escolas', getHeaders()),
        api.get('/dietas/tipos', getHeaders()),
        api.get('/rotas', getHeaders())
      ]);
      setEscolas(escRes.data || []);
      setTiposDieta(tiposRes.data || []);
      setRotas(rotasRes.data || []);

      // Recuperar usuário e definir rota inicial
      const storedUser = localStorage.getItem('usuario');
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        if (parsedUser.rotaId) {
          setFiltroRota(parsedUser.rotaId);
        }
      } else {
        // Se não tiver no storage, busca na API
        const meRes = await api.get('/auth/me', getHeaders());
        localStorage.setItem('usuario', JSON.stringify(meRes.data));
        if (meRes.data.rotaId) {
          setFiltroRota(meRes.data.rotaId);
        }
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Erro", description: "Falha ao carregar dados base." });
    }
  };

  useEffect(() => { carregarDadosBase(); }, []);

  const carregarDemandasEscola = async (escolaId: string) => {
    setEscolaSelecionada(escolaId);

    // 1. Força a limpeza (borracha) em TODOS os tipos de dieta do catálogo
    const estadoZerado: Record<string, number | string> = {};
    tiposDieta.forEach(dieta => {
      estadoZerado[dieta.id] = '';
    });
    setQuantidades(estadoZerado);

    if (!escolaId) return;

    try {
      const res = await api.get(`/dietas/demandas?escolaId=${escolaId}`, getHeaders());
      const demandasList = res.data || [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
      // 2. Preenche apenas com as quantidades que vieram do banco
      const novoEstado = { ...estadoZerado };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
      demandasList.forEach((d: any) => {
        novoEstado[d.tipoDietaId] = d.quantidade;
      });

      setQuantidades(novoEstado);
    } catch (error) {
      toast({ variant: "destructive", title: "Erro", description: "Falha ao carregar o quadro desta escola." });
    }
  };

  const handleSalvarQuadro = async () => {
    if (!escolaSelecionada) return;
    setIsSubmitting(true);

    const payloadDemandas = Object.entries(quantidades).map(([tipoDietaId, qtd]) => ({
      tipoDietaId,
      quantidade: Number(qtd) || 0
    }));

    try {
      await api.post('/dietas/demandas', { escolaId: escolaSelecionada, demandas: payloadDemandas }, getHeaders());
      toast({ className: "bg-emerald-50 text-emerald-900 border-emerald-200", title: "Sucesso", description: "Quadro de dietas atualizado!" });
    } catch (error) {
      toast({ variant: "destructive", title: "Erro", description: "Falha ao salvar quadro." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCriarTipo = async () => {
    if (!novoTipoNome.trim()) return;
    setIsSubmitting(true);
    try {
      await api.post('/dietas/tipos', { nome: novoTipoNome }, getHeaders());
      setNovoTipoNome('');
      carregarDadosBase();
      toast({ title: "Sucesso", description: "Dieta adicionada ao catálogo." });
    } catch (error) {
      toast({ variant: "destructive", title: "Erro", description: "Falha ao adicionar dieta." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExcluirTipo = async (id: string) => {
    if (!confirm('Deseja realmente excluir esta dieta do catálogo?')) return;
    try {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await api.delete(`/dietas/tipos/${id}`, getHeaders());
      carregarDadosBase();
      toast({ className: "bg-emerald-50 text-emerald-900 border-emerald-200", title: "Sucesso", description: "Dieta excluída do catálogo." });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      toast({ variant: "destructive", title: "Ação Bloqueada", description: error.response?.data?.error || "Erro ao excluir dieta." });
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3"><ShieldPlus className="h-8 w-8 text-rose-500" /> Dietas Especiais</h1>
          <p className="text-muted-foreground mt-1">Gerencie as restrições alimentares e volumetria por unidade.</p>
        </div>
      </div>

      <div className="flex gap-2 border-b">
        <button onClick={() => setActiveTab('ESCOLAS')} className={`px-4 py-2 font-bold text-sm border-b-2 transition-colors ${activeTab === 'ESCOLAS' ? 'border-rose-500 text-rose-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>Quadro por Escola</button>
        <button onClick={() => setActiveTab('CATALOGO')} className={`px-4 py-2 font-bold text-sm border-b-2 transition-colors ${activeTab === 'CATALOGO' ? 'border-rose-500 text-rose-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>Catálogo de Dietas</button>
      </div>

      {activeTab === 'ESCOLAS' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl border shadow-sm grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Filtrar por Rota</Label>
              <Select value={filtroRota} onValueChange={(val) => {
                setFiltroRota(val);
                setSearchTerm('');
              }}>
                <SelectTrigger className="border-slate-200 focus:ring-rose-500 shadow-sm h-11">
                  <Route className="w-4 h-4 mr-2 text-slate-400" />
                  <SelectValue placeholder="Todas as Rotas" />
                </SelectTrigger>
                <SelectContent className="bg-white border shadow-xl">
                  <SelectItem value="todas">Todas as Rotas</SelectItem>
                  {rotas.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 relative">
              <Label className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Selecione a Unidade Escolar</Label>
              
              {/* Combobox Searchable */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsOpen(!isOpen)}
                  className={cn(
                    "flex h-11 w-full items-center justify-between rounded-md border border-rose-200 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-500",
                    !escolaSelecionada && "text-slate-500"
                  )}
                >
                  <div className="flex items-center overflow-hidden">
                    <School className="w-4 h-4 mr-2 text-rose-500 shrink-0" />
                    <span className="truncate">
                      {escolaSelecionada 
                        ? escolas.find(e => e.id === escolaSelecionada)?.name 
                        : "Escolha uma escola..."
                      }
                    </span>
                  </div>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </button>

                {isOpen && (
                  <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-white rounded-xl border shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                    <div className="p-2 border-b bg-slate-50/50">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          placeholder="Buscar escola (ex: Ester)..."
                          className="pl-9 h-9 border-slate-200 focus:ring-rose-500"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          autoFocus
                        />
                      </div>
                    </div>
                    <div className="max-h-[300px] overflow-y-auto p-1 custom-scrollbar">
                      {escolas
                        .filter(e => filtroRota === 'todas' || e.rotaId === filtroRota)
                        .filter(e => e.name.toLowerCase().includes(searchTerm.toLowerCase()))
                        .length === 0 ? (
                          <div className="p-4 text-center text-sm text-slate-500">Nenhuma escola encontrada.</div>
                        ) : (
                          escolas
                            .filter(e => filtroRota === 'todas' || e.rotaId === filtroRota)
                            .filter(e => e.name.toLowerCase().includes(searchTerm.toLowerCase()))
                            .map(e => (
                              <button
                                key={e.id}
                                onClick={() => {
                                  carregarDemandasEscola(e.id);
                                  setIsOpen(false);
                                  setSearchTerm('');
                                }}
                                className={cn(
                                  "w-full flex items-center px-3 py-2.5 text-sm rounded-lg transition-colors hover:bg-rose-50 text-left",
                                  escolaSelecionada === e.id ? "bg-rose-50 text-rose-700 font-bold" : "text-slate-700"
                                )}
                              >
                                <Check className={cn(
                                  "mr-2 h-4 w-4 shrink-0 text-rose-600",
                                  escolaSelecionada === e.id ? "opacity-100" : "opacity-0"
                                )} />
                                <span className="truncate">{e.name}</span>
                              </button>
                            ))
                        )
                      }
                    </div>
                  </div>
                )}
              </div>

              {filtroRota !== 'todas' && (
                <p className="text-[10px] text-slate-400 italic">Exibindo apenas escolas da rota selecionada.</p>
              )}
            </div>
          </div>

          {escolaSelecionada && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-md overflow-hidden flex flex-col">
              {/* Header Fixo do Card */}
              <div className="bg-blue-50/40 p-6 border-b border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4 z-10 shadow-sm">
                <div className="space-y-1 text-center md:text-left">
                  <h3 className="font-bold text-slate-800 text-lg">Quadro de Previsão de Demanda</h3>
                  <p className="text-slate-500 text-xs font-medium">Preencha a quantidade de alunos para cada restrição.</p>
                </div>
                <Button 
                  onClick={handleSalvarQuadro} 
                  disabled={isSubmitting || tiposDieta.length === 0} 
                  className="w-full md:w-auto bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-500/20 px-8 font-bold h-11 transition-all active:scale-95"
                >
                  <Save className="w-5 h-5 mr-2" /> 
                  {isSubmitting ? 'Salvando...' : 'Salvar Quadro da Escola'}
                </Button>
              </div>

              {/* Área de Scroll Interno */}
              <div className="max-h-[65vh] overflow-y-auto relative custom-scrollbar bg-white">
                {tiposDieta.length === 0 ? (
                  <div className="p-12 text-center text-slate-400 font-medium">Nenhum tipo de dieta cadastrado no catálogo.</div>
                ) : (
                  <div className="divide-y border-b border-slate-100">
                    {tiposDieta.map(dieta => (
                      <div key={dieta.id} className="p-4 px-6 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-slate-50/80 transition-colors gap-4 group">
                        <div className="flex items-center gap-4">
                          <div className="bg-rose-100 p-2.5 rounded-xl text-rose-600 shadow-sm group-hover:scale-110 transition-transform">
                            <Apple className="w-5 h-5" />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-700">{dieta.nome}</span>
                            <span className="text-[10px] text-slate-400 uppercase tracking-tighter">Restrição Alimentar</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 bg-slate-50 sm:bg-transparent p-4 sm:p-0 rounded-xl border border-slate-100 sm:border-none shadow-inner sm:shadow-none">
                          <div className="flex-1 sm:flex-none flex items-center gap-3">
                            <Label className="text-[10px] font-black text-slate-400 uppercase sm:hidden">Qtd Alunos</Label>
                            <Input
                              type="number"
                              min="0"
                              onKeyDown={(e) => ['e', 'E', '+', '-', '.', ','].includes(e.key) && e.preventDefault()}
                              className="w-full sm:w-28 text-center font-black text-xl h-12 sm:h-11 focus:ring-rose-500 border-rose-200 bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              placeholder="0"
                              value={quantidades[dieta.id] || ''}
                              onChange={(e) => setQuantidades({ ...quantidades, [dieta.id]: e.target.value === '' ? '' : Number(e.target.value) })}
                            />
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest hidden sm:block">Alunos</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="p-3 bg-slate-50/50 border-t flex justify-center">
                <p className="text-[10px] text-slate-400 italic">Certifique-se de salvar as alterações antes de mudar de escola.</p>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'CATALOGO' && (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-xl border shadow-sm space-y-4 h-fit">
            <h3 className="font-bold text-slate-700">Adicionar Nova Dieta</h3>
            <div className="space-y-2">
              <Label>Nome da Restrição/Dieta</Label>
              <Input placeholder="Ex: Intolerância à Lactose" value={novoTipoNome} onChange={e => setNovoTipoNome(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCriarTipo()} />
            </div>
            <Button onClick={handleCriarTipo} disabled={isSubmitting || !novoTipoNome} className="w-full bg-slate-800 text-white"><Plus className="w-4 h-4 mr-2" /> Adicionar ao Catálogo</Button>
          </div>

          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <div className="bg-slate-50 p-4 border-b"><h3 className="font-bold text-slate-700">Dietas Cadastradas</h3></div>
            <div className="divide-y max-h-[400px] overflow-y-auto">
              {tiposDieta.length === 0 ? (
                <div className="p-6 text-center text-slate-400">Nenhuma dieta cadastrada.</div>
              ) : (
                tiposDieta.map(dieta => (
                  <div key={dieta.id} className="p-4 flex items-center justify-between group">
                    <span className="font-medium text-slate-700">{dieta.nome}</span>
                    <Button variant="ghost" size="sm" onClick={() => handleExcluirTipo(dieta.id)} className="text-slate-300 hover:text-red-600 hover:bg-red-50 p-2"><Trash2 className="w-4 h-4" /></Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
