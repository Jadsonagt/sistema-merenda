import { useEffect, useState, useMemo } from 'react';
import {
  Cpu,
  AlertTriangle,
  Plus,
  Filter,
  ShieldAlert,
  School,
  Clock,
  PackageSearch,
  TrendingDown
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
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
import { ptBR } from 'date-fns/locale';
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
  const [abaAtiva, setAbaAtiva] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [totalRestricoes, setTotalRestricoes] = useState<number>(0);
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

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const url = `/dashboard/resumo${escolaFiltro !== "all" ? `?escolaId=${escolaFiltro}` : ''}`;
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
      const url = escolaFiltro === "all" ? '/dietas/demandas' : `/dietas/demandas?escolaId=${escolaFiltro}`;
      const res = await api.get(url, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      const listaDemandas = res.data || [];
      setDemandasRede(listaDemandas);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const total = listaDemandas.reduce((acc: number, demanda: any) => acc + Number(demanda.quantidade), 0);
      setTotalRestricoes(total);
    } catch (error) {
      console.error('Erro ao carregar métrica de dietas:', error);
    }
  };

  const carregarDivergencias = async () => {
    try {
      const url = escolaFiltro === "all"
        ? '/dashboard/divergencias'
        : `/dashboard/divergencias?escolaId=${escolaFiltro}`;
      const res = await api.get(url, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      setDivergencias(res.data || []);
    } catch (error) {
      console.error('Erro ao carregar divergências:', error);
    }
  };

  const carregarVencimentos = async () => {
    try {
      const url = escolaFiltro === "all"
        ? '/dashboard/vencimentos'
        : `/dashboard/vencimentos?escolaId=${escolaFiltro}`;
      const res = await api.get(url, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
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

    // Retorna um array ordenado por ordem alfabética da escola
    return Object.values(mapa).sort((a, b) => a.nomeEscola.localeCompare(b.nomeEscola));
  }, [demandasRede]);

  useEffect(() => {
    fetchDashboard();
    carregarMetricaDietas();
    carregarDivergencias();
    carregarVencimentos();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [escolaFiltro]);

  useEffect(() => {
    // Prefetch for modal and filters
    api.get('/escolas').then(res => setEscolas(res.data));
    api.get('/items').then(res => setItems(res.data));
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

  // --- PAINEL DE ATENÇÃO: dados reais (divergencias + vencimentos) ---
  const getTagStyleVencimento = (dias: number): string => {
    if (dias <= 7)  return 'bg-rose-100 text-rose-800';
    if (dias <= 15) return 'bg-amber-100 text-amber-800';
    return 'bg-amber-50 text-amber-700 border border-amber-200';
  };

  const divergenciasFiltradas = divergencias; // filtrado pelo back-end

  const vencimentosFiltrados = vencimentos; // filtrado pelo back-end
  // --- FIM DO PAINEL ---

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
              <DialogContent
                className="bg-white"
                onPointerDownOutside={(e) => e.preventDefault()}
                onEscapeKeyDown={(e) => e.preventDefault()}
              >
                <DialogHeader>
                  <DialogTitle>Registrar Alerta de Risco</DialogTitle>
                  <DialogDescription>Use este formulário para sinalizar itens próximos ao vencimento ou com excesso visual.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateAlert} className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Escola</Label>
                    <Select onValueChange={(val) => setNewAlert({ ...newAlert, escolaId: val })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a unidade..." />
                      </SelectTrigger>
                      <SelectContent>
                        {escolas.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
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
          <Select value={escolaFiltro} onValueChange={setEscolaFiltro}>
            <SelectTrigger className="max-w-md bg-slate-50 border-none font-medium text-slate-700">
              <SelectValue placeholder="Todas as Unidades" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Escolas (Rede Global)</SelectItem>
              {escolas.map(e => (
                <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {escolaFiltro !== "all" && (
            <Badge className="bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100 transition-colors">
              Filtro Ativo: {escolas.find(e => e.id === escolaFiltro)?.name}
            </Badge>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col justify-center items-center py-20 gap-4">
          <div className="h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 font-bold animate-pulse">Atualizando indicadores da unidade...</p>
        </div>
      ) : (
        <>
          {/* Grade de Indicadores Principais (Interativa) */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-6">

            {/* Unidades Atendidas */}
            <Card
              onClick={() => setAbaAtiva(abaAtiva === 'UNIDADES' ? null : 'UNIDADES')}
              className={`shadow-lg border-none hover:shadow-xl transition-all duration-300 cursor-pointer hover:ring-2 hover:ring-blue-400 ${abaAtiva === 'UNIDADES' ? 'ring-4 ring-blue-500 bg-blue-50/50' : 'bg-white'}`}
            >
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-widest">Unidades Atendidas</CardTitle>
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${abaAtiva === 'UNIDADES' ? 'bg-blue-500 text-white' : 'bg-blue-50 text-blue-600'}`}>
                  <School className="h-5 w-5" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-black text-slate-900">{safeData.totalEscolas}</div>
                <p className="text-[10px] text-slate-400 mt-1 font-medium">Clique para ver lista</p>
              </CardContent>
            </Card>

            {/* Alunos c/ Restrições */}
            <Card
              onClick={() => setAbaAtiva(abaAtiva === 'RESTRICOES' ? null : 'RESTRICOES')}
              className={`shadow-lg border-none hover:shadow-xl transition-all duration-300 cursor-pointer hover:ring-2 hover:ring-rose-400 ${abaAtiva === 'RESTRICOES' ? 'ring-4 ring-rose-500 bg-rose-50/50' : 'bg-white'}`}
            >
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className={`text-xs font-bold uppercase tracking-widest ${abaAtiva === 'RESTRICOES' ? 'text-rose-600' : 'text-slate-400'}`}>Restrições</CardTitle>
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${abaAtiva === 'RESTRICOES' ? 'bg-rose-500 text-white' : 'bg-rose-50 text-rose-600'}`}>
                  <ShieldAlert className="h-5 w-5" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className={`text-3xl font-black leading-none ${abaAtiva === 'RESTRICOES' ? 'text-rose-600' : 'text-rose-600'}`}>{totalRestricoes}</span>
                  <span className="text-[10px] font-bold text-slate-400">
                    {escolaFiltro === "all" ? "na rede" : "na unidade"}
                  </span>
                </div>
                <p className={`text-[10px] mt-1 font-medium ${abaAtiva === 'RESTRICOES' ? 'text-rose-600' : 'text-slate-400'}`}>Clique para ver mapa de unidades</p>
              </CardContent>
            </Card>

            {/* Remanejamentos Pendentes */}
            <Card
              onClick={() => setAbaAtiva(abaAtiva === 'REMANEJAMENTOS' ? null : 'REMANEJAMENTOS')}
              className={`shadow-lg border-none transition-all duration-300 cursor-pointer hover:ring-2 hover:ring-amber-400 ${remanejamentoCount > 0 ? (abaAtiva === 'REMANEJAMENTOS' ? 'bg-amber-600 text-white ring-4 ring-amber-400' : 'bg-amber-500 text-white shadow-amber-100') : (abaAtiva === 'REMANEJAMENTOS' ? 'bg-amber-50 ring-4 ring-amber-500' : 'bg-white')}`}
            >
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className={`text-xs font-bold uppercase tracking-widest ${remanejamentoCount > 0 || abaAtiva === 'REMANEJAMENTOS' ? (abaAtiva === 'REMANEJAMENTOS' && remanejamentoCount === 0 ? 'text-amber-600' : 'text-amber-100') : 'text-slate-400'}`}>Remanejamentos</CardTitle>
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${remanejamentoCount > 0 ? (abaAtiva === 'REMANEJAMENTOS' ? 'bg-amber-400' : 'bg-amber-400/50') : (abaAtiva === 'REMANEJAMENTOS' ? 'bg-amber-500 text-white' : 'bg-amber-50 text-amber-600')}`}>
                  <Clock className="h-5 w-5" />
                </div>
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-black ${remanejamentoCount > 0 || (abaAtiva === 'REMANEJAMENTOS' && remanejamentoCount > 0) ? 'text-white' : (abaAtiva === 'REMANEJAMENTOS' ? 'text-amber-900' : 'text-slate-900')}`}>{remanejamentoCount}</div>
                <p className={`text-[10px] mt-1 font-medium ${remanejamentoCount > 0 ? (abaAtiva === 'REMANEJAMENTOS' ? 'text-amber-100' : 'text-amber-100') : (abaAtiva === 'REMANEJAMENTOS' ? 'text-amber-600' : 'text-slate-400')}`}>
                  Clique para detalhar riscos
                </p>
              </CardContent>
            </Card>

            {/* Status do Motor */}
            <Card
              onClick={() => setAbaAtiva(abaAtiva === 'MOTOR' ? null : 'MOTOR')}
              className={`shadow-lg border-none hover:shadow-xl transition-all duration-300 cursor-pointer hover:ring-2 hover:ring-slate-400 ${abaAtiva === 'MOTOR' ? 'ring-4 ring-slate-900 bg-slate-50' : 'bg-white'}`}
            >
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-widest">Status do Motor</CardTitle>
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${abaAtiva === 'MOTOR' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}>
                  <Cpu className="h-5 w-5" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-sm font-bold text-slate-700 mt-2 truncate">
                  {safeData.historicoMotor.length > 0
                    ? format(new Date(safeData.historicoMotor[0].dataProcessamento), "dd/MM/yyyy", { locale: ptBR })
                    : "Nenhuma execução"}
                </div>
                <p className="text-[10px] text-slate-400 mt-1 font-medium">Clique para ver histórico</p>
              </CardContent>
            </Card>

            {/* Itens em Falta (Crítico) */}
            <Card
              onClick={() => setAbaAtiva(abaAtiva === 'FALTAS' ? null : 'FALTAS')}
              className={`shadow-lg border-none transition-all duration-300 cursor-pointer hover:ring-2 hover:ring-red-400 ${alertCount > 0 ? (abaAtiva === 'FALTAS' ? 'bg-red-700 text-white ring-4 ring-red-400' : 'bg-red-600 text-white shadow-red-200') : (abaAtiva === 'FALTAS' ? 'bg-red-50 ring-4 ring-red-500' : 'bg-white')}`}
            >
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className={`text-xs font-bold uppercase tracking-widest ${alertCount > 0 || abaAtiva === 'FALTAS' ? (abaAtiva === 'FALTAS' && alertCount === 0 ? 'text-red-600' : 'text-red-100') : 'text-slate-400'}`}>Itens em Falta</CardTitle>
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${alertCount > 0 ? (abaAtiva === 'FALTAS' ? 'bg-red-500' : 'bg-red-400/50') : (abaAtiva === 'FALTAS' ? 'bg-red-500 text-white' : 'bg-red-50 text-red-600')}`}>
                  <AlertTriangle className="h-5 w-5" />
                </div>
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-black ${alertCount > 0 || (abaAtiva === 'FALTAS' && alertCount > 0) ? 'text-white' : (abaAtiva === 'FALTAS' ? 'text-red-900' : 'text-slate-900')}`}>{alertCount}</div>
                <p className={`text-[10px] mt-1 font-medium ${alertCount > 0 ? (abaAtiva === 'FALTAS' ? 'text-red-100' : 'text-red-100') : (abaAtiva === 'FALTAS' ? 'text-red-600' : 'text-slate-400')}`}>
                  Clique para ver rupturas
                </p>
              </CardContent>
            </Card>
          </div>


          {/* Área de Progressive Disclosure (Renderização Condicional) */}
          <div className="min-h-[200px]">
            {abaAtiva === 'UNIDADES' && (
              <div className="animate-in fade-in slide-in-from-top-4 duration-500 space-y-6">
                <div className="flex items-center gap-2 px-1 text-blue-600">
                  <School className="h-6 w-6" />
                  <h2 className="text-2xl font-black tracking-tight">Unidades da Rede</h2>
                </div>
                <Card className="shadow-xl border-none overflow-hidden bg-white">
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader className="bg-slate-50">
                        <TableRow>
                          <TableHead className="font-bold text-slate-700 px-8 py-4">Nome da Unidade</TableHead>
                          <TableHead className="font-bold text-slate-700">Tipo / Modalidade</TableHead>
                          <TableHead className="font-bold text-slate-700 text-center">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {safeData.escolasLista.map((escola) => (
                          <TableRow key={escola.id} className="border-b border-slate-100 hover:bg-blue-50/20">
                            <TableCell className="px-8 py-5 font-bold text-slate-900">{escola.name}</TableCell>
                            <TableCell className="font-medium text-slate-500">{escola.type}</TableCell>
                            <TableCell className="text-center">
                              <Badge className="bg-emerald-50 text-emerald-600 border-emerald-100">Ativa</Badge>
                            </TableCell>
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
                <div className="flex items-center gap-2 px-1 text-amber-600">
                  <Clock className="h-6 w-6" />
                  <h2 className="text-2xl font-black tracking-tight">Sinalizador de Validade / Remanejamentos</h2>
                </div>
                {remanejamentoCount === 0 ? (
                  <Card className="border-dashed border-2 bg-slate-50 shadow-none border-slate-200">
                    <CardContent className="flex flex-col items-center justify-center py-12 text-center text-slate-400 italic">
                      Nenhum alerta de validade pendente registrado.
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="shadow-xl border-none overflow-hidden bg-white">
                    <CardHeader className="bg-amber-500 text-white px-8 py-6">
                      <div className="flex items-center gap-3">
                        <Clock className="h-6 w-6" />
                        <div>
                          <CardTitle className="text-lg text-white">Produtos em Risco</CardTitle>
                          <CardDescription className="text-amber-50">Itens sinalizados para remanejamento preventivo.</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader className="bg-slate-50">
                          <TableRow>
                            <TableHead className="font-bold text-slate-700 px-8 py-4">Escola / Unidade</TableHead>
                            <TableHead className="font-bold text-slate-700">Item / Produto</TableHead>
                            <TableHead className="font-bold text-slate-700 text-center">Quantidade</TableHead>
                            <TableHead className="font-bold text-slate-700 text-center">Vencimento</TableHead>
                            <TableHead className="font-bold text-slate-700 text-center">Ação</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {safeData.alertasRemanejamento.map((alerta) => (
                            <TableRow key={alerta.id} className="border-b border-slate-100 hover:bg-amber-50/10">
                              <TableCell className="px-8 py-5 font-bold text-slate-900 flex items-center gap-3">
                                <div className={`h-3 w-3 rounded-full shrink-0 ${getAlertColor(alerta.dataVencimento)}`} />
                                {alerta.escola.name}
                              </TableCell>
                              <TableCell className="font-medium text-slate-600">
                                {alerta.item.name}
                                {alerta.item.baseUnit && (
                                  <Badge variant="secondary" className="ml-2 text-[10px]">{alerta.item.baseUnit.toLowerCase()}</Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-center font-bold text-slate-700">{alerta.quantidadeRisco}</TableCell>
                              <TableCell className="text-center">
                                <Badge className={`${getAlertColor(alerta.dataVencimento)} border-none font-bold text-white`}>
                                  {alerta.dataVencimento ? format(new Date(alerta.dataVencimento), "dd/MM/yyyy") : "AVISO GERAL"}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                <Button size="sm" variant="outline" onClick={() => handleResolveAlert(alerta.id)} className="border-slate-200 text-slate-600 font-bold">
                                  Resolvido
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {abaAtiva === 'MOTOR' && (
              <div className="animate-in fade-in slide-in-from-top-4 duration-500 space-y-6">
                <div className="flex items-center gap-2 px-1 text-slate-900">
                  <Clock className="h-6 w-6" />
                  <h2 className="text-2xl font-black tracking-tight">Histórico do Motor de Processamento</h2>
                </div>
                <Card className="shadow-xl border-none overflow-hidden bg-white">
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader className="bg-slate-50">
                        <TableRow>
                          <TableHead className="font-bold text-slate-700 px-8 py-4">Data de Referência</TableHead>
                          <TableHead className="font-bold text-slate-700">Executado Em</TableHead>
                          <TableHead className="font-bold text-slate-700 text-center">Status</TableHead>
                          <TableHead className="font-bold text-slate-700">Resumo da Operação</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {safeData.historicoMotor.map((log) => (
                          <TableRow key={log.id} className="border-b border-slate-100 hover:bg-slate-50">
                            <TableCell className="px-8 py-5 font-bold text-slate-900">
                              {format(new Date(log.dataProcessamento), "dd/MM/yyyy", { locale: ptBR })}
                            </TableCell>
                            <TableCell className="font-medium text-slate-500">
                              {format(new Date(log.executadoEm), "dd/MM/yyyy HH:mm")}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge className={log.status === 'SUCESSO' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}>
                                {log.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-slate-500 text-sm italic">{log.resumo || "Sem detalhes adicionais"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            )}

            {abaAtiva === 'FALTAS' && (
              <div className="animate-in fade-in slide-in-from-top-4 duration-500 space-y-6">
                <div className="flex items-center gap-2 px-1 text-red-600">
                  <AlertTriangle className="h-6 w-6" />
                  <h2 className="text-2xl font-black tracking-tight">Atenção Requerida: Estoques Negativos</h2>
                </div>
                {alertCount === 0 ? (
                  <Card className="border-dashed border-2 bg-emerald-50/50 shadow-none border-emerald-200">
                    <CardContent className="flex flex-col items-center justify-center py-12 text-center text-emerald-700 font-bold">
                      Tudo certo com o estoque físico! Nenhuma ruptura detectada.
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="shadow-xl border-none overflow-hidden bg-white">
                    <CardHeader className="bg-red-600 text-white px-8 py-6">
                      <div className="flex items-center gap-3">
                        <PackageSearch className="h-6 w-6" />
                        <div>
                          <CardTitle className="text-lg text-white">Relatório de Ruptura</CardTitle>
                          <CardDescription className="text-red-100">Itens que excederam o estoque físico.</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader className="bg-slate-50">
                          <TableRow>
                            <TableHead className="font-bold text-slate-700 px-8 py-4">Escola / Unidade</TableHead>
                            <TableHead className="font-bold text-slate-700">Item / Produto</TableHead>
                            <TableHead className="font-bold text-slate-700 text-center">Saldo Atual</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {safeData.alertasEstoque.map((alerta) => (
                            <TableRow key={alerta.id} className="border-b border-slate-100 hover:bg-red-50/10">
                              <TableCell className="px-8 py-5 font-bold text-slate-900">{alerta.escola.name}</TableCell>
                              <TableCell className="font-medium text-slate-600">{alerta.item.name}</TableCell>
                              <TableCell className="text-center font-black text-red-600">{alerta.quantidade}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {abaAtiva === 'RESTRICOES' && (
              <div className="animate-in fade-in slide-in-from-top-4 duration-500 space-y-6">
                <div className="flex items-center gap-2 px-1 text-rose-600">
                  <ShieldAlert className="h-6 w-6" />
                  <h2 className="text-2xl font-black tracking-tight">Mapa de Restrições por Unidade</h2>
                </div>
                <Card className="shadow-xl border-none overflow-hidden bg-white">
                  <CardContent className="p-0">
                    {demandasAgrupadasPorEscola.length === 0 ? (
                      <div className="p-12 text-center text-slate-500 font-medium">Nenhuma restrição alimentar cadastrada.</div>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {demandasAgrupadasPorEscola.map((escola, index) => (
                          <div key={index} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                            <div className="font-bold text-slate-700 text-lg">{escola.nomeEscola}</div>
                            <div className="flex flex-wrap gap-2">
                              {escola.restricoes.map((restricao, i) => (
                                <span key={i} className="bg-rose-50 border border-rose-100 text-rose-700 px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-tight flex items-center gap-1.5">
                                  {restricao.quantidade} {restricao.tipoDieta?.nome}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>

          {/* PAINEL DE ATENÇÃO (WIDGETS ESTRATÉGICOS) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* WIDGET 1: Top Divergências */}
            <div className="bg-white rounded-xl border border-rose-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
              <div className="bg-rose-50 border-b border-rose-100 p-4 flex justify-between items-center">
                <h3 className="font-bold text-rose-800 flex items-center gap-2">
                  <TrendingDown className="w-5 h-5 text-rose-600" /> Top Divergências de Estoque
                </h3>
                <span className="text-[10px] uppercase font-bold text-rose-400 bg-rose-100 px-2 py-0.5 rounded-full">Auditoria</span>
              </div>
              <div className="p-4 space-y-0 divide-y divide-slate-100 max-h-[260px] overflow-y-auto">
                {divergenciasFiltradas.length === 0 ? (
                  <p className="p-2 text-center text-sm text-slate-400">Nenhum alerta para esta unidade.</p>
                ) : (
                  divergenciasFiltradas.map(item => (
                    <div key={item.id} className="flex justify-between items-center py-3 first:pt-0 last:pb-0">
                      <div>
                        <p className="font-semibold text-slate-700 text-sm">{item.escolaNome}</p>
                        <p className="text-xs text-slate-400">{item.produto}</p>
                      </div>
                      <span className="bg-rose-100 text-rose-700 px-2.5 py-1 rounded-md font-bold text-xs shrink-0 ml-3">{item.valor}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* WIDGET 2: Vencimentos Críticos */}
            <div className="bg-white rounded-xl border border-amber-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
              <div className="bg-amber-50 border-b border-amber-100 p-4 flex justify-between items-center">
                <h3 className="font-bold text-amber-800 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-600" /> Vencimentos Críticos
                </h3>
                <span className="text-[10px] uppercase font-bold text-amber-500 bg-amber-100 px-2 py-0.5 rounded-full">Próx. 30 Dias</span>
              </div>
              <div className="p-4 space-y-0 divide-y divide-slate-100 max-h-[260px] overflow-y-auto">
                {vencimentosFiltrados.length === 0 ? (
                  <p className="p-2 text-center text-sm text-emerald-600 font-medium">Nenhum produto próximo do vencimento.</p>
                ) : (
                  vencimentosFiltrados.map(item => (
                    <div key={item.id} className="flex justify-between items-center py-3 first:pt-0 last:pb-0">
                      <div>
                        <p className="font-semibold text-slate-700 text-sm">{item.produto}</p>
                        <p className="text-xs text-slate-400">{item.escolaNome}</p>
                      </div>
                      <span className={`${getTagStyleVencimento(item.diasParaVencer)} px-2.5 py-1 rounded-md font-bold text-xs shrink-0 ml-3`}>
                        Vence em {item.diasParaVencer} dia{item.diasParaVencer !== 1 ? 's' : ''}
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
