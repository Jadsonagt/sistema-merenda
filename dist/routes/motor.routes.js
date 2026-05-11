import { Router } from 'express';
import { MotorController } from '../controllers/MotorController.js';
import { MotorComprasController } from '../controllers/MotorComprasController.js';
import { verificarToken, permitirRoles } from '../middlewares/authMiddleware.js';
const motorRoutes = Router();
const motorController = new MotorController();
const motorComprasController = new MotorComprasController();
/**
 * Executa o processamento de baixa de estoque para uma data
 */
motorRoutes.post('/processar-dia', verificarToken, permitirRoles(['ADMIN']), motorController.processarDia);
/**
 * Lista o histórico de processamentos realizados
 */
motorRoutes.get('/logs', verificarToken, permitirRoles(['ADMIN', 'SUPERVISORA']), motorController.listarLogs);
/**
 * Previsão de Necessidade de Compras
 */
motorRoutes.post('/prever-compras', verificarToken, permitirRoles(['ADMIN', 'SUPERVISORA']), motorComprasController.preverCompras);
motorRoutes.post('/pedido-mensal-consolidado', verificarToken, permitirRoles(['ADMIN', 'SUPERVISORA']), motorComprasController.exportarExcelConsolidado);
export { motorRoutes };
