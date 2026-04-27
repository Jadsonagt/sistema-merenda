import React from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';

export const AppLayout: React.FC = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/');
  };

  return (
    <div className="flex min-h-screen w-full bg-slate-50">
      <aside className="w-64 bg-slate-900 text-slate-50 flex flex-col">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-2xl font-bold">Sistema Merenda</h1>
        </div>
        
        <nav className="flex flex-col p-4 space-y-2">
          <Link
            to="/dashboard"
            className="flex p-4 rounded-md hover:bg-slate-800 transition-colors"
          >
            Dashboard
          </Link>
          <Link
            to="/inventario"
            className="flex p-4 rounded-md hover:bg-slate-800 transition-colors"
          >
            Inventário
          </Link>
          <Link
            to="/fichas"
            className="flex p-4 rounded-md hover:bg-slate-800 transition-colors"
          >
            Fichas Técnicas
          </Link>
          <Link
            to="/cardapios"
            className="flex p-4 rounded-md hover:bg-slate-800 transition-colors"
          >
            Cardápio da Semana
          </Link>
          <Link
            to="/metas"
            className="flex p-4 rounded-md hover:bg-slate-800 transition-colors"
          >
            Metas de Preparo
          </Link>
          <Link
            to="/consumos-fixos"
            className="flex p-4 rounded-md hover:bg-slate-800 transition-colors"
          >
            Consumo Fixo Diário
          </Link>
          <Link
            to="/processamento-lote"
            className="flex p-4 rounded-md bg-emerald-600/10 text-emerald-400 hover:bg-emerald-600/20 font-medium transition-colors"
          >
            Motor de Processamento
          </Link>
          <Link
            to="/fichas"
            className="flex p-4 rounded-md bg-stone-600/10 text-stone-500 hover:bg-stone-600/20 font-medium transition-colors"
          >
            Fichas Técnicas
          </Link>
          <Link
            to="/catalogo"
            className="flex p-4 rounded-md bg-purple-600/10 text-purple-500 hover:bg-purple-600/20 font-medium transition-colors"
          >
            Catálogo de Itens
          </Link>
          <Link
            to="/previsao-compras"
            className="flex p-4 rounded-md bg-blue-600/10 text-blue-400 hover:bg-blue-600/20 font-medium transition-colors mt-2"
          >
            Motor de Compras
          </Link>
          <Link
            to="/remanejamento"
            className="flex p-4 rounded-md bg-amber-600/10 text-amber-500 hover:bg-amber-600/20 font-medium transition-colors mt-2"
          >
            Remanejamento Logístico
          </Link>

          {/* Gestão de Rede */}
          <div className="mt-4 pt-4 border-t border-slate-800">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 px-4">Gestão de Rede</span>
          </div>
          <Link
            to="/escolas"
            className="flex p-4 rounded-md bg-indigo-600/10 text-indigo-400 hover:bg-indigo-600/20 font-medium transition-colors"
          >
            Escolas
          </Link>
          <Link
            to="/rotas"
            className="flex p-4 rounded-md bg-teal-600/10 text-teal-400 hover:bg-teal-600/20 font-medium transition-colors"
          >
            Rotas de Entrega
          </Link>
        </nav>

        <button
          onClick={handleLogout}
          className="flex p-4 w-full text-left text-slate-300 hover:text-white hover:bg-slate-800 border-t border-slate-800 transition-colors mt-auto"
        >
          Sair
        </button>
      </aside>

      <main className="flex-1 p-8 overflow-y-auto">
        <Outlet />
      </main>
      <Toaster />
    </div>
  );
};
