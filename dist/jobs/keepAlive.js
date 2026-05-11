import cron from 'node-cron';
import axios from 'axios';
/**
 * Este job tenta manter o servidor do Render acordado.
 * O Render Free Tier "dorme" após 15 minutos de inatividade.
 * Vamos pingar o próprio servidor a cada 10 minutos.
 */
const SERVER_URL = process.env.RENDER_EXTERNAL_URL || 'http://localhost:3000';
cron.schedule('*/10 * * * *', async () => {
    try {
        const response = await axios.get(`${SERVER_URL}/api/health`);
        console.log(`[KEEP-ALIVE] Ping realizado com sucesso em ${SERVER_URL}/api/health. Status: ${response.status}`);
    }
    catch (error) {
        console.warn(`[KEEP-ALIVE] Falha ao realizar ping em ${SERVER_URL}: ${error.message}`);
    }
});
console.log(`Job Keep-Alive agendado para rodar a cada 10 minutos apontando para: ${SERVER_URL}`);
