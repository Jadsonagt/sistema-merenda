import { prisma } from '../lib/prisma.js';
import { MovimentacaoType } from '@prisma/client';
export class ConsumoService {
    static async executarProcessamentoDiario(dataBase) {
        const startOfDay = new Date(dataBase);
        startOfDay.setHours(0, 0, 0, 0); // Força a meia-noite no fuso horário local do servidor
        const endOfDay = new Date(dataBase);
        endOfDay.setHours(23, 59, 59, 999); // Força o fim do dia no fuso horário local
        const result = await prisma.$transaction(async (tx) => {
            const cardapios = await tx.cardapio.findMany({
                where: {
                    data_agendada: {
                        gte: startOfDay,
                        lte: endOfDay,
                    },
                },
            });
            if (cardapios.length === 0) {
                throw new Error('Nenhum cardápio agendado para esta data');
            }
            const logBaixaGeral = [];
            const escolasProcessadasConsumoFixo = new Set();
            for (const cardapio of cardapios) {
                if (cardapio.isFeriado) {
                    continue;
                }
                // Segurança para o Prisma: caso isFeriado seja falso na gravação mas sem ficha, salta
                if (!cardapio.fichaTecnicaId)
                    continue;
                const ficha = await tx.fichaTecnica.findUnique({
                    where: { id: cardapio.fichaTecnicaId },
                });
                if (!ficha)
                    continue;
                const metas = await tx.metaPreparo.findMany({
                    where: { fichaId: ficha.id },
                    include: { escola: true }
                });
                for (const meta of metas) {
                    const escola = meta.escola;
                    // --- PARTE 2: CONSUMO FIXO ---
                    if (!escolasProcessadasConsumoFixo.has(escola.id)) {
                        escolasProcessadasConsumoFixo.add(escola.id);
                        const consumosFixos = await tx.consumoFixo.findMany({
                            where: { escolaId: escola.id },
                            include: { item: true },
                        });
                        for (const fixo of consumosFixos) {
                            if (fixo.quantidadeDiaria > 0) {
                                const existingEstoque = await tx.estoque.findUnique({
                                    where: {
                                        escolaId_itemId: {
                                            escolaId: escola.id,
                                            itemId: fixo.itemId,
                                        },
                                    },
                                });
                                const currentQuantity = existingEstoque ? existingEstoque.quantidade : 0;
                                const novoSaldo = currentQuantity - fixo.quantidadeDiaria;
                                if (novoSaldo < 0) {
                                    throw new Error(JSON.stringify({
                                        code: 'ESTOQUE_NEGATIVO',
                                        message: 'Estoque insuficiente para abate de consumo fixo.',
                                        escolaId: escola.id,
                                        escolaNome: escola.name,
                                        itemId: fixo.itemId,
                                        itemNome: fixo.item.name,
                                        quantidadeFaltante: Math.abs(novoSaldo)
                                    }));
                                }
                                if (existingEstoque) {
                                    await tx.estoque.update({
                                        where: { id: existingEstoque.id },
                                        data: { quantidade: novoSaldo },
                                    });
                                }
                                else {
                                    await tx.estoque.create({
                                        data: {
                                            escolaId: escola.id,
                                            itemId: fixo.itemId,
                                            quantidade: novoSaldo,
                                        },
                                    });
                                }
                                await tx.movimentacao.create({
                                    data: {
                                        escolaId: escola.id,
                                        itemId: fixo.itemId,
                                        type: MovimentacaoType.CONSUMPTION, // CORRIGIDO! Sem numeroGuia alucinado.
                                        quantity: Math.floor(fixo.quantidadeDiaria),
                                    },
                                });
                                logBaixaGeral.push({
                                    tipo: "Consumo Fixo",
                                    escolaId: escola.id,
                                    itemId: fixo.itemId,
                                    pacotesFisicosAbatidos: fixo.quantidadeDiaria,
                                    saldoFinal: novoSaldo
                                });
                            }
                        }
                    }
                    // Regra de Cruzamento do Tipo de Escola (Abaixo do Consumo Fixo para não impedir que ele rode)
                    if (cardapio.tipos_escola && cardapio.tipos_escola.length > 0 && !cardapio.tipos_escola.includes(escola.type)) {
                        continue;
                    }
                    // --- PARTE 1: CARDÁPIO (usa PreparoEscola da escola) ---
                    const preparoEscola = await tx.preparoEscola.findUnique({
                        where: {
                            escolaId_fichaTecnicaId: {
                                escolaId: escola.id,
                                fichaTecnicaId: ficha.id,
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
                    for (const ingrediente of preparoEscola.ingredientes) {
                        const { item } = ingrediente;
                        const consumoTeorico = (meta.quantidadePadrao * ingrediente.quantidade) / item.packagingSize;
                        const pacoteInteiroConsumido = Math.ceil(consumoTeorico);
                        if (pacoteInteiroConsumido > 0) {
                            const existingEstoque = await tx.estoque.findUnique({
                                where: {
                                    escolaId_itemId: {
                                        escolaId: escola.id,
                                        itemId: item.id,
                                    },
                                },
                            });
                            const currentQuantity = existingEstoque ? existingEstoque.quantidade : 0;
                            const newQuantity = currentQuantity - pacoteInteiroConsumido;
                            if (newQuantity < 0) {
                                throw new Error(JSON.stringify({
                                    code: 'ESTOQUE_NEGATIVO',
                                    message: 'Estoque insuficiente para abate de cardápio.',
                                    escolaId: escola.id,
                                    escolaNome: escola.name,
                                    itemId: item.id,
                                    itemNome: item.name,
                                    quantidadeFaltante: Math.abs(newQuantity)
                                }));
                            }
                            if (existingEstoque) {
                                await tx.estoque.update({
                                    where: { id: existingEstoque.id },
                                    data: { quantidade: newQuantity },
                                });
                            }
                            else {
                                await tx.estoque.create({
                                    data: {
                                        escolaId: escola.id,
                                        itemId: item.id,
                                        quantidade: newQuantity,
                                    },
                                });
                            }
                            await tx.movimentacao.create({
                                data: {
                                    escolaId: escola.id,
                                    itemId: item.id,
                                    type: MovimentacaoType.CONSUMPTION,
                                    quantity: pacoteInteiroConsumido,
                                },
                            });
                            logBaixaGeral.push({
                                tipo: 'Cardápio',
                                cardapioId: cardapio.id,
                                escolaId: escola.id,
                                itemId: item.id,
                                pacotesFisicosAbatidos: pacoteInteiroConsumido,
                                saldoFinal: newQuantity,
                            });
                        }
                    }
                }
            }
            return logBaixaGeral;
        });
        return result;
    }
}
