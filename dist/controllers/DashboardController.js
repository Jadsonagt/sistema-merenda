import { prisma } from '../lib/prisma.js';
import { formatLogisticValue } from '../utils/unitFormatter.js';
export class DashboardController {
    /**
     * @swagger
     * /api/dashboard/resumo:
     *   get:
     *     summary: Retorna o resumo gerencial para o Dashboard
     *     tags: [Dashboard]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: query
     *         name: escolaId
     *         schema:
     *           type: string
     *         description: ID da escola para filtrar os dados (opcional)
     *       - in: query
     *         name: rotaId
     *         schema:
     *           type: string
     *         description: ID da rota para filtrar os dados (opcional)
     *     responses:
     *       200:
     *         description: Resumo retornado com sucesso
     *       500:
     *         description: Erro interno no servidor
     */
    async resumo(req, res) {
        try {
            const { escolaId, rotaId } = req.query;
            // Filtro dinâmico
            const whereFilter = {};
            if (escolaId) {
                whereFilter.escolaId = String(escolaId);
            }
            else if (rotaId) {
                whereFilter.escola = { rotaId: String(rotaId) };
            }
            const [totalEscolas, totalReceitas, alertasEstoque, historicoMotor, alertasRemanejamento, escolasLista] = await Promise.all([
                prisma.escola.count({
                    where: rotaId ? { rotaId: String(rotaId) } : {}
                }),
                prisma.fichaTecnica.count(),
                prisma.estoque.findMany({
                    where: {
                        quantidade: { lt: 0 },
                        ...whereFilter
                    },
                    include: {
                        escola: true,
                        item: true
                    }
                }),
                prisma.processamentoLog.findMany({
                    orderBy: { dataProcessamento: 'desc' },
                    take: 5
                }),
                prisma.alertaRemanejamento.findMany({
                    where: {
                        status: 'PENDENTE',
                        ...whereFilter
                    },
                    include: { escola: true, item: true }
                }),
                prisma.escola.findMany({
                    where: {
                        ...(escolaId ? { id: String(escolaId) } : {}),
                        ...(rotaId && !escolaId ? { rotaId: String(rotaId) } : {})
                    },
                    select: { id: true, name: true, type: true }
                })
            ]);
            return res.status(200).json({
                totalEscolas: (escolaId) ? 1 : totalEscolas,
                totalReceitas,
                alertasEstoque,
                historicoMotor,
                alertasRemanejamento,
                escolasLista
            });
        }
        catch (error) {
            console.error('Erro ao buscar resumo do dashboard:', error);
            return res.status(500).json({ error: 'Erro interno ao buscar indicadores.' });
        }
    }
    async getTopDivergencias(req, res) {
        try {
            const { escolaId, rotaId } = req.query;
            const whereFilter = {};
            if (escolaId) {
                whereFilter.escolaId = String(escolaId);
            }
            else if (rotaId) {
                whereFilter.escola = { rotaId: String(rotaId) };
            }
            const registros = await prisma.inventarioHistorico.findMany({
                where: {
                    ...whereFilter,
                    quantidadeFisica: {
                        lt: prisma.inventarioHistorico.fields.estoqueTeoricoNoMomento
                    }
                },
                include: {
                    escola: { select: { id: true, name: true } },
                    item: { select: { name: true, baseUnit: true, packagingSize: true } }
                },
                orderBy: [
                    { dataContagem: 'desc' }
                ],
                take: 50
            });
            const registrosUnicos = new Map();
            for (const r of registros) {
                const chave = `${r.escolaId}-${r.itemId}`;
                if (!registrosUnicos.has(chave)) {
                    registrosUnicos.set(chave, r);
                }
            }
            const registrosFiltrados = Array.from(registrosUnicos.values());
            const divergencias = registrosFiltrados
                .map(r => {
                const divergenciaCalc = r.quantidadeFisica - r.estoqueTeoricoNoMomento;
                return {
                    id: r.id,
                    escolaId: r.escolaId,
                    escolaNome: r.escola.name,
                    produto: `Falta de ${r.item.name}`,
                    divergencia: divergenciaCalc,
                    valor: formatLogisticValue(divergenciaCalc, r.item.baseUnit, r.item.packagingSize)
                };
            })
                .filter(r => r.divergencia < 0)
                .sort((a, b) => a.divergencia - b.divergencia)
                .slice(0, 10);
            return res.status(200).json(divergencias);
        }
        catch (error) {
            console.error('Erro ao buscar divergencias:', error);
            return res.status(500).json({ error: 'Erro interno ao buscar divergências de estoque.' });
        }
    }
    async getVencimentosCriticos(req, res) {
        try {
            const { escolaId, rotaId } = req.query;
            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0);
            const limite = new Date(hoje);
            limite.setDate(limite.getDate() + 30);
            const whereFilter = {};
            if (escolaId) {
                whereFilter.escolaId = String(escolaId);
            }
            else if (rotaId) {
                whereFilter.escola = { rotaId: String(rotaId) };
            }
            const alertas = await prisma.alertaRemanejamento.findMany({
                where: {
                    ...whereFilter,
                    status: 'PENDENTE',
                    dataVencimento: {
                        gte: hoje,
                        lte: limite
                    }
                },
                include: {
                    escola: { select: { id: true, name: true } },
                    item: { select: { name: true, baseUnit: true } }
                },
                orderBy: { dataVencimento: 'asc' },
                take: 10
            });
            const resultado = alertas.map(a => {
                const dias = Math.ceil((new Date(a.dataVencimento).getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
                return {
                    id: a.id,
                    escolaId: a.escolaId,
                    escolaNome: a.escola.name,
                    produto: a.item.name,
                    diasParaVencer: dias,
                    valor: `Vence em ${dias} dias`
                };
            });
            return res.status(200).json(resultado);
        }
        catch (error) {
            console.error('Erro ao buscar vencimentos críticos:', error);
            return res.status(500).json({ error: 'Erro interno ao buscar vencimentos.' });
        }
    }
}
