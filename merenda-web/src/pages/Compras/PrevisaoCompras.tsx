import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { api } from '../../services/api';

interface Escola {
  id: string;
  name: string;
}

interface PrevisaoItem {
  itemId: string;
  itemNome: string;
  saldoAtual: number;
  demandaFutura: number;
  quantidadeComprar: number;
}

export const PrevisaoCompras: React.FC = () => {
  const [escolas, setEscolas] = useState<Escola[]>([]);
  const [escolaId, setEscolaId] = useState<string>('');
  const [dataInicio, setDataInicio] = useState<string>('');
  const [dataFim, setDataFim] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [listaCompras, setListaCompras] = useState<PrevisaoItem[] | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchEscolas = async () => {
      try {
        const response = await api.get('/escolas');
        setEscolas(response.data);
      } catch (error) {
        console.error("Erro ao buscar escolas:", error);
      }
    };
    fetchEscolas();
  }, []);

  const handleGerarLista = async () => {
    if (!escolaId || !dataInicio || !dataFim) {
      toast({
        variant: "destructive",
        title: "Atenção",
        description: "Preencha todos os campos (Escola, Data Início e Data Fim).",
      });
      return;
    }

    if (new Date(dataInicio) > new Date(dataFim)) {
      toast({
        variant: "destructive",
        title: "Atenção",
        description: "A Data Inicial não pode ser posterior à Data Final.",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await api.get(`/escolas/${escolaId}/previsao-compras`, {
        params: { dataInicio, dataFim }
      });
      setListaCompras(response.data);
      
      if (response.data.length === 0) {
        toast({
          title: "Aviso",
          description: "Não há demanda agendada para o período selecionado.",
        });
      }
    } catch (error) {
      console.error("Erro ao gerar previsão:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível gerar a previsão de compras.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExportarExcel = () => {
    if (!listaCompras || listaCompras.length === 0) return;

    const dataToExport = listaCompras.map(item => ({
      "Item": item.itemNome,
      "Saldo Físico Atual": item.saldoAtual,
      "Demanda Projetada": item.demandaFutura,
      "Quantidade Sugerida para Compra": item.quantidadeComprar
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Previsao_Compras');

    XLSX.writeFile(workbook, 'Previsao_Compras.xlsx');

    toast({
      title: "Exportado",
      description: "O relatório foi exportado com sucesso.",
    });
  };

  return (
    <div className="p-8 max-w-6xl mx-auto flex flex-col gap-6">
      <div className="flex justify-between items-center mb-2">
        <h1 className="text-3xl font-bold text-slate-800">Motor de Compras (Forecasting)</h1>
      </div>

      <Card className="shadow-sm border-slate-200">
        <CardHeader>
          <CardTitle className="text-xl text-slate-700">Filtros de Geração</CardTitle>
          <CardDescription>
            Cruze o cardápio futuro com o seu estoque atual para criar uma lista exata de compras.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex flex-col gap-2 w-full md:w-1/3">
              <Label htmlFor="escola" className="font-semibold text-slate-700">Escola <span className="text-red-500">*</span></Label>
              <Select value={escolaId} onValueChange={setEscolaId}>
                <SelectTrigger id="escola">
                  <SelectValue placeholder="Selecione a escola..." />
                </SelectTrigger>
                <SelectContent>
                  {escolas.map((esc) => (
                    <SelectItem key={esc.id} value={String(esc.id)}>{esc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex flex-col gap-2 w-full md:w-auto">
              <Label htmlFor="dataInicio" className="font-semibold text-slate-700">Data Início <span className="text-red-500">*</span></Label>
              <Input 
                id="dataInicio" 
                type="date" 
                value={dataInicio} 
                onChange={(e) => setDataInicio(e.target.value)} 
              />
            </div>

            <div className="flex flex-col gap-2 w-full md:w-auto">
              <Label htmlFor="dataFim" className="font-semibold text-slate-700">Data Fim <span className="text-red-500">*</span></Label>
              <Input 
                id="dataFim" 
                type="date" 
                value={dataFim} 
                onChange={(e) => setDataFim(e.target.value)} 
              />
            </div>

            <Button 
              onClick={handleGerarLista} 
              disabled={loading} 
              className="px-8 ml-auto"
            >
              {loading ? 'Consultando...' : 'Gerar Lista de Compras'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {listaCompras !== null && (
        <Card className="shadow-sm border-slate-200 animate-in fade-in slide-in-from-top-2 duration-300">
          <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <CardTitle className="text-xl text-slate-800">Resultado da Projeção</CardTitle>
              <CardDescription className="mt-1">
                Visualização comparativa de estoque vs planejamento
              </CardDescription>
            </div>
            <Button variant="outline" onClick={handleExportarExcel} disabled={listaCompras.length === 0}>
              Exportar para Excel
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {listaCompras.length > 0 ? (
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="px-6 py-4 font-semibold text-slate-700">Item</TableHead>
                    <TableHead className="px-6 py-4 font-semibold text-slate-700 text-center">Estoque Atual</TableHead>
                    <TableHead className="px-6 py-4 font-semibold text-slate-700 text-center">Demanda Projetada</TableHead>
                    <TableHead className="px-6 py-4 font-semibold text-slate-700 text-right">Quantidade a Comprar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {listaCompras.map((item, index) => (
                    <TableRow key={index} className="hover:bg-slate-50/50 transition-colors">
                      <TableCell className="px-6 py-4 font-medium">{item.itemNome}</TableCell>
                      <TableCell className="px-6 py-4 text-center text-slate-600">
                        {item.saldoAtual} pct(s)
                      </TableCell>
                      <TableCell className="px-6 py-4 text-center text-slate-600">
                        {item.demandaFutura} pct(s)
                      </TableCell>
                      <TableCell className="px-6 py-4 text-right">
                        {item.quantidadeComprar <= 0 ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            Estoque Suficiente
                          </span>
                        ) : (
                          <span className="font-bold text-rose-600 text-md">
                            {item.quantidadeComprar} pacote(s)
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="p-8 text-center text-slate-500">
                Nenhuma projeção encontrada para os filtros aplicados.
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
