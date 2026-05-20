import { Router } from 'express';
import { RelatorioController } from '../controllers/RelatorioController.js';
import { verificarToken, permitirRoles } from '../middlewares/authMiddleware.js';
const relatorioRoutes = Router();
const relatorioController = new RelatorioController();
// Relatório de Baixas e Divergências
relatorioRoutes.get('/baixas', verificarToken, permitirRoles(['ADMIN', 'SUPERVISOR', 'SUPERVISORA']), relatorioController.listarBaixasEDivergencias);
export { relatorioRoutes };
