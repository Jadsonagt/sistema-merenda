import { Router } from 'express';
import { DietaController } from '../controllers/DietaController.js';
import { verificarToken, permitirRoles } from '../middlewares/authMiddleware.js';
const dietaRoutes = Router();
const controller = new DietaController();
// As rotas de criação/exclusão/atualização exigem roles específicas de gestão
const apenasGestores = permitirRoles(['ADMIN', 'SUPERVISORA', 'NUTRICIONISTA']);
// Catálogo
dietaRoutes.get('/dietas/tipos', verificarToken, controller.listarTipos);
dietaRoutes.post('/dietas/tipos', verificarToken, apenasGestores, controller.criarTipo);
dietaRoutes.delete('/dietas/tipos/:id', verificarToken, apenasGestores, controller.excluirTipo);
// Demandas
dietaRoutes.get('/dietas/demandas', verificarToken, controller.listarDemandas);
dietaRoutes.post('/dietas/demandas', verificarToken, apenasGestores, controller.salvarDemandasDaEscola);
export { dietaRoutes };
