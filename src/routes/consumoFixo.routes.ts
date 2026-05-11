import { Router } from 'express';
import { ConsumoFixoController } from '../controllers/ConsumoFixoController.js';
import { verificarToken, permitirRoles } from '../middlewares/authMiddleware.js';

const consumoFixoRoutes = Router();
const consumoFixoController = new ConsumoFixoController();

// GET /api/escolas/:escolaId/consumo-fixo
consumoFixoRoutes.get('/escolas/:escolaId/consumo-fixo', 
  verificarToken, 
  permitirRoles(['ADMIN', 'SUPERVISORA']), 
  consumoFixoController.listar
);

// POST /api/escolas/:escolaId/consumo-fixo
consumoFixoRoutes.post('/escolas/:escolaId/consumo-fixo', 
  verificarToken, 
  permitirRoles(['ADMIN', 'SUPERVISORA']), 
  consumoFixoController.salvar
);

// DELETE /api/consumo-fixo/:id
consumoFixoRoutes.delete('/consumo-fixo/:id', 
  verificarToken, 
  permitirRoles(['ADMIN', 'SUPERVISORA']), 
  consumoFixoController.remover
);

export { consumoFixoRoutes };
