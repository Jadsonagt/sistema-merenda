import { Router } from 'express';
import { PreparoEscolaController } from '../controllers/PreparoEscolaController.js';
import { verificarToken, permitirRoles } from '../middlewares/authMiddleware.js';

const preparoRoutes = Router();
const preparoController = new PreparoEscolaController();

// POST   /api/escolas/:escolaId/preparos          -> Salvar/Atualizar preparo
preparoRoutes.post('/:escolaId/preparos', verificarToken, permitirRoles(['ADMIN', 'SUPERVISORA']), preparoController.salvarPreparo);

// GET    /api/escolas/:escolaId/preparos          -> Listar preparos da escola
preparoRoutes.get('/:escolaId/preparos', verificarToken, permitirRoles(['ADMIN', 'SUPERVISORA']), preparoController.listarPorEscola);

// GET    /api/escolas/:escolaId/preparos/:fichaTecnicaId  -> Buscar preparo específico
preparoRoutes.get('/:escolaId/preparos/:fichaTecnicaId', verificarToken, permitirRoles(['ADMIN', 'SUPERVISORA']), preparoController.buscarPreparo);

// DELETE /api/escolas/:escolaId/preparos/:fichaTecnicaId  -> Excluir preparo
preparoRoutes.delete('/:escolaId/preparos/:fichaTecnicaId', verificarToken, permitirRoles(['ADMIN', 'SUPERVISORA']), preparoController.excluirPreparo);

export { preparoRoutes };
