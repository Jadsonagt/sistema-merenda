import { Router } from 'express';
import { EstoqueController } from '../controllers/EstoqueController.js';
import { verificarToken, permitirRoles } from '../middlewares/authMiddleware.js';

const estoqueRoutes = Router();
const estoqueController = new EstoqueController();

/**
 * @swagger
 * /api/escolas/{escolaId}/estoque:
 *   get:
 *     summary: Consulta de saldo de estoque
 *     description: Retorna o saldo atual de estoque de uma escola específica.
 *     tags: [Estoque]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: escolaId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID da escola
 *     responses:
 *       200:
 *         description: Retorno dos saldos em pacotes inteiros.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   itemId:
 *                     type: string
 *                   quantityInteger:
 *                     type: integer
 *                     description: Saldo em pacotes fechados inteiros
 *       401:
 *         description: Não autorizado para acesso (Token ausente ou inválido).
 *       500:
 *         description: Erro interno no servidor.
 */
estoqueRoutes.get('/escolas/:escolaId/estoque', verificarToken, permitirRoles(['ADMIN', 'SUPERVISORA']), estoqueController.getByEscola);

/**
 * @swagger
 * /api/escolas/{escolaId}/estoque/inventario:
 *   post:
 *     summary: Lançamento de Inventário Físico
 *     description: "Atenção: A contagem física informada neste endpoint SOBRESCREVE o saldo teórico do sistema."
 *     tags: [Estoque]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: escolaId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID da escola
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - items
 *             properties:
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     itemId:
 *                       type: string
 *                     quantityInteger:
 *                       type: integer
 *     responses:
 *       200:
 *         description: Inventário processado com sucesso.
 *       400:
 *         description: Erro na validação dos dados enviados.
 *       401:
 *         description: Não autorizado.
 *       500:
 *         description: Erro interno no servidor.
 */
estoqueRoutes.post('/escolas/:escolaId/estoque/inventario', verificarToken, permitirRoles(['ADMIN', 'SUPERVISORA']), estoqueController.registerInventory);

estoqueRoutes.post('/estoque/entrada', verificarToken, permitirRoles(['ADMIN']), estoqueController.registrarEntrada);
estoqueRoutes.post('/estoque/remanejamento', verificarToken, permitirRoles(['ADMIN']), estoqueController.remanejar);

export { estoqueRoutes };
