import { Router } from 'express';
import { DashboardController } from '../controllers/dashboard.controller.js';
import { verificarToken, permitirRoles } from '../middlewares/authMiddleware.js';

const dashboardRoutes = Router();
const dashboardController = new DashboardController();

/**
 * @swagger
 * /api/dashboard:
 *   get:
 *     summary: Resumo do Dashboard
 *     description: Retorna os indicadores principais para alimentar a tela inicial do painel.
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sucesso ao processar indicadores.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalEscolas:
 *                   type: number
 *                 totalDivergencias:
 *                   type: number
 *                 escolasSemInventario:
 *                   type: number
 *                 alertasEstoqueBaixo:
 *                   type: number
 *       401:
 *         description: Não autorizado (Token ausente, inválido ou sem permissão).
 *       500:
 *         description: Erro interno ao buscar dados do dashboard.
 */
dashboardRoutes.get('/', verificarToken, permitirRoles(['ADMIN', 'SUPERVISORA']), dashboardController.getDashboard);

export { dashboardRoutes };
