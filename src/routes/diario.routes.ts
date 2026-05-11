import { Router } from 'express';
import { DiarioBordoController, PontoInteresseController } from '../controllers/DiarioBordoController.js';
import { verificarToken, permitirRoles } from '../middlewares/authMiddleware.js';

const diarioRoutes = Router();
const diarioController = new DiarioBordoController();
const pontoController = new PontoInteresseController();

// Diário de Bordo
diarioRoutes.post('/supervisao/diario-bordo', verificarToken, diarioController.salvar);
diarioRoutes.get('/supervisao/diario-bordo', verificarToken, diarioController.listar);
diarioRoutes.post('/supervisao/calcular-distancia', verificarToken, diarioController.calcularDistancia);
diarioRoutes.delete('/supervisao/diario-bordo', verificarToken, diarioController.excluir);

// Pontos de Interesse
diarioRoutes.get('/supervisao/pontos-interesse', verificarToken, pontoController.listar);
diarioRoutes.post('/supervisao/pontos-interesse', verificarToken, permitirRoles(['ADMIN', 'SUPERVISOR', 'SUPERVISORA', 'NUTRICIONISTA']), pontoController.criar);
diarioRoutes.delete('/supervisao/pontos-interesse/:id', verificarToken, permitirRoles(['ADMIN', 'SUPERVISOR', 'SUPERVISORA', 'NUTRICIONISTA']), pontoController.excluir);

export { diarioRoutes };
