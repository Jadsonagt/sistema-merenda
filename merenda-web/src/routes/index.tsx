import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Login } from '../pages/Login';
import { Dashboard } from '../pages/Dashboard';
import { Inventario } from '../pages/Inventario';
import { AppLayout } from '../components/layout/AppLayout';
import { FichasList } from '../pages/Fichas/FichasList';
import { FichaForm } from '../pages/Fichas/FichaForm';
import { FichaDetalhes } from '../pages/Fichas/FichaDetalhes';
import { CardapioList } from '../pages/Cardapios/CardapioList';
import { CardapioForm } from '../pages/Cardapios/CardapioForm';
import { MetasList } from '../pages/Metas/MetasList';
import { MetaForm } from '../pages/Metas/MetaForm';
import { ConsumosFixosList } from '../pages/Consumos/ConsumosFixosList';
import { ConsumoFixoForm } from '../pages/Consumos/ConsumoFixoForm';
import { ProcessamentoLote } from '../pages/Processamento/ProcessamentoLote';
import { PrevisaoCompras } from '../pages/Compras/PrevisaoCompras';
import { Remanejamento } from '../pages/Estoque/Remanejamento';
import { ItemsList } from '../pages/Catalogo/ItemsList';
import { Rotas } from '../pages/Rede/Rotas';
import { Escolas } from '../pages/Rede/Escolas';

export const AppRoutes = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/inventario" element={<Inventario />} />
          <Route path="/fichas" element={<FichasList />} />
          <Route path="/fichas/nova" element={<FichaForm />} />
          <Route path="/fichas/:id" element={<FichaDetalhes />} />
          <Route path="/cardapios" element={<CardapioList />} />
          <Route path="/cardapios/novo" element={<CardapioForm />} />
          <Route path="/metas" element={<MetasList />} />
          <Route path="/metas/nova" element={<MetaForm />} />
          <Route path="/consumos-fixos" element={<ConsumosFixosList />} />
          <Route path="/consumos-fixos/novo" element={<ConsumoFixoForm />} />
          <Route path="/processamento-lote" element={<ProcessamentoLote />} />
          <Route path="/previsao-compras" element={<PrevisaoCompras />} />
          <Route path="/remanejamento" element={<Remanejamento />} />
          <Route path="/catalogo" element={<ItemsList />} />
          <Route path="/rotas" element={<Rotas />} />
          <Route path="/escolas" element={<Escolas />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};
