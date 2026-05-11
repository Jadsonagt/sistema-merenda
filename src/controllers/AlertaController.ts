import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';

export class AlertaController {
  /**
   * Cria um novo alerta de remanejamento (vencimento próximo)
   */
  async criar(req: Request, res: Response) {
    try {
      const { escolaId, itemId, quantidadeRisco, dataVencimento } = req.body;

      if (!escolaId || !itemId || !quantidadeRisco) {
        return res.status(400).json({ error: 'Escola, Item e Quantidade são obrigatórios.' });
      }

      const alerta = await prisma.alertaRemanejamento.create({
        data: {
          escolaId,
          itemId,
          quantidadeRisco: Number(quantidadeRisco),
          dataVencimento: dataVencimento ? new Date(dataVencimento) : null,
          status: 'PENDENTE'
        },
        include: {
          escola: true,
          item: true
        }
      });

      return res.status(201).json(alerta);
    } catch (error) {
      console.error('Erro ao criar alerta:', error);
      return res.status(500).json({ error: 'Erro interno ao criar alerta.' });
    }
  }

  /**
   * Marca um alerta como RESOLVIDO
   */
  /**
   * @swagger
   * /api/alertas/{id}/resolver:
   *   put:
   *     summary: Marca um alerta de remanejamento como resolvido
   *     tags: [Alertas]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: ID do alerta
   *     responses:
   *       200:
   *         description: Alerta resolvido com sucesso
   */
  async resolver(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const alerta = await prisma.alertaRemanejamento.update({
        where: { id: String(id) },
        data: { status: 'RESOLVIDO' }
      });

      return res.status(200).json(alerta);
    } catch (error) {
      console.error('Erro ao resolver alerta:', error);
      return res.status(500).json({ error: 'Erro interno ao resolver alerta.' });
    }
  }

  /**
   * Lista todos os alertas pendentes (opcional, para uso futuro)
   */
  /**
   * @swagger
   * /api/alertas:
   *   get:
   *     summary: Lista todos os alertas de remanejamento pendentes
   *     tags: [Alertas]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Lista de alertas retornada com sucesso
   */
  async listarPendentes(req: Request, res: Response) {
    try {
      const alertas = await prisma.alertaRemanejamento.findMany({
        where: { status: 'PENDENTE' },
        include: {
          escola: true,
          item: true
        },
        orderBy: { criadoEm: 'desc' }
      });
      return res.status(200).json(alertas);
    } catch (error) {
      return res.status(500).json({ error: 'Erro ao listar alertas.' });
    }
  }
}
