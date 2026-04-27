import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '../../services/api';

export interface Escola {
  id: string;
  name: string;
}

export interface ItemType {
  id: string;
  name: string;
  baseUnit: string;
  packagingSize: number;
}

export interface EstoqueItem {
  id: string;
  itemId: string;
  quantityInteger: number;
  item: ItemType;
}

export const Inventario: React.FC = () => {
  const [escolas, setEscolas] = useState<Escola[]>([]);
  const [escolaId, setEscolaId] = useState<string>('');
  const [estoqueAtual, setEstoqueAtual] = useState<EstoqueItem[]>([]);
  const [fisicoValues, setFisicoValues] = useState<Record<string, number | "">>({});
  const [loading, setLoading] = useState(false);

  // Carregar escolas no mount
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

  // Carregar estoque sempre que a escola mudar
  useEffect(() => {
    if (!escolaId) {
      setEstoqueAtual([]);
      return;
    }

    const fetchEstoquePorEscola = async () => {
      setLoading(true);
      try {
        const response = await api.get(`/escolas/${escolaId}/estoque`);
        setEstoqueAtual(response.data);
      } catch (error) {
        console.error("Erro ao buscar saldo de estoque:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchEstoquePorEscola();
  }, [escolaId]);

  const handleFisicoChange = (itemId: string, value: string) => {
    const intValue = parseInt(value, 10);
    setFisicoValues(prev => ({
      ...prev,
      [itemId]: isNaN(intValue) ? "" : intValue,
    }));
  };

  const handleConsolidar = () => {
    const divergenciasPayload = Object.entries(fisicoValues)
      .filter(([_, qty]) => qty !== "") 
      .map(([itemId, qty]) => ({
        itemId,
        novaQuantidade: qty
      }));
    
    console.log("payload do inventário [LOTE]:", divergenciasPayload);
    alert('Inventário consolidado processado no console!');
  };

  return (
    <div className="p-8 max-w-5xl mx-auto flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-800">Auditoria de Inventário Físico</h1>
      </div>

      <div className="bg-white p-6 rounded-md shadow-sm border border-slate-200">
        <div className="flex flex-col gap-2 max-w-md">
          <Label htmlFor="escola">Selecione a Escola <span className="text-red-500">*</span></Label>
          <Select value={escolaId} onValueChange={setEscolaId}>
            <SelectTrigger id="escola">
              <SelectValue placeholder="Escolha a unidade escolar..." className="text-slate-900" />
            </SelectTrigger>
            <SelectContent>
              {escolas.map((escola) => (
                <SelectItem key={escola.id} value={String(escola.id)} className="text-slate-900">
                  {escola.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {escolaId && (
        <div className="bg-white rounded-md shadow-sm border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
          <table className="w-full text-sm text-left text-slate-600">
            <thead className="bg-slate-50 text-slate-900 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 font-semibold">Item</th>
                <th className="px-6 py-3 font-semibold">Embalagem</th>
                <th className="px-6 py-3 font-semibold text-center">Saldo Teórico</th>
                <th className="px-6 py-3 font-semibold text-center w-40">Saldo Físico</th>
                <th className="px-6 py-3 font-semibold text-center">Divergência</th>
              </tr>
            </thead>
            <tbody>
              {estoqueAtual.length > 0 ? (
                estoqueAtual.map((estoque) => {
                  const fisicoVal = fisicoValues[estoque.item.id];
                  const temFisico = typeof fisicoVal === 'number';
                  const divergencia = temFisico ? (fisicoVal - estoque.quantityInteger) : 0;
                  
                  let divColorClass = "text-slate-500";
                  let divText = "-";
                  
                  if (temFisico) {
                    if (divergencia === 0) {
                      divColorClass = "text-slate-500 font-medium";
                      divText = "0 (Ok)";
                    } else if (divergencia > 0) {
                      divColorClass = "text-emerald-600 font-semibold"; 
                      divText = `+${divergencia} (Sobra)`;
                    } else {
                      divColorClass = "text-red-600 font-semibold"; 
                      divText = `${divergencia} (Falta)`;
                    }
                  }

                  return (
                    <tr key={estoque.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-900">{estoque.item.name}</td>
                      <td className="px-6 py-4">Pacote de {estoque.item.packagingSize} {estoque.item.baseUnit}</td>
                      <td className="px-6 py-4 text-center">{estoque.quantityInteger} pacote(s)</td>
                      <td className="px-6 py-4 text-center">
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          className="text-center w-full"
                          value={fisicoValues[estoque.item.id] ?? ""}
                          onChange={(e) => handleFisicoChange(estoque.item.id, e.target.value)}
                          placeholder="Contar"
                        />
                      </td>
                      <td className={`px-6 py-4 text-center ${divColorClass}`}>
                         {divText}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    {loading ? 'Carregando estoque teórico...' : 'Nenhum item em estoque para esta escola.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {escolaId && (
        <div className="flex justify-end mt-4">
          <Button onClick={handleConsolidar} className="py-6 px-10 text-md font-semibold" disabled={loading || estoqueAtual.length === 0}>
            Consolidar Inventário
          </Button>
        </div>
      )}
    </div>
  );
};
