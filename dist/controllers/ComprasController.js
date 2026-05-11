import { PrevisaoComprasService } from '../services/PrevisaoComprasService.js';
export class ComprasController {
    async getPrevisao(req, res) {
        try {
            const { escolaId } = req.params;
            const { dataInicio, dataFim } = req.query;
            if (!escolaId) {
                return res.status(400).json({ error: 'Missing required field: escolaId' });
            }
            if (!dataInicio || !dataFim) {
                return res.status(400).json({ error: 'Missing required query params: dataInicio, dataFim' });
            }
            const queryDataInicio = new Date(String(dataInicio));
            const queryDataFim = new Date(String(dataFim));
            if (isNaN(queryDataInicio.getTime()) || isNaN(queryDataFim.getTime())) {
                return res.status(400).json({ error: 'Formato de data inválido. Use YYYY-MM-DD.' });
            }
            if (queryDataInicio > queryDataFim) {
                return res.status(400).json({ error: 'A dataInicio não pode ser posterior à dataFim.' });
            }
            const previsao = await PrevisaoComprasService.calcularNecessidades(String(escolaId), queryDataInicio, queryDataFim);
            return res.status(200).json(previsao);
        }
        catch (error) {
            console.error('Erro ao calcular previsão de compras:', error);
            if (error.message === 'ESCOLA_NAO_ENCONTRADA') {
                return res.status(404).json({ error: 'Escola não encontrada.' });
            }
            return res.status(500).json({ error: 'Erro interno ao processar a previsão de compras.' });
        }
    }
}
