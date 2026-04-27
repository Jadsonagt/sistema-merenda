import { Router } from 'express';
import { AuthController } from '../controllers/AuthController.js';

const authRoutes = Router();
const authController = new AuthController();

/**
 * @swagger
 * /api/auth/registrar:
 *   post:
 *     summary: Criação de um novo usuário
 *     description: Endpoint público/restrito para registro de novos usuários no sistema.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nome
 *               - email
 *               - senha
 *               - role
 *             properties:
 *               nome:
 *                 type: string
 *               email:
 *                 type: string
 *               senha:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [ADMIN, SUPERVISOR, SUPERVISORA]
 *     responses:
 *       201:
 *         description: Usuário criado com sucesso.
 *       400:
 *         description: Erro de validação ou e-mail já existente.
 *       500:
 *         description: Erro interno do servidor.
 */
authRoutes.post('/registrar', authController.registrar);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Autenticação de usuário
 *     description: Verifica credenciais de acesso e caso válidas, retorna o token JWT e dados principais.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - senha
 *             properties:
 *               email:
 *                 type: string
 *               senha:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login bem sucedido. Retorna JWT.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     nome:
 *                       type: string
 *                     email:
 *                       type: string
 *                     role:
 *                       type: string
 *                 token:
 *                   type: string
 *       400:
 *         description: E-mail ou senha ausentes.
 *       401:
 *         description: Credenciais inválidas.
 *       500:
 *         description: Erro interno do servidor.
 */
authRoutes.post('/login', authController.login);
authRoutes.post('/esqueci-senha', authController.esqueciSenha);
authRoutes.post('/resetar-senha', authController.resetarSenha);

export { authRoutes };
