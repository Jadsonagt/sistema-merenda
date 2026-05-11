import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export const FichaDetalhes: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="p-8 max-w-2xl mx-auto flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-800">Ficha Técnica</h1>
        <Button variant="outline" onClick={() => navigate('/fichas')}>Voltar</Button>
      </div>
      
      <div className="bg-white p-6 rounded-md shadow-sm border border-slate-200">
        <p className="text-slate-600">
          O gerenciamento de ingredientes agora é realizado diretamente na configuração de preparos de cada escola.
        </p>
        <Button className="mt-4" onClick={() => navigate('/escolas')}>
          Ir para Gerenciamento de Escolas
        </Button>
      </div>
    </div>
  );
};
