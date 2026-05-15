import { Router } from 'express';
import { FichaTecnicaController } from '../controllers/FichaTecnicaController.js';
import { verificarToken, permitirRoles } from '../middlewares/authMiddleware.js';

const fichaRoutes = Router();
const fichaController = new FichaTecnicaController();

fichaRoutes.post('/', verificarToken, permitirRoles(['ADMIN', 'SUPERVISOR', 'SUPERVISORA', 'NUTRICIONISTA']), fichaController.create);
fichaRoutes.get('/', verificarToken, permitirRoles(['ADMIN', 'SUPERVISOR', 'SUPERVISORA', 'NUTRICIONISTA']), fichaController.list);
fichaRoutes.put('/:id', verificarToken, permitirRoles(['ADMIN', 'SUPERVISOR', 'SUPERVISORA', 'NUTRICIONISTA']), fichaController.update);
fichaRoutes.delete('/:id', verificarToken, permitirRoles(['ADMIN', 'SUPERVISOR', 'SUPERVISORA', 'NUTRICIONISTA']), fichaController.delete);

export { fichaRoutes };
