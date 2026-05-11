import { useState, useEffect } from 'react';
import { ShieldAlert, CalendarDays, Download } from 'lucide-react';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { getEscolas, type Escola } from '@/services/api/escolas';
import { api } from '@/services/api';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import * as XLSX from 'xlsx';

interface BaixaRegistro {
  id: string;
  data: string;
  escola: string;
  item: string;
  unidade: string;
  quantidade: number;
  tipo: 'SAIDA_DESCARTE' | 'ADJUSTMENT';
  motivo?: string;
  observacao?: string;
}

export function RelatorioBaixas() {
  const [escolas, setEscolas] = useState<Escola[]>([]);
  const [selectedEscolaId, setSelectedEscolaId] = useState<string>("TODAS");
  
  // Datas padrão: Primeiro dia do mês atual até hoje
  const dataHoje = new Date();
  const dataInicioMes = new Date(dataHoje.getFullYear(), dataHoje.getMonth(), 1);
  
  const [dataInicio, setDataInicio] = useState<string>(format(dataInicioMes, 'yyyy-MM-dd'));
  const [dataFim, setDataFim] = useState<string>(format(dataHoje, 'yyyy-MM-dd'));
  
  const [registros, setRegistros] = useState<BaixaRegistro[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const loadEscolas = async () => {
      try {
        const escolasData = await getEscolas();
        setEscolas(escolasData);
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Não foi possível carregar as escolas."
        });
      }
    };
    loadEscolas();
  }, [toast]);

  // Efeito reativo para carregar os dados sempre que os filtros mudarem
  useEffect(() => {
    fetchRelatorio();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEscolaId, dataInicio, dataFim]);

  const fetchRelatorio = async () => {
    if (!dataInicio || !dataFim) return;
    
    setLoading(true);
    try {
      const response = await api.get(`/relatorios/baixas`, {
        params: {
          escolaId: selectedEscolaId,
          dataInicio,
          dataFim
        }
      });
      setRegistros(response.data);
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Falha ao carregar relatório de baixas e divergências."
      });
    } finally {
      setLoading(false);
    }
  };

  const getTipoBadge = (tipo: string) => {
    if (tipo === 'SAIDA_DESCARTE') {
      return <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs font-black uppercase tracking-wider">[PERDA MANUAL]</span>;
    }
    if (tipo === 'ADJUSTMENT') {
      return <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-black uppercase tracking-wider">[DIVERGÊNCIA]</span>;
    }
    return <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs font-black uppercase tracking-wider">{tipo}</span>;
  };

  const formatarQuantidade = (registro: BaixaRegistro) => {
    // Para SAIDA_DESCARTE a quantidade é registrada como positiva no DB, 
    // mas logicamente é uma saída (-). Vamos forçar negativo visualmente.
    let valor = registro.quantidade;
    if (registro.tipo === 'SAIDA_DESCARTE') {
      valor = -Math.abs(valor);
    }

    if (valor === 0) {
      return <span className="text-slate-500 font-bold">0</span>;
    } else if (valor > 0) {
      return <span className="text-emerald-600 font-black">+{valor}</span>;
    } else {
      return <span className="text-red-600 font-black">{valor}</span>;
    }
  };

  const handleExportarExcel = () => {
    if (registros.length === 0) {
      toast({
        variant: "destructive",
        title: "Aviso",
        description: "Não há dados para exportar."
      });
      return;
    }

    const dadosExportacao = registros.map((reg) => {
      let valor = reg.quantidade;
      if (reg.tipo === 'SAIDA_DESCARTE') {
        valor = -Math.abs(valor);
      }

      return {
        "Data": format(new Date(reg.data), "dd/MM/yyyy HH:mm", { locale: ptBR }),
        "Escola": reg.escola,
        "Item": reg.item,
        "Unidade": reg.unidade,
        "Quantidade": valor,
        "Tipo": reg.tipo === 'SAIDA_DESCARTE' ? 'PERDA MANUAL' : 'DIVERGÊNCIA',
        "Motivo": reg.motivo || "-",
        "Observação": reg.observacao || "-"
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(dadosExportacao);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Baixas_e_Divergencias");

    XLSX.writeFile(workbook, `Relatorio_Baixas_${format(new Date(), "yyyyMMdd_HHmm")}.xlsx`);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <ShieldAlert className="h-8 w-8 text-amber-600" />
            Relatório de Baixas e Divergências
          </h1>
          <p className="text-slate-500 mt-1 text-sm font-medium">Auditoria de perdas manuais e ajustes de inventário na rede.</p>
        </div>
        <Button variant="outline" className="gap-2 font-bold text-slate-700" onClick={handleExportarExcel}>
          <Download className="h-4 w-4" /> Exportar Relatório
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="space-y-2 col-span-2">
          <Label className="text-xs font-bold uppercase text-slate-400">Unidade Escolar</Label>
          <Select value={selectedEscolaId} onValueChange={setSelectedEscolaId}>
            <SelectTrigger className="bg-slate-50 border-slate-200">
              <SelectValue placeholder="Todas as Unidades" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODAS">Todas as Unidades</SelectItem>
              {escolas.map((escola) => (
                <SelectItem key={escola.id} value={escola.id}>
                  {escola.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase text-slate-400">Data Inicial</Label>
          <div className="relative">
            <Input 
              type="date" 
              value={dataInicio} 
              onChange={(e) => setDataInicio(e.target.value)}
              className="pl-10 bg-slate-50 border-slate-200"
            />
            <CalendarDays className="h-4 w-4 absolute left-3 top-3 text-slate-400" />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase text-slate-400">Data Final</Label>
          <div className="relative">
            <Input 
              type="date" 
              value={dataFim} 
              onChange={(e) => setDataFim(e.target.value)}
              className="pl-10 bg-slate-50 border-slate-200"
            />
            <CalendarDays className="h-4 w-4 absolute left-3 top-3 text-slate-400" />
          </div>
        </div>
      </div>

      <Card className="shadow-md border-slate-200 overflow-hidden bg-white">
        <CardHeader className="bg-slate-50 border-b border-slate-100 px-6 py-4">
          <CardTitle className="text-lg flex justify-between items-center">
            Resultados da Pesquisa
            <span className="text-sm font-medium text-slate-500 bg-white px-3 py-1 rounded-full border shadow-sm">
              {registros.length} registros encontrados
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-20 text-center flex flex-col items-center gap-3">
              <div className="h-8 w-8 border-4 border-amber-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-slate-400 font-medium">Buscando movimentações...</span>
            </div>
          ) : registros.length === 0 ? (
            <div className="py-20 text-center flex flex-col items-center gap-4">
              <ShieldAlert className="h-12 w-12 text-slate-200" />
              <p className="text-slate-400 font-medium italic">Nenhum registro de baixa ou divergência encontrado no período.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-white">
                  <TableRow>
                    <TableHead className="font-bold text-slate-700 px-6 py-4">Data</TableHead>
                    <TableHead className="font-bold text-slate-700">Unidade Escolar</TableHead>
                    <TableHead className="font-bold text-slate-700">Item / Produto</TableHead>
                    <TableHead className="font-bold text-slate-700">Tipo</TableHead>
                    <TableHead className="font-bold text-slate-700 text-center">Quantidade</TableHead>
                    <TableHead className="font-bold text-slate-700">Motivo / Obs</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {registros.map((reg) => (
                    <TableRow key={reg.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                      <TableCell className="px-6 py-4 font-medium text-slate-500 text-xs">
                        {format(new Date(reg.data), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </TableCell>
                      <TableCell className="font-semibold text-slate-700 text-sm">{reg.escola}</TableCell>
                      <TableCell className="font-bold text-slate-900">
                        {reg.item}
                        <span className="ml-2 text-[10px] bg-slate-100 text-slate-500 px-1 py-0.5 rounded">{reg.unidade}</span>
                      </TableCell>
                      <TableCell>{getTipoBadge(reg.tipo)}</TableCell>
                      <TableCell className="text-center text-lg">{formatarQuantidade(reg)}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1 max-w-xs">
                          {reg.motivo && <span className="text-xs font-bold text-slate-700">{reg.motivo}</span>}
                          {reg.observacao && <span className="text-xs text-slate-500 italic truncate" title={reg.observacao}>{reg.observacao}</span>}
                          {!reg.motivo && !reg.observacao && <span className="text-xs text-slate-300">-</span>}
                        </div>
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
  );
}
