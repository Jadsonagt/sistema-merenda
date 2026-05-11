import { useState, useEffect } from 'react';
import {
  Cpu,
  Play,
  History,
  AlertTriangle,
  Info,
  Calendar,
  Zap
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/services/api';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ProcessamentoLog {
  id: string;
  dataProcessamento: string;
  executadoEm: string;
  status: 'SUCESSO' | 'ERRO';
  resumo: string;
}

export const MotorProcessamento = () => {
  const [dataReferencia, setDataReferencia] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [logs, setLogs] = useState<ProcessamentoLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const response = await api.get('/motor/logs');
      setLogs(response.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleExecutar = async () => {
    setExecuting(true);
    try {
      await api.post('/motor/processar-dia', { data: dataReferencia });
      toast({
        title: "Processamento Concluído!",
        description: "A baixa de estoque foi realizada para todas as escolas.",
        className: "bg-emerald-50 text-emerald-900 border-emerald-200"
      });
      fetchLogs();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro no Processamento",
        description: error.response?.data?.error || "Não foi possível processar este dia."
      });
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-8 rounded-2xl shadow-sm border border-slate-200 overflow-hidden relative">
        <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none">
          <Cpu className="h-40 w-40 text-blue-600" />
        </div>

        <div className="z-10">
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Cpu className="h-8 w-8 text-blue-600" />
            Motor de Processamento
          </h1>
          <p className="text-slate-500 mt-1 text-sm font-medium">Baixa automática de estoque baseada em cardápio e consumo real.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Painel de Controle */}
        <Card className="lg:col-span-1 shadow-lg border-none bg-slate-900 text-white overflow-hidden">
          <CardHeader className="bg-slate-800/50 border-b border-slate-700/50">
            <CardTitle className="text-lg flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-400" />
              Execução Manual
            </CardTitle>
            <CardDescription className="text-slate-400">Selecione o dia letivo para processar.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="space-y-3">
              <Label className="text-xs font-bold uppercase tracking-widest text-slate-400">Data Letiva de Referência</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 h-5 w-5 text-slate-500" />
                <Input
                  type="date"
                  value={dataReferencia}
                  onChange={(e) => setDataReferencia(e.target.value)}
                  className="bg-slate-800 border-slate-700 h-12 pl-10 text-white focus:ring-blue-500"
                />
              </div>
            </div>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  disabled={executing}
                  className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold text-md shadow-lg shadow-blue-500/20"
                >
                  {executing ? (
                    <span className="flex items-center gap-2">
                      <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Processando...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Play className="h-4 w-4" />
                      Executar Baixa do Dia
                    </span>
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-white rounded-2xl border-none shadow-2xl">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                    <AlertTriangle className="h-6 w-6 text-amber-500" />
                    Confirmar Processamento?
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-slate-600 text-md py-4">
                    Esta ação calculará o consumo de **todas as escolas** para o dia {format(new Date(dataReferencia + 'T00:00:00'), "dd/MM/yyyy", { locale: ptBR })} e abaterá permanentemente do estoque.
                    <br /><br />
                    O estoque pode ficar negativo se a contagem física for insuficiente.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="rounded-lg h-11 border-slate-200">Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleExecutar}
                    className="bg-blue-600 hover:bg-blue-700 rounded-lg h-11 font-bold shadow-lg shadow-blue-500/20"
                  >
                    Sim, Processar Agora
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <div className="bg-blue-500/10 p-4 rounded-xl border border-blue-500/20">
              <div className="flex gap-3">
                <Info className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
                <p className="text-xs text-blue-100 leading-relaxed">
                  O motor consolida o **Cardápio** + **Preparos Locais** + **Consumo Fixo** de cada escola para gerar as baixas.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Histórico de Logs */}
        <Card className="lg:col-span-2 shadow-sm border-slate-200 overflow-hidden bg-white">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <History className="h-5 w-5 text-slate-400" />
                Histórico de Execuções
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={fetchLogs} className="text-blue-600 font-bold hover:bg-blue-50">
                Atualizar
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="py-20 text-center text-slate-400">Carregando logs...</div>
            ) : logs.length === 0 ? (
              <div className="py-20 text-center text-slate-400 italic font-medium">Nenhuma execução registrada.</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="font-bold text-slate-700 py-4 h-14 pl-6">Data Letiva</TableHead>
                      <TableHead className="font-bold text-slate-700">Executado em</TableHead>
                      <TableHead className="font-bold text-slate-700 text-center">Status</TableHead>
                      <TableHead className="font-bold text-slate-700">Resumo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                        <TableCell className="font-bold text-slate-900 py-4 pl-6">
                          {format(new Date(log.dataProcessamento), "dd/MM/yyyy", { locale: ptBR })}
                        </TableCell>
                        <TableCell className="text-slate-500 text-xs">
                          {format(new Date(log.executadoEm), "dd/MM HH:mm", { locale: ptBR })}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`px-2 py-1 rounded-full text-[10px] font-black tracking-wider ${log.status === 'SUCESSO' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                            }`}>
                            {log.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-slate-600 text-xs leading-relaxed max-w-[250px]">
                          {log.resumo}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
