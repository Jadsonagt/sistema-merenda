import { useEffect, useState, useMemo } from 'react';
import {
  Cpu,
  AlertTriangle,
  Plus,
  Filter,
  ShieldAlert,
  School,
  Clock,
  TrendingDown,
  Route
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { api } from '../services/api';
import { format, differenceInDays } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

interface DashboardData {
  totalEscolas: number;
  totalReceitas: number;
  alertasEstoque: {
    id: string;
    quantidade: number;
    escola: { name: string };
    item: { name: string; baseUnit: string };
  }[];
  historicoMotor: {
    id: string;
    dataProcessamento: string;
    executadoEm: string;
    status: string;
    resumo: string | null;
  }[];
  alertasRemanejamento: {
    id: string;
    quantidadeRisco: number;
    dataVencimento: string | null;
    status: string;
    escola: { name: string };
    item: { name: string; baseUnit: string };
  }[];
  escolasLista: {
    id: string;
    name: string;
    type: string;
  }[];
}

interface Escola {
  id: string;
  name: string;
  rotaId?: string;
}

interface Item {
  id: string;
  name: string;
  baseUnit: string;
}

export const Dashboard: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [escolas, setEscolas] = useState<Escola[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [escolaFiltro, setEscolaFiltro] = useState<string>("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [totalRestricoes, setTotalRestricoes] = useState<number>(0);
  const [rotas, setRotas] = useState<any[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [abaAtiva, setAbaAtiva] = useState<string | null>(null);
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [demandasRede, setDemandasRede] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [divergencias, setDivergencias] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [vencimentos, setVencimentos] = useState<any[]>([]);
  const { toast } = useToast();

  // Form states
  const [newAlert, setNewAlert] = useState({
    escolaId: '',
    itemId: '',
    quantidadeRisco: '',
    dataVencimento: ''
  });
  const [rotaFiltro, setRotaFiltro] = useState<string>(() => {
    const userStr = localStorage.getItem('usuario');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user.role?.toUpperCase() === 'SUPERVISORA' && user.rotaId) {
          return user.rotaId;
        }
      } catch (e) {
        return "all";
      }
    }
    return "all";
  });

  const isAdmin = useMemo(() => userProfile?.role?.toUpperCase() === 'ADMIN', [userProfile]);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      let url = `/dashboard/resumo?`;
      if (escolaFiltro !== "all") url += `escolaId=${escolaFiltro}&`;
      if (rotaFiltro !== "all") url += `rotaId=${rotaFiltro}&`;
      
      const response = await api.get<DashboardData>(url);
      setData(response.data);
    } catch (error) {
      console.error('Erro ao buscar resumo do dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const carregarMetricaDietas = async () => {
    try {
      let url = '/dietas/demandas?';
      if (escolaFiltro !== "all") url += `escolaId=${escolaFiltro}&`;
      if (rotaFiltro !== "all") url += `rotaId=${rotaFiltro}&`;
      
      const res = await api.get(url);
      const listaDemandas = res.data || [];
      setDemandasRede(listaDemandas);
      const total = listaDemandas.reduce((acc: number, demanda: any) => acc + Number(demanda.quantidade), 0);
      setTotalRestricoes(total);
    } catch (error) {
      console.error('Erro ao carregar métrica de dietas:', error);
    }
  };

  const carregarDivergencias = async () => {
    try {
      let url = '/dashboard/divergencias?';
      if (escolaFiltro !== "all") url += `escolaId=${escolaFiltro}&`;
      if (rotaFiltro !== "all") url += `rotaId=${rotaFiltro}&`;
      const res = await api.get(url);
      setDivergencias(res.data || []);
    } catch (error) {
      console.error('Erro ao carregar divergências:', error);
    }
  };

  const carregarVencimentos = async () => {
    try {
      let url = '/dashboard/vencimentos?';
      if (escolaFiltro !== "all") url += `escolaId=${escolaFiltro}&`;
      if (rotaFiltro !== "all") url += `rotaId=${rotaFiltro}&`;
      const res = await api.get(url);
      setVencimentos(res.data || []);
    } catch (error) {
      console.error('Erro ao carregar vencimentos:', error);
    }
  };

  const demandasAgrupadasPorEscola = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mapa: Record<string, { nomeEscola: string, restricoes: any[] }> = {};
    
    demandasRede.forEach(d => {
      if (!mapa[d.escolaId]) {
        mapa[d.escolaId] = { nomeEscola: d.escola?.name || 'Unidade Desconhecida', restricoes: [] };
      }
      mapa[d.escolaId].restricoes.push(d);
    });

    return Object.values(mapa).sort((a, b) => a.nomeEscola.localeCompare(b.nomeEscola));
  }, [demandasRede]);

  useEffect(() => {
    const userStr = localStorage.getItem('usuario');
    if (userStr) {
      const user = JSON.parse(userStr);
      setUserProfile(user);
      if (user.role?.toUpperCase() === 'SUPERVISORA' && user.rotaId) {
        setRotaFiltro(user.rotaId);
      }
    }
    
    // Listen for storage changes to refresh user state
    const handleStorageChange = () => {
      const updatedUserStr = localStorage.getItem('usuario');
      if (updatedUserStr) {
        const updatedUser = JSON.parse(updatedUserStr);
        setUserProfile(updatedUser);
        if (updatedUser.role?.toUpperCase() === 'SUPERVISORA' && updatedUser.rotaId) {
          setRotaFiltro(updatedUser.rotaId);
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  useEffect(() => {
    fetchDashboard();
    carregarMetricaDietas();
    carregarDivergencias();
    carregarVencimentos();
  }, [escolaFiltro, rotaFiltro]);

  useEffect(() => {
    api.get('/escolas').then(res => setEscolas(res.data));
    api.get('/items').then(res => setItems(res.data));
    api.get('/rotas').then(res => setRotas(res.data || []));
  }, []);

  const handleCreateAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.post('/alertas', newAlert);
      toast({
        title: "Alerta Criado!",
        description: "O lembrete de remanejamento foi registrado no painel.",
        className: "bg-amber-50 text-amber-900 border-amber-200"
      });
      setIsModalOpen(false);
      setNewAlert({ escolaId: '', itemId: '', quantidadeRisco: '', dataVencimento: '' });
      fetchDashboard();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro ao criar",
        description: "Não foi possível registrar o alerta."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResolveAlert = async (id: string) => {
    try {
      await api.put(`/alertas/${id}/resolver`);
      toast({
        title: "Resolvido!",
        description: "O item foi marcado como remanejado/resolvido.",
        className: "bg-emerald-50 text-emerald-900 border-emerald-200"
      });
      fetchDashboard();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível atualizar o status."
      });
    }
  };

  const getAlertColor = (vencimento: string | null) => {
    if (!vencimento) return "bg-slate-400";
    const days = differenceInDays(new Date(vencimento), new Date());
    if (days < 15) return "bg-red-600 shadow-red-200";
    if (days <= 30) return "bg-amber-500 shadow-amber-100";
    return "bg-emerald-500 shadow-emerald-100";
  };

  const safeData = data || {
    totalEscolas: 0,
    totalReceitas: 0,
    alertasEstoque: [],
    historicoMotor: [],
    alertasRemanejamento: [],
    escolasLista: []
  };

  const alertCount = safeData.alertasEstoque.length;
  const remanejamentoCount = safeData.alertasRemanejamento.length;

  const getTagStyleVencimento = (dias: number): string => {
    if (dias <= 7)  return 'bg-rose-100 text-rose-800';
    if (dias <= 15) return 'bg-amber-100 text-amber-800';
    return 'bg-amber-50 text-amber-700 border border-amber-200';
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-10 animate-in fade-in duration-700">

      {/* Cabeçalho e Filtro */}
      <div className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">Dashboard Gerencial</h1>
            <p className="text-slate-500 mt-1 font-medium italic">Monitoramento em tempo real da rede municipal de alimentação.</p>
          </div>

          <div className="flex items-center gap-3">
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg shadow-blue-200 gap-2">
                  <Plus className="h-4 w-4" />
                  Novo Alerta de Validade
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-white">
                <DialogHeader>
                  <DialogTitle>Registrar Alerta de Risco</DialogTitle>
                  <DialogDescription>Use este formulário para sinalizar itens próximos ao vencimento.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateAlert} className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Escola</Label>
                    <Select onValueChange={(val) => setNewAlert({ ...newAlert, escolaId: val })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a unidade..." />
                      </SelectTrigger>
                      <SelectContent>
                        {escolas
                          .filter(e => rotaFiltro === "all" || e.rotaId === rotaFiltro)
                          .map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)
                        }
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Item</Label>
                    <Select onValueChange={(val) => setNewAlert({ ...newAlert, itemId: val })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o produto..." />
                      </SelectTrigger>
                      <SelectContent>
                        {items.map(i => <SelectItem key={i.id} value={i.id}>{i.name} ({i.baseUnit})</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Quantidade em Risco</Label>
                      <Input type="number" step="0.01" required value={newAlert.quantidadeRisco} onChange={(e) => setNewAlert({ ...newAlert, quantidadeRisco: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Vencimento Estimado</Label>
                      <Input type="date" value={newAlert.dataVencimento} onChange={(e) => setNewAlert({ ...newAlert, dataVencimento: e.target.value })} />
                    </div>
                  </div>
                  <DialogFooter className="pt-4">
                    <Button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold">
                      {isSubmitting ? 'Salvando...' : 'Salvar Alerta'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

            <Badge variant="outline" className="px-4 py-1.5 border-slate-200 text-slate-500 font-bold bg-white">
              Atualizado: {format(new Date(), "HH:mm:ss")}
            </Badge>
          </div>
        </div>

        {/* Barra de Filtro por Unidade */}
        <div className="flex flex-col md:flex-row items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 text-slate-500 font-bold text-sm shrink-0">
            <Filter className="h-4 w-4" />
            Filtrar por Unidade:
          </div>
          
          <Select 
            value={rotaFiltro} 
            onValueChange={(val) => {
              setRotaFiltro(val);
              setEscolaFiltro("all");
            }}
            disabled={!isAdmin}
          >
            <SelectTrigger className={`w-[280px] bg-slate-50 border-none font-medium text-slate-700 ${!isAdmin ? 'opacity-70 cursor-not-allowed' : ''}`}>
              <div className="flex items-center gap-2">
                <Route className="h-4 w-4 text-blue-500" />
                <SelectValue placeholder="Todas as Rotas" />
              </div>
            </SelectTrigger>
            <SelectContent>
              {isAdmin && <SelectItem value="all">Todas as Rotas (Rede Global)</SelectItem>}
              {rotas.map(r => (
                <SelectItem key={r.id} value={r.id}>{r.nome || r.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={escolaFiltro} onValueChange={setEscolaFiltro}>
            <SelectTrigger className="w-[280px] bg-slate-50 border-none font-medium text-slate-700">
              <div className="flex items-center gap-2">
                <School className="h-4 w-4 text-blue-500" />
                <SelectValue placeholder="Todas as Unidades" />
              </div>
            </SelectTrigger>
            <SelectContent>
              {isAdmin && <SelectItem value="all">Todas as Unidades (Rede Global)</SelectItem>}
              {escolas
                .filter(e => rotaFiltro === "all" || e.rotaId === rotaFiltro)
                .map(e => (
                  <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                ))
              }
            </SelectContent>
          </Select>

          {(escolaFiltro !== "all" || rotaFiltro !== "all") && (
            <Badge className="bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100 transition-colors">
              Filtro Ativo: {escolaFiltro !== "all" 
                ? escolas.find(e => e.id === escolaFiltro)?.name 
                : (rotas.find(r => r.id === rotaFiltro)?.nome || rotas.find(r => r.id === rotaFiltro)?.name || "Filtrado")}
            </Badge>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col justify-center items-center py-20 gap-4">
          <div className="h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 font-bold animate-pulse">Atualizando indicadores...</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-6">
            <Card
              onClick={() => setAbaAtiva(abaAtiva === 'UNIDADES' ? null : 'UNIDADES')}
              className={`shadow-lg border-none hover:shadow-xl transition-all duration-300 cursor-pointer hover:ring-2 hover:ring-blue-400 ${abaAtiva === 'UNIDADES' ? 'ring-4 ring-blue-500 bg-blue-50/50' : 'bg-white'}`}
            >
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-widest">Unidades</CardTitle>
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${abaAtiva === 'UNIDADES' ? 'bg-blue-500 text-white' : 'bg-blue-50 text-blue-600'}`}>
                  <School className="h-5 w-5" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-black text-slate-900">{safeData.totalEscolas}</div>
                <p className="text-[10px] text-slate-400 mt-1 font-medium italic">Toque para listar</p>
              </CardContent>
            </Card>
            <div className="block md:hidden w-full">
              {abaAtiva === 'UNIDADES' && (
                <div className="animate-in fade-in slide-in-from-top-4 duration-500 space-y-4 my-2">
                  <h2 className="text-lg font-black tracking-tight text-blue-600">Unidades da Rede</h2>
                  <Card className="shadow-md border-none overflow-hidden bg-white">
                    <CardContent className="p-0">
                      <div className="w-full overflow-x-auto pb-2">
                        <Table>
                          <TableHeader className="bg-slate-50">
                            <TableRow>
                              <TableHead className="font-bold text-slate-700 px-3 py-2 text-xs">Nome</TableHead>
                              <TableHead className="font-bold text-slate-700 px-3 py-2 text-xs">Tipo</TableHead>
                              <TableHead className="font-bold text-slate-700 px-3 py-2 text-center text-xs">Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {safeData.escolasLista.map((escola) => (
                              <TableRow key={escola.id} className="hover:bg-blue-50/20 transition-colors">
                                <TableCell className="px-3 py-2 font-bold text-slate-900 min-w-[120px] whitespace-normal break-words hyphens-auto text-sm">{escola.name}</TableCell>
                                <TableCell className="px-3 py-2 font-medium text-slate-500 text-xs">{escola.type}</TableCell>
                                <TableCell className="px-3 py-2 text-center text-xs"><Badge className="bg-emerald-50 text-emerald-600 border-emerald-100 text-[10px]">Ativa</Badge></TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>

            <Card
              onClick={() => setAbaAtiva(abaAtiva === 'RESTRICOES' ? null : 'RESTRICOES')}
              className={`shadow-lg border-none hover:shadow-xl transition-all duration-300 cursor-pointer hover:ring-2 hover:ring-rose-400 ${abaAtiva === 'RESTRICOES' ? 'ring-4 ring-rose-500 bg-rose-50/50' : 'bg-white'}`}
            >
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-widest">Restrições</CardTitle>
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${abaAtiva === 'RESTRICOES' ? 'bg-rose-500 text-white' : 'bg-rose-50 text-rose-600'}`}>
                  <ShieldAlert className="h-5 w-5" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-black text-rose-600">{totalRestricoes}</div>
                <p className="text-[10px] text-slate-400 mt-1 font-medium italic">Demandas especiais</p>
              </CardContent>
            </Card>
            <div className="block md:hidden w-full">
              {abaAtiva === 'RESTRICOES' && (
                <div className="animate-in fade-in slide-in-from-top-4 duration-500 space-y-4 my-2">
                  <h2 className="text-lg font-black tracking-tight text-rose-600">Mapa de Dietas Especiais</h2>
                  <Card className="shadow-md border-none overflow-hidden bg-white">
                    <CardContent className="p-0">
                      <div className="divide-y divide-slate-100">
                        {demandasAgrupadasPorEscola.map((escola, idx) => (
                          <div key={idx} className="p-3 flex flex-col gap-2 border-b border-slate-100">
                            <div className="font-bold text-slate-700 text-sm whitespace-normal break-words hyphens-auto">{escola.nomeEscola}</div>
                            <div className="flex flex-wrap gap-1.5">
                              {escola.restricoes.map((r, i) => (
                                <span key={i} className="bg-rose-50 text-rose-700 px-2 py-0.5 rounded-md text-[10px] font-bold border border-rose-100 whitespace-normal break-words">
                                  {r.quantidade} {r.tipoDieta?.nome}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>

            <Card
              onClick={() => setAbaAtiva(abaAtiva === 'REMANEJAMENTOS' ? null : 'REMANEJAMENTOS')}
              className={`shadow-lg border-none transition-all duration-300 cursor-pointer hover:ring-2 hover:ring-amber-400 ${remanejamentoCount > 0 ? (abaAtiva === 'REMANEJAMENTOS' ? 'bg-amber-600 text-white ring-4 ring-amber-400' : 'bg-amber-500 text-white') : (abaAtiva === 'REMANEJAMENTOS' ? 'bg-amber-50 ring-4 ring-amber-500' : 'bg-white')}`}
            >
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className={`text-xs font-bold uppercase tracking-widest ${remanejamentoCount > 0 ? 'text-amber-100' : 'text-slate-400'}`}>Remanejamentos</CardTitle>
                <div className="h-10 w-10 rounded-xl flex items-center justify-center bg-amber-400/50">
                  <Clock className="h-5 w-5" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-black">{remanejamentoCount}</div>
                <p className="text-[10px] mt-1 font-medium italic opacity-80">Riscos de validade</p>
              </CardContent>
            </Card>
            <div className="block md:hidden w-full">
              {abaAtiva === 'REMANEJAMENTOS' && (
                <div className="animate-in fade-in slide-in-from-top-4 duration-500 space-y-4 my-2">
                  <h2 className="text-lg font-black tracking-tight text-amber-600">Remanejamentos Preventivos</h2>
                  <Card className="shadow-md border-none overflow-hidden bg-white">
                    <CardContent className="p-0">
                      <div className="w-full overflow-x-auto pb-2">
                        <Table>
                          <TableHeader className="bg-slate-50">
                            <TableRow>
                              <TableHead className="font-bold text-slate-700 px-3 py-2 text-xs">Unidade</TableHead>
                              <TableHead className="font-bold text-slate-700 px-3 py-2 text-xs">Item</TableHead>
                              <TableHead className="font-bold text-slate-700 px-3 py-2 text-center text-xs">Vencimento</TableHead>
                              <TableHead className="font-bold text-slate-700 px-3 py-2 text-center text-xs">Ação</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {safeData.alertasRemanejamento.map((alerta) => (
                              <TableRow key={alerta.id}>
                                <TableCell className="px-3 py-2 font-bold min-w-[120px] whitespace-normal break-words hyphens-auto text-sm">{alerta.escola.name}</TableCell>
                                <TableCell className="px-3 py-2 whitespace-normal break-words hyphens-auto text-xs">{alerta.item.name}</TableCell>
                                <TableCell className="px-3 py-2 text-center text-xs">
                                  <Badge className={`${getAlertColor(alerta.dataVencimento)} text-white border-none text-[10px]`}>
                                    {alerta.dataVencimento ? format(new Date(alerta.dataVencimento), "dd/MM/yyyy") : "AVISO"}
                                  </Badge>
                                </TableCell>
                                <TableCell className="px-3 py-2 text-center text-xs">
                                  <Button size="sm" variant="outline" className="h-7 px-2 text-[10px]" onClick={() => handleResolveAlert(alerta.id)}>Resolvido</Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>

            <Card
              onClick={() => setAbaAtiva(abaAtiva === 'MOTOR' ? null : 'MOTOR')}
              className={`shadow-lg border-none hover:shadow-xl transition-all duration-300 cursor-pointer hover:ring-2 hover:ring-slate-400 ${abaAtiva === 'MOTOR' ? 'ring-4 ring-slate-900 bg-slate-50' : 'bg-white'}`}
            >
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-widest">Motor</CardTitle>
                <div className="h-10 w-10 rounded-xl flex items-center justify-center bg-slate-100 text-slate-600">
                  <Cpu className="h-5 w-5" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-sm font-bold text-slate-700 mt-2 truncate">
                  {safeData.historicoMotor[0]?.dataProcessamento ? format(new Date(safeData.historicoMotor[0].dataProcessamento), "dd/MM/yyyy") : "Sem exec."}
                </div>
                <p className="text-[10px] text-slate-400 mt-1 font-medium italic">Último processamento</p>
              </CardContent>
            </Card>
            <div className="block md:hidden w-full">
              {abaAtiva === 'MOTOR' && (
                <div className="animate-in fade-in slide-in-from-top-4 duration-500 space-y-4 my-2">
                  <h2 className="text-lg font-black tracking-tight text-slate-900">Logs do Processamento</h2>
                  <Card className="shadow-md border-none overflow-hidden bg-white">
                    <CardContent className="p-0">
                      <div className="w-full overflow-x-auto pb-2">
                        <Table>
                          <TableHeader className="bg-slate-50">
                            <TableRow>
                              <TableHead className="font-bold text-slate-700 px-3 py-2 text-xs">Referência</TableHead>
                              <TableHead className="font-bold text-slate-700 px-3 py-2 text-xs">Status</TableHead>
                              <TableHead className="font-bold text-slate-700 px-3 py-2 text-xs">Resumo</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {safeData.historicoMotor.map((log) => (
                              <TableRow key={log.id}>
                                <TableCell className="px-3 py-2 font-bold text-xs">{format(new Date(log.dataProcessamento), "dd/MM/yyyy")}</TableCell>
                                <TableCell className="px-3 py-2 text-xs"><Badge className={`${log.status === 'SUCESSO' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'} text-[10px]`}>{log.status}</Badge></TableCell>
                                <TableCell className="px-3 py-2 text-slate-500 text-xs italic whitespace-normal break-words hyphens-auto">{log.resumo}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>

            <Card
              onClick={() => setAbaAtiva(abaAtiva === 'FALTAS' ? null : 'FALTAS')}
              className={`shadow-lg border-none transition-all duration-300 cursor-pointer hover:ring-2 hover:ring-red-400 ${alertCount > 0 ? (abaAtiva === 'FALTAS' ? 'bg-red-700 text-white ring-4 ring-red-400' : 'bg-red-600 text-white') : (abaAtiva === 'FALTAS' ? 'bg-red-50 ring-4 ring-red-500' : 'bg-white')}`}
            >
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className={`text-xs font-bold uppercase tracking-widest ${alertCount > 0 ? 'text-red-100' : 'text-slate-400'}`}>Rupturas</CardTitle>
                <div className="h-10 w-10 rounded-xl flex items-center justify-center bg-red-400/50">
                  <AlertTriangle className="h-5 w-5" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-black">{alertCount}</div>
                <p className="text-[10px] mt-1 font-medium italic opacity-80">Estoques negativos</p>
              </CardContent>
            </Card>
            <div className="block md:hidden w-full">
              {abaAtiva === 'FALTAS' && (
                <div className="animate-in fade-in slide-in-from-top-4 duration-500 space-y-4 my-2">
                  <h2 className="text-lg font-black tracking-tight text-red-600">Rupturas de Estoque</h2>
                  <Card className="shadow-md border-none overflow-hidden bg-white">
                    <CardContent className="p-0">
                      <div className="w-full overflow-x-auto pb-2">
                        <Table>
                          <TableHeader className="bg-slate-50">
                            <TableRow>
                              <TableHead className="font-bold text-slate-700 px-3 py-2 text-xs">Unidade</TableHead>
                              <TableHead className="font-bold text-slate-700 px-3 py-2 text-xs">Item</TableHead>
                              <TableHead className="font-bold text-slate-700 px-3 py-2 text-center text-xs">Saldo</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {safeData.alertasEstoque.map((alerta) => (
                              <TableRow key={alerta.id}>
                                <TableCell className="px-3 py-2 font-bold min-w-[120px] whitespace-normal break-words hyphens-auto text-sm">{alerta.escola.name}</TableCell>
                                <TableCell className="px-3 py-2 whitespace-normal break-words hyphens-auto text-xs">{alerta.item.name}</TableCell>
                                <TableCell className="px-3 py-2 text-center font-black text-red-600 text-xs">{alerta.quantidade}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </div>

          <div className="hidden md:block min-h-[200px]">
            {abaAtiva === 'UNIDADES' && (
              <div className="animate-in fade-in slide-in-from-top-4 duration-500 space-y-6">
                <h2 className="text-2xl font-black tracking-tight text-blue-600">Unidades da Rede</h2>
                <Card className="shadow-xl border-none overflow-hidden bg-white">
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader className="bg-slate-50">
                        <TableRow>
                          <TableHead className="font-bold text-slate-700 px-8 py-4">Nome</TableHead>
                          <TableHead className="font-bold text-slate-700">Tipo</TableHead>
                          <TableHead className="font-bold text-slate-700 text-center">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {safeData.escolasLista.map((escola) => (
                          <TableRow key={escola.id} className="hover:bg-blue-50/20 transition-colors">
                            <TableCell className="px-8 py-5 font-bold text-slate-900 whitespace-normal break-words hyphens-auto">{escola.name}</TableCell>
                            <TableCell className="font-medium text-slate-500">{escola.type}</TableCell>
                            <TableCell className="text-center"><Badge className="bg-emerald-50 text-emerald-600 border-emerald-100">Ativa</Badge></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            )}

            {abaAtiva === 'REMANEJAMENTOS' && (
              <div className="animate-in fade-in slide-in-from-top-4 duration-500 space-y-6">
                <h2 className="text-2xl font-black tracking-tight text-amber-600">Remanejamentos Preventivos</h2>
                <Card className="shadow-xl border-none overflow-hidden bg-white">
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader className="bg-slate-50">
                        <TableRow>
                          <TableHead className="font-bold text-slate-700 px-8 py-4">Unidade</TableHead>
                          <TableHead className="font-bold text-slate-700">Item</TableHead>
                          <TableHead className="font-bold text-slate-700 text-center">Vencimento</TableHead>
                          <TableHead className="font-bold text-slate-700 text-center">Ação</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {safeData.alertasRemanejamento.map((alerta) => (
                          <TableRow key={alerta.id}>
                            <TableCell className="px-8 py-5 font-bold whitespace-normal break-words hyphens-auto">{alerta.escola.name}</TableCell>
                            <TableCell className="whitespace-normal break-words hyphens-auto">{alerta.item.name}</TableCell>
                            <TableCell className="text-center">
                              <Badge className={`${getAlertColor(alerta.dataVencimento)} text-white border-none`}>
                                {alerta.dataVencimento ? format(new Date(alerta.dataVencimento), "dd/MM/yyyy") : "AVISO"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <Button size="sm" variant="outline" onClick={() => handleResolveAlert(alerta.id)}>Resolvido</Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            )}

            {abaAtiva === 'RESTRICOES' && (
              <div className="animate-in fade-in slide-in-from-top-4 duration-500 space-y-6">
                <h2 className="text-2xl font-black tracking-tight text-rose-600">Mapa de Dietas Especiais</h2>
                <Card className="shadow-xl border-none overflow-hidden bg-white">
                  <CardContent className="p-0">
                    <div className="divide-y divide-slate-100">
                      {demandasAgrupadasPorEscola.map((escola, idx) => (
                        <div key={idx} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="font-bold text-slate-700 whitespace-normal break-words hyphens-auto">{escola.nomeEscola}</div>
                          <div className="flex flex-wrap gap-2">
                            {escola.restricoes.map((r, i) => (
                              <span key={i} className="bg-rose-50 text-rose-700 px-3 py-1 rounded-md text-xs font-bold border border-rose-100">
                                {r.quantidade} {r.tipoDieta?.nome}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {abaAtiva === 'FALTAS' && (
              <div className="animate-in fade-in slide-in-from-top-4 duration-500 space-y-6">
                <h2 className="text-2xl font-black tracking-tight text-red-600">Rupturas de Estoque</h2>
                <Card className="shadow-xl border-none overflow-hidden bg-white">
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader className="bg-slate-50">
                        <TableRow>
                          <TableHead className="font-bold text-slate-700 px-8 py-4">Unidade</TableHead>
                          <TableHead className="font-bold text-slate-700">Item</TableHead>
                          <TableHead className="font-bold text-slate-700 text-center">Saldo</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {safeData.alertasEstoque.map((alerta) => (
                          <TableRow key={alerta.id}>
                            <TableCell className="px-8 py-5 font-bold whitespace-normal break-words hyphens-auto">{alerta.escola.name}</TableCell>
                            <TableCell className="whitespace-normal break-words hyphens-auto">{alerta.item.name}</TableCell>
                            <TableCell className="text-center font-black text-red-600">{alerta.quantidade}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            )}
            
            {abaAtiva === 'MOTOR' && (
              <div className="animate-in fade-in slide-in-from-top-4 duration-500 space-y-6">
                <h2 className="text-2xl font-black tracking-tight text-slate-900">Logs do Processamento</h2>
                <Card className="shadow-xl border-none overflow-hidden bg-white">
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader className="bg-slate-50">
                        <TableRow>
                          <TableHead className="font-bold text-slate-700 px-8 py-4">Referência</TableHead>
                          <TableHead className="font-bold text-slate-700">Status</TableHead>
                          <TableHead className="font-bold text-slate-700">Resumo</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {safeData.historicoMotor.map((log) => (
                          <TableRow key={log.id}>
                            <TableCell className="px-8 py-5 font-bold">{format(new Date(log.dataProcessamento), "dd/MM/yyyy")}</TableCell>
                            <TableCell><Badge className={log.status === 'SUCESSO' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}>{log.status}</Badge></TableCell>
                            <TableCell className="text-slate-500 text-sm italic whitespace-normal break-words hyphens-auto">{log.resumo}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
            <div className="bg-white rounded-xl border border-rose-100 shadow-sm overflow-hidden">
              <div className="bg-rose-50 border-b border-rose-100 p-4 flex justify-between items-center">
                <h3 className="font-bold text-rose-800 flex items-center gap-2">
                  <TrendingDown className="w-5 h-5 text-rose-600" /> Divergências Críticas
                </h3>
              </div>
              <div className="p-4 space-y-0 divide-y divide-slate-100 max-h-[260px] overflow-y-auto">
                {divergencias.length === 0 ? (
                  <p className="p-2 text-center text-sm text-slate-400">Sem divergências críticas.</p>
                ) : (
                  divergencias.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center py-3">
                      <div>
                        <p className="font-semibold text-slate-700 text-sm">{item.escolaNome}</p>
                        <p className="text-xs text-slate-400">{item.produto}</p>
                      </div>
                      <span className="bg-rose-100 text-rose-700 px-2.5 py-1 rounded-md font-bold text-xs">{item.valor}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-amber-100 shadow-sm overflow-hidden">
              <div className="bg-amber-50 border-b border-amber-100 p-4 flex justify-between items-center">
                <h3 className="font-bold text-amber-800 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-600" /> Vencimentos Próximos
                </h3>
              </div>
              <div className="p-4 space-y-0 divide-y divide-slate-100 max-h-[260px] overflow-y-auto">
                {vencimentos.length === 0 ? (
                  <p className="p-2 text-center text-sm text-emerald-600 font-medium">Estoque saudável.</p>
                ) : (
                  vencimentos.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center py-3">
                      <div>
                        <p className="font-semibold text-slate-700 text-sm">{item.produto}</p>
                        <p className="text-xs text-slate-400">{item.escolaNome}</p>
                      </div>
                      <span className={`${getTagStyleVencimento(item.diasParaVencer)} px-2.5 py-1 rounded-md font-bold text-xs`}>
                        {item.diasParaVencer} dias
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
