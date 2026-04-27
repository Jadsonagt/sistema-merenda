import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { MovimentacaoType } from '@prisma/client';

export class EstoqueController {
  async getByEscola(req: Request, res: Response) {
    try {
      const escolaId = req.params.escolaId as string;

      const estoques = await prisma.estoqueAtual.findMany({
        where: { escolaId },
        include: { item: true },
      });

      return res.status(200).json(estoques);
    } catch (error) {
      console.error('Error fetching estoque by escola:', error);
      return res.status(500).json({ error: 'Internal server error while fetching estoque' });
    }
  }

  async registerInventory(req: Request, res: Response) {
    try {
      const escolaId = req.params.escolaId as string;
      const { itemId, quantity_integer } = req.body;

      if (!itemId || quantity_integer === undefined) {
        return res.status(400).json({ error: 'Missing required fields: itemId, quantity_integer' });
      }

      const qtyFisico = Number(quantity_integer);

      if (!Number.isInteger(qtyFisico) || qtyFisico < 0) {
        return res.status(400).json({ error: 'quantity_integer must be a positive integer.' });
      }

      const result = await prisma.$transaction(async (tx) => {
        const escolaExists = await tx.escola.findUnique({ where: { id: escolaId } });
        if (!escolaExists) {
          throw new Error('Escola not found');
        }

        const itemExists = await tx.item.findUnique({ where: { id: itemId } });
        if (!itemExists) {
          throw new Error('Item not found');
        }

        const existingEstoque = await tx.estoqueAtual.findUnique({
          where: {
            escolaId_itemId: {
              escolaId,
              itemId,
            },
          },
        });

        const teoricoAnterior = existingEstoque ? existingEstoque.quantityInteger : 0;
        const diferenca = qtyFisico - teoricoAnterior;
        const alerta = diferenca === 0 ? 'Estoque íntegro' : 'Divergência detectada';

        let estoqueAtualizado;

        if (existingEstoque) {
          estoqueAtualizado = await tx.estoqueAtual.update({
            where: { id: existingEstoque.id },
            data: { quantityInteger: qtyFisico },
          });
        } else {
          estoqueAtualizado = await tx.estoqueAtual.create({
            data: {
              escolaId,
              itemId,
              quantityInteger: qtyFisico,
            },
          });
        }

        await tx.movimentacao.create({
          data: {
            escolaId,
            itemId,
            type: MovimentacaoType.ADJUSTMENT,
            quantity: diferenca,
          },
        });

        return {
          estoque: estoqueAtualizado,
          divergencia_detalhada: {
            teorico_anterior: teoricoAnterior,
            fisico_informado: qtyFisico,
            diferenca,
            alerta,
          }
        };
      });

      return res.status(201).json(result);
    } catch (error: any) {
      console.error('Error registering inventory:', error);

      if (error.message === 'Escola not found' || error.message === 'Item not found') {
        return res.status(404).json({ error: error.message });
      }

      return res.status(500).json({ error: 'Internal server error while registering inventory' });
    }
  }

  async registrarEntrada(req: Request, res: Response) {
    try {
      const { escola_id, item_id, quantidade_recebida, numero_guia } = req.body;

      if (!escola_id || !item_id || quantidade_recebida === undefined) {
        return res.status(400).json({ error: 'Missing required fields: escola_id, item_id, quantidade_recebida' });
      }

      const receivedQuantity = Number(quantidade_recebida);

      if (!Number.isInteger(receivedQuantity) || receivedQuantity <= 0) {
        return res.status(400).json({ error: 'quantidade_recebida must be an integer greater than zero.' });
      }

      const result = await prisma.$transaction(async (tx) => {
        const existingEstoque = await tx.estoqueAtual.findUnique({
          where: {
            escolaId_itemId: {
              escolaId: escola_id,
              itemId: item_id,
            },
          },
        });

        const currentQuantity = existingEstoque ? existingEstoque.quantityInteger : 0;
        const newQuantity = currentQuantity + receivedQuantity;

        let estoqueAtualizado;

        if (existingEstoque) {
          estoqueAtualizado = await tx.estoqueAtual.update({
            where: { id: existingEstoque.id },
            data: { quantityInteger: newQuantity },
          });
        } else {
          estoqueAtualizado = await tx.estoqueAtual.create({
            data: {
              escolaId: escola_id,
              itemId: item_id,
              quantityInteger: newQuantity,
            },
          });
        }

        await tx.movimentacao.create({
          data: {
            escolaId: escola_id,
            itemId: item_id,
            type: MovimentacaoType.IN, // Equivalente a "ENTRADA" no banco
            quantity: receivedQuantity,
            numeroGuia: numero_guia || null,
          },
        });

        return estoqueAtualizado;
      });

      return res.status(201).json({
        status: 'Entrada registrada com sucesso',
        estoque: result,
      });
    } catch (error) {
      console.error('Error registering inbound stock:', error);
      return res.status(500).json({ error: 'Internal server error while registering inbound stock' });
    }
  }

