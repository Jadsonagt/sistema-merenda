import { Router } from 'express';
import { DashboardController } from '../controllers/DashboardController.js';
import { verificarToken, permitirRoles } from '../middlewares/authMiddleware.js';
const dashboardRoutes = Router();
const dashboardController = new DashboardController();
/**
 * Rota consolidada para o resumo gerencial do Dashboard
 */
dashboardRoutes.get('/resumo', verificarToken, permitirRoles(['ADMIN', 'SUPERVISORA']), dashboardController.resumo);
dashboardRoutes.get('/divergencias', verificarToken, permitirRoles(['ADMIN', 'SUPERVISORA']), dashboardController.getTopDivergencias);
dashboardRoutes.get('/vencimentos', verificarToken, permitirRoles(['ADMIN', 'SUPERVISORA']), dashboardController.getVencimentosCriticos);
export { dashboardRoutes };
