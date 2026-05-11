import { Router } from 'express';
import { AuthController } from '../controllers/AuthController.js';
import { verificarToken } from '../middlewares/authMiddleware.js';

const authRoutes = Router();
const authController = new AuthController();

// Rotas de perfil (protegidas)
authRoutes.get('/me', verificarToken, authController.me);
authRoutes.put('/me', verificarToken, authController.updateMe);

// Rotas públicas de autenticação
authRoutes.post('/login', authController.login);
// authRoutes.post('/register', authController.registrar); // Desabilitado por segurança (ERP Fechado)
// authRoutes.post('/reset-password', authController.resetPasswordMVP); // Desabilitado (ERP Fechado)

// Rotas legadas/auxiliares (desabilitadas por segurança)
// authRoutes.post('/esqueci-senha', authController.esqueciSenha);
// authRoutes.post('/resetar-senha', authController.resetarSenha);

export { authRoutes };
