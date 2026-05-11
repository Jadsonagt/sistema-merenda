import { Router } from 'express';
import { AuditoriaController } from '../controllers/AuditoriaController.js';
import { verificarToken, permitirRoles } from '../middlewares/authMiddleware.js';
const auditoriaRoutes = Router();
const auditoriaController = new AuditoriaController();
auditoriaRoutes.get('/lista-compras', verificarToken, permitirRoles(['ADMIN']), auditoriaController.gerarListaCompras);
auditoriaRoutes.get('/divergencias', verificarToken, permitirRoles(['ADMIN']), auditoriaController.relatorioDivergencias);
export { auditoriaRoutes };
