import { Router } from 'express';
import { MetaPreparoController } from '../controllers/MetaPreparoController.js';
import { verificarToken, permitirRoles } from '../middlewares/authMiddleware.js';

const metaRoutes = Router();
const metaController = new MetaPreparoController();

metaRoutes.post('/', verificarToken, permitirRoles(['ADMIN', 'SUPERVISORA']), metaController.upsert);
metaRoutes.get('/', verificarToken, permitirRoles(['ADMIN', 'SUPERVISORA']), metaController.listar);
metaRoutes.put('/:id', verificarToken, permitirRoles(['ADMIN', 'SUPERVISORA']), metaController.atualizar);

export { metaRoutes };
