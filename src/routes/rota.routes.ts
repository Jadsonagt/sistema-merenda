import { Router } from 'express';
import { RotaController } from '../controllers/RotaController.js';
import { verificarToken, permitirRoles } from '../middlewares/authMiddleware.js';

const rotaRoutes = Router();
const rotaController = new RotaController();

rotaRoutes.post('/', verificarToken, permitirRoles(['ADMIN']), rotaController.create);
rotaRoutes.get('/', verificarToken, permitirRoles(['ADMIN', 'SUPERVISOR', 'SUPERVISORA', 'NUTRICIONISTA']), rotaController.list);
rotaRoutes.put('/:id', verificarToken, permitirRoles(['ADMIN']), rotaController.update);
rotaRoutes.delete('/:id', verificarToken, permitirRoles(['ADMIN']), rotaController.delete);

export { rotaRoutes };
