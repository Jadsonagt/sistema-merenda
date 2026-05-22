import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';

export class AuditoriaController {
  async gerarListaCompras(req: Request, res: Response) {
    try {
      const { dataInicio, dataFim } = req.query;

      if (!dataInicio || !dataFim || typeof dataInicio !== 'string' || typeof dataFim !== 'string') {
        return res.status(400).json({ error: 'Query params dataInicio and dataFim are required in YYYY-MM-DD format.' });
      }

      const start = new Date(dataInicio);
      const end = new Date(dataFim);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' });
      }

      const startOfDay = new Date(start.setUTCHours(0, 0, 0, 0));
      const endOfDay = new Date(end.setUTCHours(23, 59, 59, 999));

      if (startOfDay > endOfDay) {
        return res.status(400).json({ error: 'dataInicio must be before or equal to dataFim.' });
      }

      // Calculate working days
      const msPerDay = 1000 * 60 * 60 * 24;
      const diffTime = Math.abs(endOfDay.getTime() - startOfDay.getTime());
      const diffDays = Math.ceil(diffTime / msPerDay);

      let workingDays = 0;
      for (let i = 0; i < diffDays; i++) {
        const date = new Date(startOfDay.getTime() + i * msPerDay);
        const dayOfWeek = date.getUTCDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          workingDays++;
        }
      }

      const result = await prisma.$transaction(async (tx) => {
        // Fetch all Cardapios within period with MetaPreparo and Ingredientes
        const cardapios = await tx.cardapio.findMany({
          where: {
            data_agendada: {
              gte: startOfDay,
              lte: endOfDay,
            },
          },
          include: {
            ficha: {
              include: {
                preparos: {
                  include: {
                    ingredientes: {
                      include: { item: true },
                    },
                  },
                },
                metasPreparo: true,
              },
            },
          },
        });

        // Fetch all ConsumosFixos
        const consumosFixos = await tx.consumoFixo.findMany({
          include: { item: true },
        });

        // Group total stock across all schools
        const estoqueRaw = await tx.estoque.groupBy({
          by: ['itemId'],
          _sum: {
            quantidade: true,
          },
        });

        const estoqueAtualMap = new Map(estoqueRaw.map((e) => [e.itemId, e._sum.quantidade || 0]));

        // Calculate theoretical fractioned needs
        const necessidadesFracionadas = new Map<string, { total: number; item: any }>();

        // 1. Process Cardapios
        for (const cardapio of cardapios) {
          if (!cardapio.ficha) continue;

          for (const meta of cardapio.ficha.metasPreparo) {
            const preparoEscola = cardapio.ficha.preparos.find((p) => p.escolaId === meta.escolaId);
            if (!preparoEscola) continue;

            for (const ingrediente of preparoEscola.ingredientes) {
              const itemId = ingrediente.itemId;
              const item = ingrediente.item;
              const fraction = meta.quantidadePadrao * ingrediente.quantidade;

              if (!necessidadesFracionadas.has(itemId)) {
                necessidadesFracionadas.set(itemId, { total: 0, item });
              }
              necessidadesFracionadas.get(itemId)!.total += fraction;
            }
          }
        }

        // 2. Process Consumo Fixo (Assuming ConsumoFixo.quantidade is in packages, we convert it to fractions for consistency)
        if (workingDays > 0) {
          const diasLetivos = workingDays;
          for (const fixo of consumosFixos) {
            const itemId = fixo.itemId;
            const item = fixo.item;
            
            let quantidadeTotal = 0;
            if (fixo.frequencia === 'SEMANAL') {
              const semanas = Math.ceil(diasLetivos / 5);
              quantidadeTotal = fixo.quantidadeDiaria * semanas;
            } else {
              quantidadeTotal = fixo.quantidadeDiaria * diasLetivos;
            }

            const fraction = quantidadeTotal * item.packagingSize;

            if (!necessidadesFracionadas.has(itemId)) {
              necessidadesFracionadas.set(itemId, { total: 0, item });
            }
            necessidadesFracionadas.get(itemId)!.total += fraction;
          }
        }

        const listaCompras = [];

        for (const [itemId, data] of necessidadesFracionadas.entries()) {
          const item = data.item;

          // Rule: Full Packages
          const necessidadePacotes = Math.ceil(data.total / item.packagingSize);
          const estoqueAtualPacotes = estoqueAtualMap.get(itemId) || 0;

          // Amount to buy (cannot be negative)
          const quantidadeComprar = Math.max(0, necessidadePacotes - estoqueAtualPacotes);

          listaCompras.push({
            itemId: item.id,
            itemName: item.name,
            totalFracionadoNecessario: parseFloat(data.total.toFixed(4)),
            necessidadePacotes,
            estoqueAtualPacotes,
            quantidadeComprar,
          });
        }

        return listaCompras;
      });

