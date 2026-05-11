import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { MovimentacaoType } from '@prisma/client';

export class EstoqueController {
  /**
   * @swagger
   * /api/escolas/{escolaId}/estoque:
   *   get:
   *     summary: Lista o estoque atual de uma escola
   *     tags: [Auditoria e Estoque]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: escolaId
   *         required: true
   *         schema:
   *           type: string
   *         description: ID da escola
   *     responses:
   *       200:
   *         description: Lista de estoque retornada com sucesso
   *       500:
   *         description: Erro interno no servidor
   */
  async listarEstoque(req: Request, res: Response) {
    try {
      const { escolaId } = req.params;

      const estoques = await prisma.estoque.findMany({
        where: { escolaId: String(escolaId) },
        include: {
          item: true,
        },
        orderBy: {
          item: {
            name: 'asc'
          }
        }
      });

      return res.status(200).json(estoques);
    } catch (error) {
      console.error('Erro ao listar estoque:', error);
      return res.status(500).json({ error: 'Erro interno ao buscar estoque.' });
    }
  }

  /**
   * @swagger
   * /api/escolas/{escolaId}/inventario:
   *   post:
   *     summary: Registra a contagem física (inventário) de itens
   *     tags: [Auditoria e Estoque]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: escolaId
   *         required: true
   *         schema:
   *           type: string
   *         description: ID da escola
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - itens
   *             properties:
   *               itens:
   *                 type: array
   *                 items:
   *                   type: object
   *                   required:
   *                     - itemId
   *                     - quantidadeFisica
   *                   properties:
   *                     itemId:
   *                       type: string
   *                     quantidadeFisica:
   *                       type: number
   *                       example: 15
   *     responses:
   *       200:
   *         description: Inventário registrado com sucesso
   *       400:
   *         description: Payload inválido ou erro de validação
   *       500:
   *         description: Erro interno no servidor
   */
  async salvarInventarioFisico(req: Request, res: Response) {
    try {
      const { escolaId } = req.params;
      const { itens } = req.body; // itens: [{ itemId, quantidadeFisica }]

      if (!itens || !Array.isArray(itens)) {
        return res.status(400).json({ error: 'O payload deve conter um array "itens".' });
      }

      await prisma.$transaction(async (tx) => {
        for (const item of itens) {
          // 1. Buscar estoque teórico atual para auditoria antes da sobrescrita
          const estoqueAtual = await tx.estoque.findUnique({
            where: {
              escolaId_itemId: {
                escolaId: String(escolaId),
                itemId: String(item.itemId),
              },
            },
          });

          const teorico = estoqueAtual ? estoqueAtual.quantidade : 0;
          const fisico = parseFloat(item.quantidadeFisica);

          // 2. Atualizar estoque real (Sobrescrita)
          await tx.estoque.upsert({
            where: {
              escolaId_itemId: {
                escolaId: String(escolaId),
                itemId: String(item.itemId),
              },
            },
            update: {
              quantidade: fisico,
            },
            create: {
              escolaId: String(escolaId),
              itemId: String(item.itemId),
              quantidade: fisico,
            },
          });

          // 3. Registrar no Histórico de Auditoria
          await tx.inventarioHistorico.create({
            data: {
              escolaId: String(escolaId),
              itemId: String(item.itemId),
              quantidadeFisica: fisico,
              estoqueTeoricoNoMomento: teorico,
            },
          });

          // 4. Gatilho de Auto-Resolução: Se o estoque zerou ou diminuiu drasticamente, resolve alertas pendentes
          await tx.alertaRemanejamento.updateMany({
            where: {
              escolaId: String(escolaId),
              itemId: String(item.itemId),
              status: 'PENDENTE',
              OR: [
                { quantidadeRisco: { gte: fisico } },
                { quantidadeRisco: 0 } // Caso especial de alerta genérico
              ]
            },
            data: {
              status: fisico === 0 ? 'AUTO_RESOLVIDO' : 'RESOLVIDO',
              atualizadoEm: new Date()
            }
          });
        }
      });

      return res.status(200).json({ message: 'Inventário físico processado e registrado no histórico.' });
    } catch (error) {
      console.error('Erro ao salvar inventário físico:', error);
      return res.status(500).json({ error: 'Erro interno ao salvar inventário.' });
    }
  }

