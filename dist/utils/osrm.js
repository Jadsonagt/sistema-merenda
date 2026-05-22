import axios from 'axios';
export async function calcularDistanciaOSRM(origem, destino) {
    try {
        // OSRM exige a ordem: longitude,latitude
        const url = `http://router.project-osrm.org/route/v1/driving/${origem.lng},${origem.lat};${destino.lng},${destino.lat}?overview=false`;
        console.log('[OSRM] Chamando API:', url);
        const response = await axios.get(url);
        if (response.data && response.data.routes && response.data.routes.length > 0) {
            const distanciaMetros = response.data.routes[0].distance;
            const distanciaExataKm = distanciaMetros / 1000;
            console.log(`[OSRM] Distância exata calculada: ${distanciaMetros}m (${distanciaExataKm}km)`);
            // Remove arredondamento automático para permitir decimais na edição manual
            const distanciaKm = Number(distanciaExataKm.toFixed(1));
            return distanciaKm;
        }
        return 0;
    }
    catch (error) {
        console.error('[OSRM] Erro ao buscar rota na API pública:', error);
        return 0; // Em caso de falha da API, retorna 0 para não quebrar o salvamento do Diário
    }
}