  async remanejar(req: Request, res: Response) {
    try {
      const { escolaOrigemId, escolaDestinoId, itemId, quantidade } = req.body;

      if (!escolaOrigemId || !escolaDestinoId || !itemId || quantidade === undefined) {
        return res.status(400).json({ error: 'Missing required fields: escolaOrigemId, escolaDestinoId, itemId, quantidade' });
      }

      const transferQuantity = Number(quantidade);

      if (!Number.isInteger(transferQuantity) || transferQuantity <= 0) {
        return res.status(400).json({ error: 'quantidade must be an integer greater than zero.' });
      }

      const result = await prisma.$transaction(async (tx) => {
        // Validação da origem
        const estoqueOrigem = await tx.estoqueAtual.findUnique({
          where: {
            escolaId_itemId: {
              escolaId: escolaOrigemId,
              itemId: itemId,
            },
          },
        });

        const saldoOrigem = estoqueOrigem ? estoqueOrigem.quantityInteger : 0;
        const novoSaldoOrigem = saldoOrigem - transferQuantity;

        if (novoSaldoOrigem < 0) {
          throw new Error(JSON.stringify({
            code: 'ESTOQUE_NEGATIVO',
            message: 'Estoque insuficiente para remanejamento.',
            escolaId: escolaOrigemId,
            itemId: itemId,
            quantidadeFaltante: Math.abs(novoSaldoOrigem)
          }));
        }

        // Se passar da trava, desconta da origem logicamente
        await tx.estoqueAtual.update({
          where: { id: estoqueOrigem!.id },
          data: { quantityInteger: novoSaldoOrigem },
        });

        // Adiciona no destino
        const estoqueDestino = await tx.estoqueAtual.findUnique({
          where: {
            escolaId_itemId: {
              escolaId: escolaDestinoId,
              itemId: itemId,
            },
          },
        });

        const saldoDestino = estoqueDestino ? estoqueDestino.quantityInteger : 0;
        const novoSaldoDestino = saldoDestino + transferQuantity;

        if (estoqueDestino) {
          await tx.estoqueAtual.update({
            where: { id: estoqueDestino.id },
            data: { quantityInteger: novoSaldoDestino },
          });
        } else {
          await tx.estoqueAtual.create({
            data: {
              escolaId: escolaDestinoId,
              itemId: itemId,
              quantityInteger: novoSaldoDestino,
            },
          });
        }

        // Registro do Histórico (Movimentação DUPLA)
        // Saída da Origem
        await tx.movimentacao.create({
          data: {
            escolaId: escolaOrigemId,
            itemId: itemId,
            type: MovimentacaoType.TRANSFER,
            quantity: transferQuantity,
          },
        });

        // Entrada no Destino
        await tx.movimentacao.create({
          data: {
            escolaId: escolaDestinoId,
            itemId: itemId,
            type: MovimentacaoType.TRANSFER,
            quantity: transferQuantity,
          },
        });

        return {
          status: 'Remanejamento realizado com sucesso',
          origem: {
            escolaId: escolaOrigemId,
            novoSaldo: novoSaldoOrigem,
          },
          destino: {
            escolaId: escolaDestinoId,
            novoSaldo: novoSaldoDestino,
          }
        };
      });

      return res.status(200).json(result);
    } catch (error: any) {
      console.error('Error in remanejamento:', error);

      try {
        const parsedError = JSON.parse(error.message);
        if (parsedError.code === 'ESTOQUE_NEGATIVO') {
          return res.status(400).json({ error: parsedError });
        }
      } catch (e) {
        // Not a JSON error message, ignore and continue
      }

      return res.status(500).json({ error: 'Internal server error while processing remanejamento' });
    }
  }
}
