import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { getConsumos, updateConsumoFixo, type ConsumoRetorno } from '../../services/api/consumos';

export const ConsumosFixosList = () => {
  const [consumos, setConsumos] = useState<ConsumoRetorno[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estados para o Modal de Edição
  const [editingConsumo, setEditingConsumo] = useState<ConsumoRetorno | null>(null);
  const [novaQuantidade, setNovaQuantidade] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const dados = await getConsumos();
      setConsumos(dados);
    } catch (error) {
      console.error('Erro ao carregar consumos fixos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleEditClick = (consumo: ConsumoRetorno) => {
    setEditingConsumo(consumo);
    setNovaQuantidade(String(consumo.quantidade));
  };

  const handleCloseModal = () => {
    setEditingConsumo(null);
    setNovaQuantidade('');
  };

  const handleSave = async () => {
    if (!editingConsumo || !novaQuantidade) return;
    
    setIsSaving(true);
    try {
      await updateConsumoFixo(editingConsumo.id, Number(novaQuantidade));
      await fetchData(); // Atualiza a lista
      handleCloseModal(); // Fecha o modal
    } catch (error) {
      console.error('Erro ao salvar nova quantidade:', error);
      alert('Não foi possível salvar a edição.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 relative border-slate-200">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Consumo Fixo Diário</h1>
          <p className="text-slate-500">Acompanhe os consumos fixos programados por escola e ajuste caso necessário.</p>
        </div>
        <Link to="/consumos-fixos/novo">
          <Button>Novo Consumo Fixo</Button>
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        {loading && consumos.length === 0 ? (
          <div className="p-8 text-center text-slate-500">Carregando consumos fixos...</div>
        ) : consumos.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            Nenhum consumo fixo cadastrado até o momento.
          </div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-700 font-medium border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Escola</th>
                <th className="px-6 py-4">Item / Produto</th>
                <th className="px-6 py-4 text-center">Quantidade Diária</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {consumos.map((consumo) => (
                <tr key={consumo.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-slate-900 font-medium">{consumo.escola?.name || 'Escola não informada'}</td>
                  <td className="px-6 py-4 text-slate-600">{consumo.item?.name || 'Item não informado'}</td>
                  <td className="px-6 py-4 text-center font-semibold text-slate-900">
                    <span className="bg-blue-50 text-blue-700 py-1 px-3 rounded-full text-xs">
                      {consumo.quantidade} un.
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleEditClick(consumo)}
                    >
                      Editar
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* MODAL CUSTOMIZADO (Tailwind Overlays) */}
      {editingConsumo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm transition-opacity">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 relative">
              <h3 className="text-lg font-semibold text-slate-900">Editar Consumo Fixo</h3>
              <button 
                onClick={handleCloseModal}
                className="text-slate-400 hover:text-slate-500 transition-colors"
                title="Fechar"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Modal Body */}
            <div className="p-6 space-y-4">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Escola</p>
                <p className="text-sm text-slate-900 font-medium">{editingConsumo.escola.name}</p>
              </div>

              <div className="space-y-1">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Item/Produto</p>
                <p className="text-sm text-slate-900 font-medium">{editingConsumo.item.name}</p>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100">
                <Label htmlFor="novaQuantidade" className="text-slate-700">Nova Quantidade Diária (un.)</Label>
                <Input
                  id="novaQuantidade"
                  type="number"
                  min="1"
                  step="1"
                  value={novaQuantidade}
                  onChange={(e) => setNovaQuantidade(e.target.value)}
                  className="font-medium"
                  autoFocus
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end space-x-2">
              <Button 
                variant="outline" 
                onClick={handleCloseModal}
                disabled={isSaving}
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleSave} 
                disabled={isSaving || !novaQuantidade}
              >
                {isSaving ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
