/**
 * Calcula a distância entre dois pontos geográficos usando a fórmula de Haversine.
 * Útil como fallback quando não há uma rota mapeada por ruas.
 */
export function calcularDistanciaHaversine(lat1, lon1, lat2, lon2) {
    const R = 6371; // Raio da Terra em km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    // Adiciona 20% de margem (1.2) para compensar o traçado das ruas, 
    // já que Haversine é linha reta ("as the crow flies").
    const distancia = (R * c) * 1.2;
    return Number(distancia.toFixed(1));
}
