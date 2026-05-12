import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Login } from '../pages/Login';
import { Dashboard } from '../pages/Dashboard';
import { Inventario } from '../pages/Logistica/Inventario';
import { RelatorioBaixas } from '../pages/Logistica/RelatorioBaixas';
import { AppLayout } from '../components/layout/AppLayout';
import { FichasList } from '../pages/Fichas/FichasList';
import { FichaForm } from '../pages/Fichas/FichaForm';
import { FichaDetalhes } from '../pages/Fichas/FichaDetalhes';
import { CardapioList } from '../pages/Cardapios/CardapioList';
import { CardapioForm } from '../pages/Cardapios/CardapioForm';
import { MetasList } from '../pages/Metas/MetasList';
import { MetaForm } from '../pages/Metas/MetaForm';
import { ConsumosFixosList } from '../pages/Consumos/ConsumosFixosList';
import { MotorProcessamento } from '../pages/Sistemas/MotorProcessamento';
import { MotorCompras } from '../pages/Planejamento/MotorCompras';
import { Remanejamento } from '../pages/Estoque/Remanejamento';
import { ItemsList } from '../pages/Catalogo/ItemsList';
import { Rotas } from '../pages/Rede/Rotas';
import { Escolas } from '../pages/Rede/Escolas';
import { DiarioBordo } from '../pages/Supervisao/DiarioBordo';
import { Perfil } from '../pages/Configuracoes/Perfil';
import { GestaoDietas } from '../pages/GestaoDietas';
import { UsuariosPage } from '../pages/Configuracoes/Usuarios';
import { PontosInteressePage } from '../pages/Rede/PontosInteresse';

export const AppRoutes = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/inventario" element={<Inventario />} />
          <Route path="/relatorio-baixas" element={<RelatorioBaixas />} />
          <Route path="/fichas" element={<FichasList />} />
          <Route path="/fichas/nova" element={<FichaForm />} />
          <Route path="/fichas/:id" element={<FichaDetalhes />} />
          <Route path="/cardapios" element={<CardapioList />} />
          <Route path="/cardapios/novo" element={<CardapioForm />} />
          <Route path="/metas" element={<MetasList />} />
          <Route path="/metas/nova" element={<MetaForm />} />
          <Route path="/consumos-fixos" element={<ConsumosFixosList />} />
          <Route path="/processamento-lote" element={<MotorProcessamento />} />
          <Route path="/previsao-compras" element={<MotorCompras />} />
          <Route path="/remanejamento" element={<Remanejamento />} />
          <Route path="/catalogo" element={<ItemsList />} />
          <Route path="/rotas" element={<Rotas />} />
          <Route path="/escolas" element={<Escolas />} />
          <Route path="/diario-bordo" element={<DiarioBordo />} />
          <Route path="/dietas" element={<GestaoDietas />} />
          <Route path="/perfil" element={<Perfil />} />
          <Route path="/usuarios" element={<UsuariosPage />} />
          <Route path="/pontos-interesse" element={<PontosInteressePage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};
