import cron from 'node-cron';
import { ConsumoService } from '../services/ConsumoService.js';
// Executa todos os dias às 23:55
cron.schedule('55 23 * * *', async () => {
    try {
        const execDate = new Date();
        await ConsumoService.executarProcessamentoDiario(execDate);
        console.log('[CRON] Processamento de lote diário executado com sucesso.');
    }
    catch (error) {
        console.error('[CRON] Erro ao executar o processamento em lote diário:', error.message || error);
    }
}, {
    timezone: "America/Sao_Paulo"
});
console.log('Cron Job de Consumo Diário agendado para rodar às 23:55.');
