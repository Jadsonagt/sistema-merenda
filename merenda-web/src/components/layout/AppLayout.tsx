import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  CalendarDays, 
  School, 
  Map, 
  BookOpen, 
  Repeat, 
  Package, 
  ClipboardList, 
  Cpu, 
  ShoppingCart, 
  ArrowLeftRight,
  LogOut,
  Car,
  User,
  ShieldPlus,
  Menu,
  X,
  AlertCircle,
  ArrowRight
} from 'lucide-react';
import { getPendenciasProcessamento } from '@/services/api/estoque';
import { Toaster } from '@/components/ui/toaster';
import { useState, useEffect } from 'react';

export const AppLayout: React.FC = () => {
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 768);
  const [pendingDates, setPendingDates] = useState<string[]>([]);

  useEffect(() => {
    const fetchPendencias = async () => {
      try {
        const data = await getPendenciasProcessamento();
        setPendingDates(data || []);
      } catch (error) {
        console.error('Erro ao checar pendências:', error);
      }
    };
    if (localStorage.getItem('token')) {
      fetchPendencias();
    }
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/');
  };

  const navItemClasses = ({ isActive }: { isActive: boolean }) => `
    flex items-center gap-3 px-4 py-3 rounded-md transition-all duration-200
    ${isActive 
      ? 'bg-blue-600 text-white shadow-md' 
      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'}
  `;

  const SectionLabel = ({ children }: { children: React.ReactNode }) => (
    <div className="mt-6 mb-2 px-4">
      <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">
        {children}
      </span>
    </div>
  );

  return (
    <div className="flex h-screen w-full bg-slate-50 overflow-hidden relative">
      {/* Overlay para Mobile */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity duration-300" 
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-72 bg-slate-900 text-slate-50 flex flex-col flex-shrink-0 shadow-xl 
        transition-all duration-300 ease-in-out transform
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:ml-[-288px]'}
        md:relative md:translate-x-0
      `}>
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <ShoppingCart className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-100">Merenda Pro</h1>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="p-1 rounded-md hover:bg-slate-800 text-slate-400 md:hidden"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        
        <nav className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          <SectionLabel>Operacional</SectionLabel>
          <NavLink to="/dashboard" className={navItemClasses} onClick={() => window.innerWidth < 768 && setIsSidebarOpen(false)}>
            <LayoutDashboard className="h-5 w-5" />
            <span className="text-sm font-medium">Dashboard</span>
          </NavLink>
          <NavLink to="/cardapios" className={navItemClasses} onClick={() => window.innerWidth < 768 && setIsSidebarOpen(false)}>
            <CalendarDays className="h-5 w-5" />
            <span className="text-sm font-medium">Cardápio da Semana</span>
          </NavLink>
          <NavLink to="/diario-bordo" className={navItemClasses} onClick={() => window.innerWidth < 768 && setIsSidebarOpen(false)}>
            <Car className="h-5 w-5" />
            <span className="text-sm font-medium">Diário de Bordo</span>
          </NavLink>

          <SectionLabel>Gestão de Rede</SectionLabel>
          <NavLink to="/escolas" className={navItemClasses} onClick={() => window.innerWidth < 768 && setIsSidebarOpen(false)}>
            <School className="h-5 w-5" />
            <span className="text-sm font-medium">Escolas</span>
          </NavLink>
          <NavLink to="/rotas" className={navItemClasses} onClick={() => window.innerWidth < 768 && setIsSidebarOpen(false)}>
            <Map className="h-5 w-5" />
            <span className="text-sm font-medium">Rotas de Entrega</span>
          </NavLink>

          <SectionLabel>Planejamento</SectionLabel>
          <NavLink to="/fichas" className={navItemClasses} onClick={() => window.innerWidth < 768 && setIsSidebarOpen(false)}>
            <BookOpen className="h-5 w-5" />
            <span className="text-sm font-medium">Catálogo de Receitas</span>
          </NavLink>
          <NavLink to="/consumos-fixos" className={navItemClasses} onClick={() => window.innerWidth < 768 && setIsSidebarOpen(false)}>
            <Repeat className="h-5 w-5" />
            <span className="text-sm font-medium">Consumo Fixo Diário</span>
          </NavLink>

          <SectionLabel>Logística e Estoque</SectionLabel>
          <NavLink to="/catalogo" className={navItemClasses} onClick={() => window.innerWidth < 768 && setIsSidebarOpen(false)}>
            <Package className="h-5 w-5" />
            <span className="text-sm font-medium">Catálogo de Itens</span>
          </NavLink>
          <NavLink to="/inventario" className={navItemClasses} onClick={() => window.innerWidth < 768 && setIsSidebarOpen(false)}>
            <ClipboardList className="h-5 w-5" />
            <span className="text-sm font-medium">Inventário</span>
          </NavLink>
          <NavLink to="/relatorio-baixas" className={navItemClasses} onClick={() => window.innerWidth < 768 && setIsSidebarOpen(false)}>
            <AlertCircle className="h-5 w-5" />
            <span className="text-sm font-medium">Relatório de Baixas</span>
          </NavLink>
          <NavLink to="/dietas" className={navItemClasses} onClick={() => window.innerWidth < 768 && setIsSidebarOpen(false)}>
            <ShieldPlus className="h-5 w-5" />
            <span className="text-sm font-medium">Dietas Especiais</span>
          </NavLink>

          <SectionLabel>Motores do Sistema</SectionLabel>
          <NavLink to="/processamento-lote" className={navItemClasses} onClick={() => window.innerWidth < 768 && setIsSidebarOpen(false)}>
            <Cpu className="h-5 w-5" />
            <span className="text-sm font-medium">Motor de Processamento</span>
          </NavLink>
          <NavLink to="/previsao-compras" className={navItemClasses} onClick={() => window.innerWidth < 768 && setIsSidebarOpen(false)}>
            <ShoppingCart className="h-5 w-5" />
            <span className="text-sm font-medium">Motor de Compras</span>
          </NavLink>
          <NavLink to="/remanejamento" className={navItemClasses} onClick={() => window.innerWidth < 768 && setIsSidebarOpen(false)}>
            <ArrowLeftRight className="h-5 w-5" />
            <span className="text-sm font-medium">Remanejamento Logístico</span>
          </NavLink>

          <SectionLabel>Minha Conta</SectionLabel>
          <NavLink to="/perfil" className={navItemClasses} onClick={() => window.innerWidth < 768 && setIsSidebarOpen(false)}>
            <User className="h-5 w-5" />
            <span className="text-sm font-medium">Meu Perfil</span>
          </NavLink>
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-md text-slate-400 hover:text-white hover:bg-red-900/20 transition-all duration-200"
          >
            <LogOut className="h-5 w-5" />
            <span className="text-sm font-medium">Sair do Sistema</span>
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 shrink-0 z-30">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 rounded-md hover:bg-slate-100 text-slate-600 transition-colors"
              title={isSidebarOpen ? "Recolher Menu" : "Expandir Menu"}
            >
              <Menu className="h-6 w-6" />
            </button>
            <div className={`transition-opacity duration-300 ${isSidebarOpen ? 'opacity-0 md:opacity-0' : 'opacity-100'}`}>
              <h1 className="text-lg font-bold text-slate-800">Merenda Pro</h1>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Espaço para notificações ou perfil se necessário futuramente */}
            <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
              <User className="h-5 w-5" />
            </div>
          </div>
        </header>

        {pendingDates.length > 0 && (
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm z-20 relative animate-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
              <div className="text-sm text-amber-800">
                <span className="font-bold">Atenção:</span> O fechamento de estoque de {pendingDates.length} {pendingDates.length === 1 ? 'dia letivo anterior' : 'dias letivos anteriores'} está pendente ({pendingDates.map(d => d.split('-').reverse().join('/')).join(', ')}).
              </div>
            </div>
            <button
              onClick={() => navigate(`/processamento-lote?date=${pendingDates[pendingDates.length - 1]}`)}
              className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-1.5 rounded-md text-xs font-bold transition-colors whitespace-nowrap shadow-sm shrink-0"
            >
              Resolver Agora <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}

        <main className="flex-1 overflow-y-auto relative bg-slate-50 custom-scrollbar">
          <div className="max-w-[1600px] mx-auto min-h-full p-4 md:p-0">
            <Outlet />
          </div>
        </main>
      </div>
      <Toaster />
    </div>
  );
};
