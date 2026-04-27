import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { getMetas, updateMeta, type MetaRetorno } from '../../services/api/metas';

export const MetasList = () => {
  const [metas, setMetas] = useState<MetaRetorno[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados para o Modal de Edição
  const [editingMeta, setEditingMeta] = useState<MetaRetorno | null>(null);
  const [novaQuantidade, setNovaQuantidade] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  const carregarMetas = async () => {
    setLoading(true);
    try {
      const dados = await getMetas();
      setMetas(dados);
    } catch (error) {
      console.error('Erro ao carregar metas:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarMetas();
  }, []);

  const handleEditClick = (meta: MetaRetorno) => {
    setEditingMeta(meta);
    setNovaQuantidade(String(meta.quantidadePadrao));
  };

  const handleCloseModal = () => {
    setEditingMeta(null);
    setNovaQuantidade('');
  };

  const handleSave = async () => {
    if (!editingMeta || !novaQuantidade) return;
    
    setIsSaving(true);
    try {
      await updateMeta(editingMeta.id, Number(novaQuantidade));
      await carregarMetas(); // Atualiza a lista preventivamente
      handleCloseModal(); // Fecha o modal
    } catch (error) {
      console.error('Erro ao salvar nova quantidade padrao:', error);
      alert('Não foi possível salvar a edição da meta.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 relative border-slate-200">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Metas de Preparo</h1>
          <p className="text-slate-500">Acompanhe as metas programadas por escola e ficha técnica.</p>
        </div>
        <Link to="/metas/nova">
          <Button>Definir Nova Meta</Button>
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        {loading && metas.length === 0 ? (
          <div className="p-8 text-center text-slate-500">Carregando metas...</div>
        ) : metas.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            Nenhuma meta cadastrada até o momento.
          </div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-700 font-medium border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Escola</th>
                <th className="px-6 py-4">Ficha Técnica</th>
                <th className="px-6 py-4 text-center">Quantidade / Porções</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {metas.map((meta) => (
                <tr key={meta.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-slate-900 font-medium">{meta.escola?.name || 'Escola não informada'}</td>
                  <td className="px-6 py-4 text-slate-600">{meta.ficha?.name || 'Ficha não informada'}</td>
                  <td className="px-6 py-4 text-center font-semibold text-slate-900">
                    <span className="bg-purple-50 text-purple-700 py-1 px-3 rounded-full text-xs">
                      {meta.quantidadePadrao}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleEditClick(meta)}
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

      {/* MODAL CUSTOMIZADO DE EDIÇÃO */}
      {editingMeta && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm transition-opacity">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 relative">
              <h3 className="text-lg font-semibold text-slate-900">Editar Meta de Preparo</h3>
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
            
            <div className="p-6 space-y-4">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Escola</p>
                <p className="text-sm text-slate-900 font-medium">{editingMeta.escola.name}</p>
              </div>

              <div className="space-y-1">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Ficha Técnica</p>
                <p className="text-sm text-slate-900 font-medium">{editingMeta.ficha.name}</p>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100">
                <Label htmlFor="novaQuantidade" className="text-slate-700">Nova Quantidade (Porções)</Label>
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
