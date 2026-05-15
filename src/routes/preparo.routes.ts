import { Router } from 'express';
import { PreparoEscolaController } from '../controllers/PreparoEscolaController.js';
import { verificarToken, permitirRoles } from '../middlewares/authMiddleware.js';

const preparoRoutes = Router();
const preparoController = new PreparoEscolaController();

// POST   /api/escolas/:escolaId/preparos          -> Salvar/Atualizar preparo
preparoRoutes.post('/:escolaId/preparos', verificarToken, permitirRoles(['ADMIN', 'SUPERVISOR', 'SUPERVISORA']), preparoController.salvarPreparo);

// GET    /api/escolas/:escolaId/preparos          -> Listar preparos da escola
preparoRoutes.get('/:escolaId/preparos', verificarToken, permitirRoles(['ADMIN', 'SUPERVISOR', 'SUPERVISORA']), preparoController.listarPorEscola);

// GET    /api/escolas/:escolaId/preparos/:fichaTecnicaId  -> Buscar preparo específico
preparoRoutes.get('/:escolaId/preparos/:fichaTecnicaId', verificarToken, permitirRoles(['ADMIN', 'SUPERVISOR', 'SUPERVISORA']), preparoController.buscarPreparo);

// DELETE /api/escolas/:escolaId/preparos/:fichaTecnicaId  -> Excluir preparo
preparoRoutes.delete('/:escolaId/preparos/:fichaTecnicaId', verificarToken, permitirRoles(['ADMIN', 'SUPERVISOR', 'SUPERVISORA']), preparoController.excluirPreparo);

// POST   /api/escolas/:escolaId/clonar-preparos           -> Clonar preparos de outra escola
preparoRoutes.post('/:escolaId/clonar-preparos', verificarToken, permitirRoles(['ADMIN', 'SUPERVISOR', 'SUPERVISORA']), preparoController.clonarPreparos);

export { preparoRoutes };
