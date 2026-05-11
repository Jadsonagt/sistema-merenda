import { useState, useEffect } from 'react';
import {
  ShoppingCart,
  TrendingDown,
  AlertCircle,
  FileText,
  ArrowRightCircle,
  Printer,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/services/api';
import { Badge } from '@/components/ui/badge';
import { getEscolas, type Escola } from '@/services/api/escolas';

interface PrevisaoItem {
  itemId: string;
  nome: string;
  unidade: string;
  estoqueFisicoAtual: number;
  estoqueProjetado: number;
  demandaMesAlvo: number;
  quantidadeComprar: number;
}

export const MotorCompras = () => {
  const [escolas, setEscolas] = useState<Escola[]>([]);
  const [selectedEscolaId, setSelectedEscolaId] = useState<string>("");
  const [mes, setMes] = useState<string>(String(new Date().getMonth() + 2 > 12 ? 1 : new Date().getMonth() + 2));
  const [ano, setAno] = useState<string>(String(new Date().getFullYear()));
  const [descontarEstoque, setDescontarEstoque] = useState(true);
  const [resultados, setResultados] = useState<PrevisaoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingPrint, setLoadingPrint] = useState(false);
  const { toast } = useToast();

  const meses = [
    { value: "1", label: "Janeiro" }, { value: "2", label: "Fevereiro" },
    { value: "3", label: "Março" }, { value: "4", label: "Abril" },
    { value: "5", label: "Maio" }, { value: "6", label: "Junho" },
    { value: "7", label: "Julho" }, { value: "8", label: "Agosto" },
    { value: "9", label: "Setembro" }, { value: "10", label: "Outubro" },
    { value: "11", label: "Novembro" }, { value: "12", label: "Dezembro" },
  ];

  useEffect(() => {
    const loadEscolas = async () => {
      try {
        const data = await getEscolas();
        setEscolas(data);
      } catch (error) {
        console.error(error);
      }
    };
    loadEscolas();
  }, []);

  const handleGerarRelatorio = async () => {
    if (!selectedEscolaId) return;

    setLoading(true);
    try {
      const response = await api.post('/motor/prever-compras', {
        mesAlvo: Number(mes),
        anoAlvo: Number(ano),
        escolaId: selectedEscolaId,
        descontarEstoque
      });
      setResultados(response.data);
      toast({
        title: "Relatório Gerado!",
        description: `Previsão calculada para ${escolas.find(e => e.id === selectedEscolaId)?.name}.`,
        className: "bg-blue-50 text-blue-900 border-blue-200"
      });
    } catch {
      toast({
        variant: "destructive",
        title: "Erro ao calcular",
        description: "Não foi possível processar a previsão de compras."
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = async () => {
    setLoadingPrint(true);
    try {
      const response = await api.post('/motor/pedido-mensal-consolidado', {
        mesAlvo: Number(mes),
        anoAlvo: Number(ano)
      }, {
        responseType: 'blob'
      });
      
      // Verifica se o backend enviou um erro JSON mascarado com status 200
      if (response.data.type === 'application/json') {
        const text = await response.data.text();
        const json = JSON.parse(text);
        throw new Error(json.error || 'Erro interno retornado pelo servidor.');
      }

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Pedido_Consolidado_Mes_${mes}_Ano_${ano}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error: any) {
      let errorMessage = "Não foi possível gerar a planilha de exportação.";
      
      // Caso o erro venha como Blob (Axios transforma erros 400/500 em Blob se responseType for blob)
      if (error.response?.data instanceof Blob && error.response.data.type === 'application/json') {
        try {
          const text = await error.response.data.text();
          const json = JSON.parse(text);
          errorMessage = json.error || errorMessage;
        } catch {}
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      toast({
        variant: "destructive",
        title: "Erro na Exportação",
        description: errorMessage
      });
    } finally {
      setLoadingPrint(false);
    }
  };

  const selectedEscolaName = escolas.find(e => e.id === selectedEscolaId)?.name;

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-8 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
          <ShoppingCart className="h-48 w-48 text-blue-600" />
        </div>

        <div className="z-10">
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <ShoppingCart className="h-8 w-8 text-blue-600" />
            Motor de Compras Inteligente
          </h1>
          <p className="text-slate-500 mt-1 text-sm font-medium">Previsão analítica de estoque e necessidade de reposição por unidade.</p>
        </div>
      </div>

      {/* Seletor de Período e Escola */}
      <Card className="shadow-lg border-none bg-slate-900 text-white">
        <CardContent className="pt-8 pb-8 flex flex-col lg:flex-row items-end gap-6">
          <div className="w-full lg:w-80 space-y-2">
            <Label className="text-xs font-bold uppercase tracking-widest text-slate-400 px-1">Selecione a Unidade Escola</Label>
            <Select value={selectedEscolaId} onValueChange={setSelectedEscolaId}>
              <SelectTrigger className="h-12 bg-slate-800 border-slate-700 text-white">
                <SelectValue placeholder="Escolha a escola..." />
              </SelectTrigger>
              <SelectContent>
                {escolas.map(e => (
                  <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-full lg:w-48 space-y-2">
            <Label className="text-xs font-bold uppercase tracking-widest text-slate-400 px-1">Mês Alvo</Label>
            <Select value={mes} onValueChange={setMes}>
              <SelectTrigger className="h-12 bg-slate-800 border-slate-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {meses.map(m => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-full lg:w-32 space-y-2">
            <Label className="text-xs font-bold uppercase tracking-widest text-slate-400 px-1">Ano</Label>
            <Select value={ano} onValueChange={setAno}>
              <SelectTrigger className="h-12 bg-slate-800 border-slate-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2024">2024</SelectItem>
                <SelectItem value="2025">2025</SelectItem>
                <SelectItem value="2026">2026</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="w-full lg:w-auto flex flex-col justify-end">
            <div className="flex items-center gap-3 h-12 px-4 rounded-md bg-slate-800 border border-slate-700">
              <input
                type="checkbox"
                id="descontarEstoque"
                checked={descontarEstoque}
                onChange={(e) => setDescontarEstoque(e.target.checked)}
                className="h-4 w-4 rounded border-slate-600 text-blue-600 focus:ring-blue-600 focus:ring-offset-slate-800 bg-slate-900 cursor-pointer"
              />
              <Label htmlFor="descontarEstoque" className="text-xs font-bold uppercase tracking-widest text-slate-300 cursor-pointer">
                Descontar estoque projetado
              </Label>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto mt-4 lg:mt-0">
            <Button
              onClick={handleGerarRelatorio}
              disabled={loading || !selectedEscolaId}
              className="h-12 bg-blue-600 hover:bg-blue-700 font-bold px-8 shadow-lg shadow-blue-500/20"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Calculando...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <TrendingDown className="h-4 w-4" />
                  Gerar Relatório
                </span>
              )}
            </Button>
            
            <Button
              onClick={handleExportExcel}
              disabled={loadingPrint}
              className="h-12 font-bold px-6 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20"
              title="Exportar Planilha (Excel) da Rede Completa"
            >
              {loadingPrint ? (
                <span className="flex items-center gap-2 text-white">
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Gerando Excel...
                </span>
              ) : (
                <span className="flex items-center gap-2 text-white">
                  <Printer className="h-4 w-4" />
                  Exportar Planilha (Excel)
                </span>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Resultados */}
      {resultados.length > 0 && (
        <Card className="shadow-md border-slate-200 overflow-hidden bg-white">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 flex flex-row items-center justify-between py-6">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-blue-600" />
              <div>
                <CardTitle className="text-xl">Planilha de Necessidades</CardTitle>
                <CardDescription className="font-medium text-slate-600">
                  Cálculo para {meses.find(m => m.value === mes)?.label} de {ano} — <span className="text-blue-600 font-bold">{selectedEscolaName}</span>
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-50/80">
                <TableRow>
                  <TableHead className="font-bold text-slate-700 pl-8 h-14">Item / Produto</TableHead>
                  <TableHead className="font-bold text-slate-700 text-center">Unidade</TableHead>
                  <TableHead className="font-bold text-slate-700 text-center bg-slate-100/50">Estoque Hoje</TableHead>
                  <TableHead className="font-bold text-slate-700 text-center">
                    <div className="flex flex-col items-center">
                      <span>Estoque Projetado</span>
                      <span className="text-[9px] font-normal text-slate-400 uppercase tracking-tight">Virada do Mês</span>
                    </div>
                  </TableHead>
                  <TableHead className="font-bold text-slate-700 text-center">Demanda Alvo</TableHead>
                  <TableHead className="font-bold text-blue-700 text-center bg-blue-50/50 pr-8">Sugestão de Compra</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resultados.map((res) => (
                  <TableRow key={res.itemId} className="hover:bg-slate-50/50 transition-colors border-b border-slate-100">
                    <TableCell className="pl-8 font-bold text-slate-900">{res.nome}</TableCell>
                    <TableCell className="text-center font-medium text-slate-500 uppercase text-xs">{res.unidade}</TableCell>
                    <TableCell className="text-center bg-slate-50/30 text-slate-600">{res.estoqueFisicoAtual}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <span className={res.estoqueProjetado === 0 ? "text-red-500 font-bold" : "text-slate-600"}>
                          {res.estoqueProjetado}
                        </span>
                        {res.estoqueProjetado === 0 && <AlertCircle className="h-3.5 w-3.5 text-red-400" />}
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-medium text-slate-800">{res.demandaMesAlvo}</TableCell>
                    <TableCell className="text-center bg-blue-50/30 pr-8">
                      <Badge className={`px-4 py-1.5 text-md font-black shadow-sm ${res.quantidadeComprar > 0
                          ? "bg-blue-600 hover:bg-blue-700 text-white"
                          : "bg-slate-100 text-slate-400 border-none shadow-none"
                        }`}>
                        {res.quantidadeComprar > 0 ? (
                          <div className="flex items-center gap-2">
                            {res.quantidadeComprar}
                            <ArrowRightCircle className="h-4 w-4 opacity-50" />
                          </div>
                        ) : "OK"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