      return res.status(200).json(result);
    } catch (error) {
      console.error('Error generating shopping list:', error);
      return res.status(500).json({ error: 'Internal server error while generating shopping list' });
    }
  }

  async relatorioDivergencias(req: Request, res: Response) {
    try {
      const { dataInicio, dataFim, escolaId } = req.query;

      if (!dataInicio || !dataFim || typeof dataInicio !== 'string' || typeof dataFim !== 'string') {
        return res.status(400).json({ error: 'Query params dataInicio and dataFim are required in YYYY-MM-DD format.' });
      }

      const start = new Date(dataInicio);
      const end = new Date(dataFim);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' });
      }

      const startOfDay = new Date(start.setUTCHours(0, 0, 0, 0));
      const endOfDay = new Date(end.setUTCHours(23, 59, 59, 999));

      const queryWhere: any = {
        type: 'ADJUSTMENT', // Apenas inventários físicos
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      };

      if (escolaId && typeof escolaId === 'string') {
        queryWhere.escolaId = escolaId;
      }

      const divergencias = await prisma.movimentacao.findMany({
        where: queryWhere,
        include: {
          escola: true,
          item: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      const agrupamentoPorItem: Record<string, { itemId: string; itemName: string; positivos: number; negativos: number; liquido: number }> = {};
      const agrupamentoPorEscola: Record<string, { escolaId: string; escolaName: string; positivos: number; negativos: number; liquido: number }> = {};

      for (const mov of divergencias) {
        // Agrupamento Item
        if (!agrupamentoPorItem[mov.itemId]) {
          agrupamentoPorItem[mov.itemId] = {
            itemId: mov.itemId,
            itemName: mov.item.name,
            positivos: 0,
            negativos: 0,
            liquido: 0,
          };
        }

        // Agrupamento Escola
        if (!agrupamentoPorEscola[mov.escolaId]) {
          agrupamentoPorEscola[mov.escolaId] = {
            escolaId: mov.escolaId,
            escolaName: mov.escola.name,
            positivos: 0,
            negativos: 0,
            liquido: 0,
          };
        }

        const delta = mov.quantity;

        if (delta > 0) {
          agrupamentoPorItem[mov.itemId].positivos += delta;
          agrupamentoPorEscola[mov.escolaId].positivos += delta;
        } else if (delta < 0) {
          agrupamentoPorItem[mov.itemId].negativos += delta; // Salva o valor original negativo
          agrupamentoPorEscola[mov.escolaId].negativos += delta;
        }

        agrupamentoPorItem[mov.itemId].liquido += delta;
        agrupamentoPorEscola[mov.escolaId].liquido += delta;
      }

      return res.status(200).json({
        periodo: {
          inicio: startOfDay,
          fim: endOfDay,
        },
        totalRegistros: divergencias.length,
        agrupamentos: {
          porItem: Object.values(agrupamentoPorItem),
          porEscola: Object.values(agrupamentoPorEscola),
        },
        registrosDetalhados: divergencias.map(d => ({
          id: d.id,
          data: d.createdAt,
          escola: d.escola.name,
          item: d.item.name,
          quantidadeDivergente: d.quantity,
        })),
      });

    } catch (error) {
      console.error('Error generating divergence report:', error);
      return res.status(500).json({ error: 'Internal server error while generating divergence report' });
    }
  }
}
