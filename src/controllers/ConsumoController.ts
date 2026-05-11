import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { MovimentacaoType } from '@prisma/client';
import { ConsumoService } from '../services/ConsumoService.js';

export class ConsumoController {
  async registerDailyConsumption(req: Request, res: Response) {
    try {
      const { escola_id, meta_preparo_id } = req.body;

      if (!escola_id || !meta_preparo_id) {
        return res.status(400).json({ error: 'Missing required fields: escola_id, meta_preparo_id' });
      }

      const result = await prisma.$transaction(async (tx) => {
        const meta = await tx.metaPreparo.findUnique({
          where: { id: meta_preparo_id },
        });

        if (!meta) {
          throw new Error('Meta de Preparo não encontrada');
        }

        if (meta.escolaId !== escola_id) {
          throw new Error('Meta de Preparo não pertence à escola informada');
        }

        // Busca o preparo específico desta escola para a ficha da meta
        const preparoEscola = await tx.preparoEscola.findUnique({
          where: {
            escolaId_fichaTecnicaId: {
              escolaId: escola_id,
              fichaTecnicaId: meta.fichaId,
            },
          },
          include: {
            ingredientes: {
              include: { item: true },
            },
          },
        });

        if (!preparoEscola || preparoEscola.ingredientes.length === 0) {
          throw new Error('Preparo não encontrado ou sem ingredientes para esta escola/ficha.');
        }

        const baixasRealizadas = [];

        for (const ingrediente of preparoEscola.ingredientes) {
          const { item } = ingrediente;

          const calculoConsumoRaw = (ingrediente.quantidade * meta.quantidadePadrao) / item.packagingSize;
          const pacoteInteiroConsumido = Math.ceil(calculoConsumoRaw);

          if (pacoteInteiroConsumido > 0) {
            const existingEstoque = await tx.estoque.findUnique({
              where: {
                escolaId_itemId: {
                  escolaId: escola_id,
                  itemId: item.id,
                },
              },
            });

            const currentQuantity = existingEstoque ? existingEstoque.quantidade : 0;
            const newQuantity = currentQuantity - pacoteInteiroConsumido;

            if (existingEstoque) {
              await tx.estoque.update({
                where: { id: existingEstoque.id },
                data: { quantidade: newQuantity },
              });
            } else {
              await tx.estoque.create({
                data: {
                  escolaId: escola_id,
                  itemId: item.id,
                  quantidade: newQuantity,
                },
              });
            }

            await tx.movimentacao.create({
              data: {
                escolaId: escola_id,
                itemId: item.id,
                type: MovimentacaoType.CONSUMPTION,
                quantity: pacoteInteiroConsumido,
              },
            });

            baixasRealizadas.push({
              itemId: item.id,
              consumoBaseTeorico: calculoConsumoRaw,
              pacotesFisicosAbatidos: pacoteInteiroConsumido,
              saldoEmEstoque: newQuantity
            });
          }
        }

        return {
          message: 'Baixa de consumo processada com sucesso. Estoque atualizado.',
          baixas: baixasRealizadas
        };
      });

      return res.status(201).json(result);
    } catch (error: any) {
      console.error('Error processing consumption:', error);
      if (error.message === 'Meta de Preparo não encontrada' || error.message === 'Meta de Preparo não pertence à escola informada') {
        return res.status(404).json({ error: error.message });
      }
      return res.status(500).json({ error: 'Internal server error while processing consumption' });
    }
  }

  async processarLoteDiario(req: Request, res: Response) {
    try {
      const { data_consumo } = req.body;

      if (!data_consumo) {
        return res.status(400).json({ error: 'Missing required field: data_consumo' });
      }

      const queryDate = new Date(data_consumo);
      if (isNaN(queryDate.getTime())) {
        return res.status(400).json({ error: 'Invalid data_consumo format. Use YYYY-MM-DD.' });
      }

      const startOfDay = new Date(queryDate.setUTCHours(0, 0, 0, 0));
      const endOfDay = new Date(queryDate.setUTCHours(23, 59, 59, 999));

      const result = await ConsumoService.executarProcessamentoDiario(queryDate);

      // MARCA D'ÁGUA PARA VALIDAR NO POSTMAN
      return res.status(200).json({ message: 'Lote diário processado com sucesso (COM CONSUMO FIXO)', baixas_lote: result });
    } catch (error: any) {
      console.error('Error processing daily batch:', error);

      try {
        const parsedError = JSON.parse(error.message);
        if (parsedError.code === 'ESTOQUE_NEGATIVO') {
          return res.status(400).json({ error: parsedError });
        }
      } catch (e) {
        // Not a JSON error message, ignore and continue
      }

      if (error.message === 'Nenhum cardápio agendado para esta data') {
        return res.status(400).json({ error: error.message });
      }
      return res.status(500).json({ error: 'Internal server error while processing daily batch' });
    }
  }
  public listar = async (req: Request, res: Response) => {
    try {
      const consumos = await prisma.consumoFixo.findMany({
        include: { escola: true, item: true }
      });
      return res.status(200).json(consumos);
    } catch (error) {
      return res.status(500).json({ error: "Erro ao listar consumos" });
    }
  }

  public atualizar = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { quantidade } = req.body;

      if (quantidade === undefined) {
        return res.status(400).json({ error: "Campo quantidade é obrigatório" });
      }

      const consumoAtualizado = await prisma.consumoFixo.update({
        where: { id: String(id) },
        data: { quantidadeDiaria: Math.floor(Number(quantidade)) }
      });

      return res.status(200).json(consumoAtualizado);
    } catch (error) {
      console.error('Erro ao atualizar consumo fixo:', error);
      return res.status(500).json({ error: "Erro ao atualizar consumo" });
    }
  }
}