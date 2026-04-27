import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { api } from '../../services/api';

interface Escola {
  id: string;
  name: string;
}

interface ItemCatalogo {
  id: string;
  name: string;
}

export const Remanejamento: React.FC = () => {
  const [escolas, setEscolas] = useState<Escola[]>([]);
  const [itens, setItens] = useState<ItemCatalogo[]>([]);
  
  const [escolaOrigemId, setEscolaOrigemId] = useState('');
  const [escolaDestinoId, setEscolaDestinoId] = useState('');
  const [itemId, setItemId] = useState('');
  const [quantidade, setQuantidade] = useState<number | ''>('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const carregarDados = async () => {
      try {
        const [escolasResp, itensResp] = await Promise.all([
          api.get('/escolas'),
          api.get('/items')
        ]);
        setEscolas(escolasResp.data);
        setItens(itensResp.data);
      } catch (error) {
        console.error('Erro ao buscar dados:', error);
        toast({
          variant: "destructive",
          title: "Erro de Conexão",
          description: "Não foi possível carregar a lista de escolas ou itens.",
        });
      }
    };
    carregarDados();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validação de Preenchimento
    if (!escolaOrigemId || !escolaDestinoId || !itemId || !quantidade) {
      toast({
        variant: "destructive",
        title: "Atenção",
        description: "Preencha todos os campos obrigatórios.",
      });
      return;
    }

    // Regra Rígida: Não permita quantidades negativas ou zeradas.
    if (quantidade <= 0) {
      toast({
        variant: "destructive",
        title: "Atenção",
        description: "A quantidade a transferir deve ser estritamente maior que zero.",
      });
      return;
    }

    // Regra de UX Securitária
    if (escolaOrigemId === escolaDestinoId) {
      toast({
        variant: "destructive",
        title: "Atenção",
        description: "A escola de destino não pode ser igual à de origem.",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/estoque/remanejamento', {
        escolaOrigemId,
        escolaDestinoId,
        itemId,
        quantidade: Number(quantidade)
      });

      toast({
        title: "Sucesso",
        description: "Transferência realizada com sucesso.",
      });

      // Limpeza do Form
      setEscolaOrigemId('');
      setEscolaDestinoId('');
      setItemId('');
      setQuantidade('');
    } catch (error: any) {
      console.error(error);
      const isEstoqueNegativo = error.response?.data?.error?.code === 'ESTOQUE_NEGATIVO';
      
      toast({
        variant: "destructive",
        title: "Erro na Transferência",
        description: "Estoque insuficiente na escola de origem para realizar esta transferência."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Regra de UX: Filtrando o destino para não incluir a origem selecionada
  const getEscolasDestinoValidas = () => {
    return escolas.filter(escola => escola.id !== escolaOrigemId);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">Remanejamento Web</h1>
        <p className="text-slate-500 mt-1">Transferência logística de pacotes entre unidades escolares.</p>
      </div>

      <Card className="shadow-sm border-slate-200">
        <CardHeader>
          <CardTitle className="text-xl text-slate-700">Formulário de Transferência</CardTitle>
          <CardDescription>
            A movimentação atualizará instantaneamente a grade de estoque do sistema de ambas as unidades.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col gap-2">
                <Label htmlFor="escolaOrigem" className="font-semibold text-slate-700">
                  Escola de Origem <span className="text-red-500">*</span>
                </Label>
                <Select value={escolaOrigemId} onValueChange={setEscolaOrigemId}>
                  <SelectTrigger id="escolaOrigem">
                    <SelectValue placeholder="Selecione a origem..." />
                  </SelectTrigger>
                  <SelectContent>
                    {escolas.map((esc) => (
                      <SelectItem key={esc.id} value={String(esc.id)}>{esc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="escolaDestino" className="font-semibold text-slate-700">
                  Escola de Destino <span className="text-red-500">*</span>
                </Label>
                <Select 
                  value={escolaDestinoId} 
                  onValueChange={setEscolaDestinoId} 
                  disabled={!escolaOrigemId}
                >
                  <SelectTrigger id="escolaDestino">
                    <SelectValue placeholder="Selecione o destino..." />
                  </SelectTrigger>
                  <SelectContent>
                    {getEscolasDestinoValidas().map((esc) => (
                      <SelectItem key={esc.id} value={String(esc.id)}>{esc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col gap-2">
                <Label htmlFor="item" className="font-semibold text-slate-700">
                  Item Logístico <span className="text-red-500">*</span>
                </Label>
                <Select value={itemId} onValueChange={setItemId}>
                  <SelectTrigger id="item">
                    <SelectValue placeholder="Selecione o item..." />
                  </SelectTrigger>
                  <SelectContent>
                    {itens.map((item) => (
                      <SelectItem key={item.id} value={String(item.id)}>{item.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="quantidade" className="font-semibold text-slate-700">
                  Quantidade a Transferir (Pacotes) <span className="text-red-500">*</span>
                </Label>
                <Input 
                  id="quantidade" 
                  type="number" 
                  min="1"
                  step="1"
                  value={quantidade} 
                  onChange={(e) => setQuantidade(e.target.value === '' ? '' : Number(e.target.value))} 
                  placeholder="Ex: 5"
                />
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100 mt-2">
              <Button type="submit" disabled={isSubmitting} className="w-full md:w-auto px-8">
                {isSubmitting ? 'Transferindo...' : 'Transferir Estoque'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
