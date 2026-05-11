import { prisma } from '../lib/prisma.js';
export class RelatorioController {
    async listarBaixasEDivergencias(req, res) {
        try {
            const { escolaId, dataInicio, dataFim } = req.query;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const whereClause = {
                type: {
                    in: ['SAIDA_DESCARTE', 'ADJUSTMENT']
                }
            };
            if (escolaId && typeof escolaId === 'string' && escolaId !== 'TODAS') {
                whereClause.escolaId = escolaId;
            }
            if (dataInicio && dataFim && typeof dataInicio === 'string' && typeof dataFim === 'string') {
                const start = new Date(dataInicio);
                const end = new Date(dataFim);
                if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
                    whereClause.createdAt = {
                        gte: new Date(start.setUTCHours(0, 0, 0, 0)),
                        lte: new Date(end.setUTCHours(23, 59, 59, 999))
                    };
                }
            }
            const movimentacoes = await prisma.movimentacao.findMany({
                where: whereClause,
                include: {
                    escola: true,
                    item: true,
                },
                orderBy: {
                    createdAt: 'desc',
                },
            });
            const resultadosFormatados = movimentacoes.map(mov => ({
                id: mov.id,
                data: mov.createdAt,
                escola: mov.escola.name,
                item: mov.item.name,
                unidade: mov.item.baseUnit || 'UN',
                quantidade: mov.quantity,
                tipo: mov.type,
                motivo: mov.motivo,
                observacao: mov.observacao,
            }));
            return res.status(200).json(resultadosFormatados);
        }
        catch (error) {
            console.error('Erro ao buscar baixas e divergências:', error);
            return res.status(500).json({ error: 'Erro interno ao buscar o relatório de baixas.' });
        }
    }
}
