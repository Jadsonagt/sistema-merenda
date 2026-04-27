import { Router } from 'express';
import { EscolaController } from '../controllers/EscolaController.js';
import { ComprasController } from '../controllers/ComprasController.js';
import { verificarToken, permitirRoles } from '../middlewares/authMiddleware.js';

const escolaRoutes = Router();
const escolaController = new EscolaController();
const comprasController = new ComprasController();

escolaRoutes.post('/', verificarToken, permitirRoles(['ADMIN']), escolaController.create);
escolaRoutes.get('/', verificarToken, permitirRoles(['ADMIN', 'SUPERVISORA']), escolaController.list);
escolaRoutes.get('/rota/:rota_id', verificarToken, permitirRoles(['ADMIN', 'SUPERVISORA']), escolaController.listByRota);
escolaRoutes.get('/:escolaId/previsao-compras', verificarToken, permitirRoles(['ADMIN', 'SUPERVISORA']), comprasController.getPrevisao);
escolaRoutes.put('/:id', verificarToken, permitirRoles(['ADMIN']), escolaController.update);
escolaRoutes.delete('/:id', verificarToken, permitirRoles(['ADMIN']), escolaController.delete);

export { escolaRoutes };
