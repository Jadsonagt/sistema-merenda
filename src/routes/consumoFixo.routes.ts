import { Router } from 'express';
import { ConsumoFixoController } from '../controllers/ConsumoFixoController.js';
import { verificarToken, permitirRoles } from '../middlewares/authMiddleware.js';

const consumoFixoRoutes = Router();
const consumoFixoController = new ConsumoFixoController();

consumoFixoRoutes.post('/', verificarToken, permitirRoles(['ADMIN', 'SUPERVISORA']), consumoFixoController.adicionar);
consumoFixoRoutes.get('/', verificarToken, permitirRoles(['ADMIN', 'SUPERVISORA']), consumoFixoController.listar);
consumoFixoRoutes.get('/escola/:escolaId', verificarToken, permitirRoles(['ADMIN', 'SUPERVISORA']), consumoFixoController.listarPorEscola);
consumoFixoRoutes.delete('/:id', verificarToken, permitirRoles(['ADMIN', 'SUPERVISORA']), consumoFixoController.remover);

export { consumoFixoRoutes };
