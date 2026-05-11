import { Router } from 'express';
import { EstoqueController } from '../controllers/EstoqueController.js';
import { verificarToken, permitirRoles } from '../middlewares/authMiddleware.js';

const estoqueRoutes = Router();
const estoqueController = new EstoqueController();

// Consulta de estoque atual de uma escola
estoqueRoutes.get('/escolas/:escolaId/estoque', 
  verificarToken, 
  permitirRoles(['ADMIN', 'SUPERVISORA']), 
  estoqueController.listarEstoque
);

// Lançamento de Inventário Físico (Sobrescrita em lote)
estoqueRoutes.post('/escolas/:escolaId/inventario', 
  verificarToken, 
  permitirRoles(['ADMIN', 'SUPERVISORA']), 
  estoqueController.salvarInventarioFisico
);

// Consulta de Histórico de Inventário
estoqueRoutes.get('/escolas/:escolaId/inventario/historico',
  verificarToken,
  permitirRoles(['ADMIN', 'SUPERVISORA']),
  estoqueController.consultarHistorico
);

// Descarte/Baixa de Estoque Manual
estoqueRoutes.post('/escolas/:escolaId/estoque/descarte', 
  verificarToken, 
  permitirRoles(['ADMIN', 'SUPERVISORA']), 
  estoqueController.descartar
);

// Entradas e Remanejamentos (Legado/Suporte)
estoqueRoutes.post('/estoque/entrada', 
  verificarToken, 
  permitirRoles(['ADMIN']), 
  estoqueController.registrarEntrada
);

estoqueRoutes.post('/estoque/remanejamento', 
  verificarToken, 
  permitirRoles(['ADMIN']), 
  estoqueController.remanejar
);

estoqueRoutes.post('/remanejamentos/lote', 
  verificarToken, 
  permitirRoles(['ADMIN', 'SUPERVISORA']), 
  estoqueController.remanejarLote
);

estoqueRoutes.get('/remanejamentos/historico', 
  verificarToken, 
  permitirRoles(['ADMIN', 'SUPERVISORA']), 
  estoqueController.listarHistoricoRemanejamento
);

// Pendências de Processamento (Últimos 7 dias)
estoqueRoutes.get('/pendencias-processamento',
  verificarToken,
  permitirRoles(['ADMIN', 'SUPERVISORA']),
  estoqueController.verificarPendencias
);

export { estoqueRoutes };
