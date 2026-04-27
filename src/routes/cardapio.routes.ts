import { Router } from 'express';
import { CardapioController } from '../controllers/CardapioController.js';
import { verificarToken, permitirRoles } from '../middlewares/authMiddleware.js';

const cardapioRoutes = Router();
const cardapioController = new CardapioController();

cardapioRoutes.post('/', verificarToken, permitirRoles(['ADMIN', 'SUPERVISORA']), cardapioController.criar);
cardapioRoutes.get('/', verificarToken, permitirRoles(['ADMIN', 'SUPERVISORA']), cardapioController.listar);
cardapioRoutes.get('/:data', verificarToken, permitirRoles(['ADMIN', 'SUPERVISORA']), cardapioController.listarPorData);
cardapioRoutes.put('/:id', verificarToken, permitirRoles(['ADMIN', 'SUPERVISORA']), cardapioController.atualizar);
cardapioRoutes.delete('/:id', verificarToken, permitirRoles(['ADMIN', 'SUPERVISORA']), cardapioController.excluir);

export { cardapioRoutes };
