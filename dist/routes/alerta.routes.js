import { Router } from 'express';
import { AlertaController } from '../controllers/AlertaController.js';
import { verificarToken, permitirRoles } from '../middlewares/authMiddleware.js';
const alertaRoutes = Router();
const alertaController = new AlertaController();
/**
 * Cria um novo alerta de remanejamento
 */
alertaRoutes.post('/', verificarToken, permitirRoles(['ADMIN', 'SUPERVISORA']), alertaController.criar);
/**
 * Marca um alerta como RESOLVIDO
 */
alertaRoutes.put('/:id/resolver', verificarToken, permitirRoles(['ADMIN', 'SUPERVISORA']), alertaController.resolver);
export { alertaRoutes };
