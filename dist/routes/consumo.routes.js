import { Router } from 'express';
import { ConsumoController } from '../controllers/ConsumoController.js';
import { verificarToken, permitirRoles } from '../middlewares/authMiddleware.js';
const consumoRoutes = Router();
const consumoController = new ConsumoController();
consumoRoutes.post('/', verificarToken, permitirRoles(['ADMIN', 'SUPERVISORA']), consumoController.registerDailyConsumption);
consumoRoutes.get('/', verificarToken, permitirRoles(['ADMIN', 'SUPERVISORA']), consumoController.listar);
consumoRoutes.put('/:id', verificarToken, permitirRoles(['ADMIN', 'SUPERVISORA']), consumoController.atualizar);
/**
 * @swagger
 * /api/consumos/processar-lote:
 *   post:
 *     summary: Super-motor de baixa diária automatizada
 *     description: Abate os ingredientes do cardápio e do consumo fixo. O motor aplica rigorosamente Math.ceil() para abater sempre pacotes inteiros. Acesso exclusivo ADMIN.
 *     tags: [Processamento Lote]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sucesso no processamento em lote.
 *       401:
 *         description: Não autorizado (Token ausente ou inválido).
 *       403:
 *         description: Acesso negado. Forbidden para Supervisora (Acesso exclusivo ADMIN).
 *       500:
 *         description: Erro interno no processamento do lote.
 */
consumoRoutes.post('/processar-lote', verificarToken, permitirRoles(['ADMIN']), consumoController.processarLoteDiario);
export { consumoRoutes };
