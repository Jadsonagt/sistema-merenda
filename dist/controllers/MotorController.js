import { prisma } from '../lib/prisma.js';
import { startOfDay, endOfDay, parseISO } from 'date-fns';
export class MotorController {
    /**
     * Executa a baixa automática de estoque para um dia específico
     */
    async processarDia(req, res) {
        try {
            const { data } = req.body;
            // Normaliza a data para o início do dia para evitar duplicidade por horário
            const targetDate = data ? parseISO(data) : new Date();
            const dayStart = startOfDay(targetDate);
            const dayEnd = endOfDay(targetDate);
            // 1. Verificar se já foi processado
            const logExistente = await prisma.processamentoLog.findUnique({
                where: { dataProcessamento: dayStart }
            });
            if (logExistente) {
                return res.status(400).json({
                    error: 'Este dia letivo já foi processado. O estoque não pode ser abatido duas vezes para a mesma data.'
                });
            }
            // 2. Iniciar transação atômica
            const result = await prisma.$transaction(async (tx) => {
                // A. Buscar Cardápios ativos do dia
                const cardapios = await tx.cardapio.findMany({
                    where: {
                        data_agendada: {
                            gte: dayStart,
                            lte: dayEnd
                        },
                        isFeriado: false
                    }
                });
                if (cardapios.length === 0) {
                    throw new Error('Nenhum cardápio agendado encontrado para esta data.');
                }
                let escolasAfetadas = 0;
                let totalDeducoes = 0;
                // B. Processar cada escola
                const escolas = await tx.escola.findMany();
                for (const escola of escolas) {
                    const consolidadoGasto = {};
                    let escolaTeveConsumo = false;
                    // C. Calcular Consumo por Cardápio
                    for (const cardapio of cardapios) {
                        if (cardapio.tipos_escola.includes(escola.type)) {
                            // Buscar preparo específico desta escola para esta ficha
                            const preparo = await tx.preparoEscola.findUnique({
                                where: {
                                    escolaId_fichaTecnicaId: {
                                        escolaId: escola.id,
                                        fichaTecnicaId: cardapio.fichaTecnicaId
                                    }
                                },
                                include: { ingredientes: true }
                            });
                            if (preparo) {
                                escolaTeveConsumo = true;
                                preparo.ingredientes.forEach(ing => {
                                    consolidadoGasto[ing.itemId] = (consolidadoGasto[ing.itemId] || 0) + ing.quantidade;
                                });
                            }
                        }
                    }
                    // D. Adicionar Consumo Fixo (Sempre ocorre em dias letivos)
                    const consumosFixos = await tx.consumoFixo.findMany({
                        where: { escolaId: escola.id }
                    });
                    if (consumosFixos.length > 0) {
                        escolaTeveConsumo = true;
                        consumosFixos.forEach(cf => {
                            consolidadoGasto[cf.itemId] = (consolidadoGasto[cf.itemId] || 0) + cf.quantidadeDiaria;
                        });
                    }
                    // E. Aplicar as baixas no estoque se houver consumo
                    if (escolaTeveConsumo) {
                        escolasAfetadas++;
                        for (const [itemId, qtd] of Object.entries(consolidadoGasto)) {
                            totalDeducoes++;
                            await tx.estoque.upsert({
                                where: {
                                    escolaId_itemId: {
                                        escolaId: escola.id,
                                        itemId
                                    }
                                },
                                update: {
                                    quantidade: { decrement: qtd }
                                },
                                create: {
                                    escolaId: escola.id,
                                    itemId,
                                    quantidade: -qtd // Permite estoque negativo para evidenciar furos
                                }
                            });
                        }
                    }
                }
                // F. Registrar Log de Execução
                return await tx.processamentoLog.create({
                    data: {
                        dataProcessamento: dayStart,
                        status: 'SUCESSO',
                        resumo: `Processamento concluído. ${escolasAfetadas} escolas tiveram estoque abatido. Total de ${totalDeducoes} movimentações de saída.`
                    }
                });
            });
            return res.status(201).json(result);
        }
        catch (error) {
            console.error('Erro no processamento do motor:', error);
            const status = error.message.includes('agendado') ? 400 : 500;
            return res.status(status).json({ error: error.message });
        }
    }
    /**
     * Lista os logs de execuções anteriores
     */
    async listarLogs(req, res) {
        try {
            const logs = await prisma.processamentoLog.findMany({
                orderBy: { executadoEm: 'desc' },
                take: 30
            });
            return res.status(200).json(logs);
        }
        catch (error) {
            return res.status(500).json({ error: 'Erro ao buscar logs de processamento.' });
        }
    }
}
