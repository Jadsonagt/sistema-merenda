import { Router } from 'express';
import { UsuarioController } from '../controllers/UsuarioController.js';
import { verificarToken, permitirRoles } from '../middlewares/authMiddleware.js';

const usuarioRoutes = Router();
const usuarioController = new UsuarioController();

// Todas as rotas protegidas para ADMIN
usuarioRoutes.use(verificarToken, permitirRoles(['ADMIN']));

usuarioRoutes.get('/', usuarioController.index);
usuarioRoutes.post('/', usuarioController.store);
usuarioRoutes.put('/:id', usuarioController.update);
usuarioRoutes.delete('/:id', usuarioController.delete);

export { usuarioRoutes };