  /**
   * @swagger
   * /api/escolas/{escolaId}/inventario/historico:
   *   get:
   *     summary: Consulta o histórico de inventários realizados
   *     tags: [Auditoria e Estoque]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: escolaId
   *         required: true
   *         schema:
   *           type: string
   *         description: ID da escola
   *       - in: query
   *         name: mes
   *         required: true
   *         schema:
   *           type: string
   *         description: Mês do histórico (1-12)
   *       - in: query
   *         name: ano
   *         required: true
   *         schema:
   *           type: string
   *         description: Ano do histórico
   *     responses:
   *       200:
   *         description: Histórico retornado com sucesso
   *       400:
   *         description: Parâmetros ausentes
   *       500:
   *         description: Erro interno no servidor
   */
  async consultarHistorico(req: Request, res: Response) {
    try {
      const { escolaId } = req.params;
      const { mes, ano } = req.query;

      if (!mes || !ano) {
        return res.status(400).json({ error: 'Mês e ano são obrigatórios.' });
      }

      const startDate = new Date(Number(ano), Number(mes) - 1, 1);
      const endDate = new Date(Number(ano), Number(mes), 0, 23, 59, 59);

      const historico = await prisma.inventarioHistorico.findMany({
        where: {
          escolaId: String(escolaId),
          dataContagem: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: {
          item: true,
        },
        orderBy: {
          dataContagem: 'desc',
        },
      });

      return res.status(200).json(historico);
    } catch (error) {
      console.error('Erro ao consultar histórico:', error);
      return res.status(500).json({ error: 'Erro interno ao buscar histórico.' });
    }
  }

  /**
   * Registra a entrada de mercadorias (Soma ao estoque)
   */
  async registrarEntrada(req: Request, res: Response) {
    try {
      const { escola_id, item_id, quantidade_recebida, numero_guia } = req.body;

      if (!escola_id || !item_id || quantidade_recebida === undefined) {
        return res.status(400).json({ error: 'Campos obrigatórios ausentes: escola_id, item_id, quantidade_recebida' });
      }

      const receivedQuantity = parseFloat(quantidade_recebida);

      const result = await prisma.$transaction(async (tx) => {
        const estoqueAtualizado = await tx.estoque.upsert({
          where: {
            escolaId_itemId: {
              escolaId: escola_id,
              itemId: item_id,
            },
          },
          update: {
            quantidade: { increment: receivedQuantity },
          },
          create: {
            escolaId: escola_id,
            itemId: item_id,
            quantidade: receivedQuantity,
          },
        });

        await tx.movimentacao.create({
          data: {
            escolaId: escola_id,
            itemId: item_id,
            type: MovimentacaoType.IN,
            quantity: Math.floor(receivedQuantity),
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
      console.error('Erro ao registrar entrada:', error);
      return res.status(500).json({ error: 'Erro interno ao registrar entrada.' });
    }
  }

  /**
   * Realiza o remanejamento entre escolas
   */
  async remanejar(req: Request, res: Response) {
    try {
      const { escolaOrigemId, escolaDestinoId, itemId, quantidade } = req.body;

      if (!escolaOrigemId || !escolaDestinoId || !itemId || quantidade === undefined) {
        return res.status(400).json({ error: 'Campos obrigatórios ausentes.' });
      }

      const qty = parseFloat(quantidade);

      const result = await prisma.$transaction(async (tx) => {
        const estoqueOrigem = await tx.estoque.findUnique({
          where: { escolaId_itemId: { escolaId: escolaOrigemId, itemId } }
        });

        if (!estoqueOrigem || estoqueOrigem.quantidade < qty) {
          throw new Error('Estoque insuficiente na escola de origem.');
        }

        await tx.estoque.update({
          where: { id: estoqueOrigem.id },
          data: { quantidade: { decrement: qty } }
        });

        await tx.estoque.upsert({
          where: { escolaId_itemId: { escolaId: escolaDestinoId, itemId } },
          update: { quantidade: { increment: qty } },
          create: { escolaId: escolaDestinoId, itemId, quantidade: qty }
        });

        await tx.movimentacao.create({
          data: { escolaId: escolaOrigemId, itemId, type: MovimentacaoType.TRANSFER, quantity: Math.floor(qty) }
        });
        await tx.movimentacao.create({
          data: { escolaId: escolaDestinoId, itemId, type: MovimentacaoType.TRANSFER, quantity: Math.floor(qty) }
        });

        return { status: 'Transferência concluída' };
      });

      return res.status(200).json(result);
    } catch (error: any) {
      console.error('Erro no remanejamento:', error);
      return res.status(400).json({ error: error.message || 'Erro ao processar remanejamento.' });
    }
  }
  /**
   * Realiza o remanejamento em lote entre escolas
   */
  async remanejarLote(req: Request, res: Response) {
    try {
      const { escolaOrigemId, escolaDestinoId, itens } = req.body;

      if (!escolaOrigemId || !escolaDestinoId || !itens || !Array.isArray(itens) || itens.length === 0) {
        return res.status(400).json({ error: 'Campos obrigatórios ausentes: escolaOrigemId, escolaDestinoId, itens (array).' });
      }

      await prisma.$transaction(async (tx) => {
        for (const item of itens) {
          const { itemId, quantidade } = item;
          const qty = parseFloat(quantidade);

          if (!itemId || isNaN(qty) || qty <= 0) {
            throw new Error(`Item inválido ou quantidade incorreta: ${itemId}`);
          }

          // Subtrair da origem
          const estoqueOrigem = await tx.estoque.findUnique({
            where: { escolaId_itemId: { escolaId: escolaOrigemId, itemId: String(itemId) } }
          });

          if (!estoqueOrigem || estoqueOrigem.quantidade < qty) {
            throw new Error(`Estoque insuficiente na escola de origem para o item ${itemId}.`);
          }

          await tx.estoque.update({
            where: { id: estoqueOrigem.id },
            data: { quantidade: { decrement: qty } }
          });

          // Somar no destino
          await tx.estoque.upsert({
            where: { escolaId_itemId: { escolaId: escolaDestinoId, itemId: String(itemId) } },
            update: { quantidade: { increment: qty } },
            create: { escolaId: escolaDestinoId, itemId: String(itemId), quantidade: qty }
          });

          // Registrar movimentação
          await tx.movimentacao.create({
            data: { escolaId: escolaOrigemId, itemId: String(itemId), type: MovimentacaoType.TRANSFER, quantity: Math.floor(qty) }
          });
          await tx.movimentacao.create({
            data: { escolaId: escolaDestinoId, itemId: String(itemId), type: MovimentacaoType.TRANSFER, quantity: Math.floor(qty) }
          });
        }
      });

      return res.status(200).json({ message: 'Transferência em lote concluída com sucesso.' });
    } catch (error: any) {
      console.error('Erro no remanejamento em lote:', error);
      return res.status(400).json({ error: error.message || 'Erro ao processar remanejamento em lote.' });
    }
  }

  /**
   * Lista o histórico de remanejamentos com filtro opcional por escola
   */
  async listarHistoricoRemanejamento(req: Request, res: Response) {
    try {
      const { escolaId } = req.query;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const whereClause: any = {
        type: MovimentacaoType.TRANSFER,
      };

      if (escolaId) {
        whereClause.escolaId = String(escolaId);
      }

      const historico = await prisma.movimentacao.findMany({
        where: whereClause,
        include: {
          escola: true,
          item: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return res.status(200).json(historico);
    } catch (error) {
      console.error('Erro ao listar histórico de remanejamento:', error);
      return res.status(500).json({ error: 'Erro interno ao buscar histórico.' });
    }
  }

  /**
   * Verifica pendências de processamento nos últimos 7 dias.
   * Retorna um array de strings YYYY-MM-DD para datas que possuem cardápio agendado
   * mas não possuem Log de Execução de Sucesso.
   */
  async verificarPendencias(req: Request, res: Response) {
    try {
      const pendingDates: string[] = [];
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      // Limite: últimos 7 dias letivos retroativos
      for (let i = 1; i <= 7; i++) {
        const checkDate = new Date(hoje);
        checkDate.setDate(checkDate.getDate() - i);
        
        const dayStart = new Date(checkDate);
        const dayEnd = new Date(checkDate);
        dayEnd.setHours(23, 59, 59, 999);

        // 1. Há cardápio? (Pelo menos um não-feriado)
        const hasCardapio = await prisma.cardapio.findFirst({
          where: {
            data_agendada: {
              gte: dayStart,
              lte: dayEnd
            },
            isFeriado: false
          }
        });

        if (hasCardapio) {
          // 2. Há ProcessamentoLog de SUCESSO?
          const hasLog = await prisma.processamentoLog.findFirst({
            where: {
              dataProcessamento: {
                gte: dayStart,
                lte: dayEnd
              },
              status: 'SUCESSO'
            }
          });

          if (!hasLog) {
            // Se tem cardápio e não tem log, é pendência!
            const yyyy = checkDate.getFullYear();
            const mm = String(checkDate.getMonth() + 1).padStart(2, '0');
            const dd = String(checkDate.getDate()).padStart(2, '0');
            pendingDates.push(`${yyyy}-${mm}-${dd}`);
          }
        }
      }

      return res.status(200).json(pendingDates);
    } catch (error) {
      console.error('Erro ao verificar pendências de processamento:', error);
      return res.status(500).json({ error: 'Erro interno ao verificar pendências.' });
    }
  }
  /**
   * Registra a baixa/descarte manual de itens do estoque com justificativa
   */
  async descartar(req: Request, res: Response) {
    try {
      const { escolaId } = req.params;
      const { itemId, quantidade, motivo, observacao } = req.body;

      if (!escolaId || !itemId || !quantidade || !motivo) {
        return res.status(400).json({ error: 'Campos obrigatórios: escolaId, itemId, quantidade, motivo' });
      }

      const qty = parseFloat(quantidade);
      if (isNaN(qty) || qty <= 0) {
        return res.status(400).json({ error: 'Quantidade inválida para descarte.' });
      }

      const result = await prisma.$transaction(async (tx) => {
        const estoqueAtual = await tx.estoque.findUnique({
          where: { escolaId_itemId: { escolaId: String(escolaId), itemId: String(itemId) } }
        });

        if (!estoqueAtual || estoqueAtual.quantidade < qty) {
          throw new Error(`Estoque insuficiente para descarte. Saldo atual: ${estoqueAtual?.quantidade || 0}`);
        }

        const estoqueAtualizado = await tx.estoque.update({
          where: { id: estoqueAtual.id },
          data: { quantidade: { decrement: qty } }
        });

        await tx.movimentacao.create({
          data: {
            escolaId: String(escolaId),
            itemId: String(itemId),
            type: 'SAIDA_DESCARTE' as any,
            quantity: Math.floor(qty), // Convert to int as per schema
            motivo: String(motivo),
            observacao: observacao ? String(observacao) : null
          }
        });

        return estoqueAtualizado;
      });

      return res.status(200).json({ message: 'Baixa de estoque realizada com sucesso.', estoque: result });
    } catch (error: any) {
      console.error('Erro ao descartar estoque:', error);
      return res.status(400).json({ error: error.message || 'Erro ao processar baixa de estoque.' });
    }
  }
}
