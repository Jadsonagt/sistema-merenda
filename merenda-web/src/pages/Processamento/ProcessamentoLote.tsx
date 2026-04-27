import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { api } from '../../services/api';

interface BaixaLote {
  tipo: string;
  escolaId: string;
  itemId: string;
  pacotesFisicosAbatidos: number;
  saldoFinal: number;
}

export const ProcessamentoLote: React.FC = () => {
  const [dataConsumo, setDataConsumo] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [logResultados, setLogResultados] = useState<BaixaLote[]>([]);
  const { toast } = useToast();

  const handleProcessar = async () => {
    if (!dataConsumo) {
      toast({
        variant: "destructive",
        title: "Aviso",
        description: "Selecione uma data para o processamento.",
      });
      return;
    }

    setIsProcessing(true);
    setLogResultados([]);

    try {
      const response = await api.post('/consumos/processar-lote', {
        data_consumo: dataConsumo
      });
      
      const baixas = response.data.baixas_lote || [];
      setLogResultados(baixas);
      
      toast({
        title: "Sucesso!",
        description: response.data.message || "Processamento concluído com sucesso.",
      });

    } catch (error: any) {
      console.error("Erro no processamento em lote:", error);
      
      if (error.response?.data?.error) {
        const errorData = error.response.data.error;
        if (errorData.code === 'ESTOQUE_NEGATIVO') {
          toast({
             variant: "destructive",
             title: "Erro Crítico de Estoque",
             description: `Estoque insuficiente na escola ${errorData.escolaNome || errorData.escolaId} para o item ${errorData.itemNome || errorData.itemId}. Faltam ${errorData.quantidadeFaltante} pacotes.`
          });
          return;
        }
      }
      
      toast({
        variant: "destructive",
        title: "Erro no Servidor",
        description: "Ocorreu um erro ao processar o lote de consumo.",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto flex flex-col gap-6">
      <Card className="shadow-sm border-slate-200">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-slate-800">Processamento em Lote (Super-Motor)</CardTitle>
          <CardDescription className="text-slate-500 mt-2">
            Defina a data para abater o planejamento e os consumos fixos do estoque de todas as escolas simultaneamente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2 max-w-sm mt-4">
            <Label htmlFor="data_consumo" className="font-semibold text-slate-700">Data de Consumo <span className="text-red-500">*</span></Label>
            <Input 
              id="data_consumo" 
              type="date" 
              value={dataConsumo} 
              onChange={(e) => setDataConsumo(e.target.value)} 
              className="mt-1"
            />
          </div>
        </CardContent>
        <CardFooter className="flex justify-end border-t border-slate-100 pt-6 mt-2">
          <Button 
            onClick={handleProcessar} 
            disabled={isProcessing || !dataConsumo} 
            className="px-8 py-6 text-md font-semibold"
          >
            {isProcessing ? 'Processando...' : 'Processar Consumo do Dia'}
          </Button>
        </CardFooter>
      </Card>

      {logResultados.length > 0 && (
        <Card className="shadow-sm border-slate-200 animate-in fade-in slide-in-from-top-2 duration-300">
          <CardHeader>
            <CardTitle className="text-xl text-slate-800">Log de Baixas (Recibo)</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="px-6 py-4 font-semibold text-slate-700">Tipo de Baixa</TableHead>
                  <TableHead className="px-6 py-4 font-semibold text-slate-700">ID da Escola</TableHead>
                  <TableHead className="px-6 py-4 font-semibold text-slate-700">ID do Item</TableHead>
                  <TableHead className="px-6 py-4 font-semibold text-slate-700 text-right">Qtd. Abatida (Pacotes)</TableHead>
                  <TableHead className="px-6 py-4 font-semibold text-slate-700 text-right">Saldo Final</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logResultados.map((log, index) => (
                  <TableRow key={index} className="hover:bg-slate-50/50 transition-colors">
                    <TableCell className="px-6 py-3 font-medium">{log.tipo}</TableCell>
                    <TableCell className="px-6 py-3">{log.escolaId}</TableCell>
                    <TableCell className="px-6 py-3">{log.itemId}</TableCell>
                    <TableCell className="px-6 py-3 text-right text-rose-600 font-semibold">
                      -{log.pacotesFisicosAbatidos}
                    </TableCell>
                    <TableCell className="px-6 py-3 text-right font-semibold text-slate-700">
                      {log.saldoFinal}
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
