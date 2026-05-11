import { prisma } from '../lib/prisma.js';
export class PrevisaoComprasService {
    static async calcularNecessidades(escolaId, dataInicio, dataFim) {
        // Busca a escola e as metas
        const escola = await prisma.escola.findUnique({
            where: { id: escolaId },
            include: {
                metasPreparo: true
            }
        });
        if (!escola) {
            throw new Error('ESCOLA_NAO_ENCONTRADA');
        }
        // Busca o estoque atual da escola
        const estoqueResult = await prisma.estoque.findMany({
            where: { escolaId },
            include: { item: true }
        });
        const mapEstoque = new Map();
        for (const est of estoqueResult) {
            mapEstoque.set(est.itemId, { saldo: est.quantidade, nome: est.item.name });
        }
        // Busca cardápios no período indicado
        const startOfDay = new Date(dataInicio.setUTCHours(0, 0, 0, 0));
        const endOfDay = new Date(dataFim.setUTCHours(23, 59, 59, 999));
        const cardapios = await prisma.cardapio.findMany({
            where: {
                data_agendada: {
                    gte: startOfDay,
                    lte: endOfDay,
                },
                isFeriado: false
            },
        });
        const demandaAgrupada = new Map();
        for (const cardapio of cardapios) {
            // Verifica se o cardápio permite o tipo desta escola
            if (cardapio.tipos_escola && cardapio.tipos_escola.length > 0 && !cardapio.tipos_escola.includes(escola.type)) {
                continue;
            }
            if (!cardapio.fichaTecnicaId)
                continue;
            // Busca o preparo específico desta escola para esta ficha
            const preparoEscola = await prisma.preparoEscola.findUnique({
                where: {
                    escolaId_fichaTecnicaId: {
                        escolaId,
                        fichaTecnicaId: cardapio.fichaTecnicaId,
                    },
                },
                include: {
                    ingredientes: {
                        include: { item: true },
                    },
                },
            });
            if (!preparoEscola || preparoEscola.ingredientes.length === 0)
                continue;
            // Descobre a meta da escola para a ficha do cardápio
            const meta = escola.metasPreparo.find(m => m.fichaId === cardapio.fichaTecnicaId);
            if (!meta)
                continue;
            for (const ingrediente of preparoEscola.ingredientes) {
                const { item } = ingrediente;
                const consumoTeorico = (meta.quantidadePadrao * ingrediente.quantidade) / item.packagingSize;
                const pacotesNecessarios = Math.ceil(consumoTeorico);
                if (pacotesNecessarios > 0) {
                    const existente = demandaAgrupada.get(item.id);
                    if (existente) {
                        existente.totalDemanda += pacotesNecessarios;
                    }
                    else {
                        demandaAgrupada.set(item.id, {
                            itemId: item.id,
                            itemNome: item.name,
                            totalDemanda: pacotesNecessarios
                        });
                    }
                }
            }
        }
        const resultado = [];
        // Fazer a matemática Demanda vs Estoque focado apenas no que tem demanda no período
        for (const [itemId, info] of demandaAgrupada.entries()) {
            const saldoObj = mapEstoque.get(itemId);
            const saldoAtual = saldoObj?.saldo || 0;
            const demandaFutura = info.totalDemanda;
            const diferenca = demandaFutura - saldoAtual;
            const quantidadeComprar = diferenca > 0 ? diferenca : 0;
            resultado.push({
                itemId,
                itemNome: info.itemNome || saldoObj?.nome || 'Desconhecido',
                saldoAtual,
                demandaFutura,
                quantidadeComprar // se for == 0 então => Estoque Suficiente
            });
        }
        return resultado;
    }
}
