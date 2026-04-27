import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { api } from '../services/api';

interface DashboardKPIs {
  totalEscolas: number;
  totalDivergencias: number;
  escolasSemInventario: number;
  alertasEstoqueBaixo: number;
  graficoVolume: { name: string; total: number }[];
  graficoStatus: { name: string; value: number; fill: string }[];
}

export const Dashboard: React.FC = () => {
  const [kpis, setKpis] = useState<DashboardKPIs | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchKPIs = async () => {
      try {
        const response = await api.get<DashboardKPIs>('/dashboard');
        setKpis(response.data);
      } catch (error) {
        console.error('Erro ao buscar dados do dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchKPIs();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full min-h-[50vh]">
        <p className="text-slate-500 font-medium animate-pulse">Carregando painel de gestão...</p>
      </div>
    );
  }

  // Fallback seguro caso a API falhe, evitando nulos na renderização visual
  const safeKpis = kpis || {
    totalEscolas: 0,
    totalDivergencias: 0,
    escolasSemInventario: 0,
    alertasEstoqueBaixo: 0,
    graficoVolume: [],
    graficoStatus: []
  };

  return (
    <div className="p-8 max-w-7xl mx-auto flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">Dashboard de Gestão</h1>
        <p className="text-slate-500 mt-1">Visão geral e indicadores em tempo real.</p>
      </div>

      {/* Grid de KPIs - 4 colunas superiores */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Total de Escolas - Neutro */}
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-500 uppercase">Total de Escolas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-800">{safeKpis.totalEscolas}</div>
          </CardContent>
        </Card>

        {/* Divergências de Inventário - Alerta/Vermelho se > 0 */}
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-500 uppercase">Divergências de Inventário</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${safeKpis.totalDivergencias > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
              {safeKpis.totalDivergencias}
            </div>
            {safeKpis.totalDivergencias > 0 && (
              <p className="text-xs text-red-500 mt-1 font-medium">Requer atenção imediata</p>
            )}
          </CardContent>
        </Card>

        {/* Pendência de Inventário - Aviso/Amarelo se > 0 */}
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-500 uppercase">Pendência de Inventário</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${safeKpis.escolasSemInventario > 0 ? 'text-amber-500' : 'text-emerald-600'}`}>
              {safeKpis.escolasSemInventario}
            </div>
            {safeKpis.escolasSemInventario > 0 && (
              <p className="text-xs text-amber-600 mt-1 font-medium">Inventários pendentes</p>
            )}
          </CardContent>
        </Card>

        {/* Alertas de Estoque Baixo - Atenção */}
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-500 uppercase">Alertas de Estoque</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${safeKpis.alertasEstoqueBaixo > 0 ? 'text-orange-500' : 'text-emerald-600'}`}>
              {safeKpis.alertasEstoqueBaixo}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Grid de Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
        
        {/* Gráfico 1: Volume em Estoque por Item (Barras) */}
        <Card className="shadow-sm border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-slate-700">Volume em Estoque por Item</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={safeKpis.graficoVolume} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{fill: '#64748b'}} axisLine={{stroke: '#cbd5e1'}} tickLine={false} />
                <YAxis tick={{fill: '#64748b'}} axisLine={{stroke: '#cbd5e1'}} tickLine={false} />
                <Tooltip 
                  cursor={{fill: '#f1f5f9'}}
                  contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                />
                <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gráfico 2: Status de Estoque (Donut/Pizza) */}
        <Card className="shadow-sm border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-slate-700">Status de Estoque das Escolas</CardTitle>
          </CardHeader>
          <CardContent className="h-80 flex justify-center items-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={safeKpis.graficoStatus}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={110}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {safeKpis.graficoStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
            
            {/* Informação central do donut */}
            <div className="absolute flex flex-col items-center justify-center top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 -mt-4">
              <span className="text-3xl font-bold text-slate-800">
                {safeKpis.graficoStatus.reduce((acc, curr) => acc + curr.value, 0)}
              </span>
              <span className="text-sm text-slate-500">Unidades</span>
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  );
};
