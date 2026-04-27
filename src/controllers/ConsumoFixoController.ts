import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export class ConsumoFixoController {
  async adicionar(req: Request, res: Response) {
    try {
      const { escolaId, itemId, quantidade } = req.body;

      if (!escolaId || !itemId || quantidade === undefined) {
        return res.status(400).json({ error: 'Faltam campos obrigatórios: escolaId, itemId, quantidade' });
      }

      if (typeof quantidade !== 'number' || quantidade <= 0 || !Number.isInteger(quantidade)) {
        return res.status(400).json({ error: 'A quantidade deve ser um número inteiro maior que zero.' });
      }

      const escolaExiste = await prisma.escola.findUnique({ where: { id: escolaId } });
      if (!escolaExiste) {
        return res.status(404).json({ error: 'Escola não encontrada.' });
      }

      const itemExiste = await prisma.item.findUnique({ where: { id: itemId } });
      if (!itemExiste) {
        return res.status(404).json({ error: 'Item não encontrado.' });
      }

      const consumoFixo = await prisma.consumoFixo.create({
        data: {
          escolaId,
          itemId,
          quantidade,
        },
      });

      return res.status(201).json(consumoFixo);
    } catch (error) {
      console.error('Erro ao adicionar consumo fixo:', error);
      return res.status(500).json({ error: 'Erro interno no servidor ao adicionar consumo fixo.' });
    }
  }

  async listarPorEscola(req: Request, res: Response) {
    try {
      const { escolaId } = req.params;

      const consumos = await prisma.consumoFixo.findMany({
        where: { escolaId },
        include: { item: true },
      });

      return res.status(200).json(consumos);
    } catch (error) {
      console.error('Erro ao listar consumo fixo por escola:', error);
      return res.status(500).json({ error: 'Erro interno ao consultar consumos fixos.' });
    }
  }

  async remover(req: Request, res: Response) {
    try {
      const { id } = req.params;

      await prisma.consumoFixo.delete({
        where: { id },
      });

      return res.status(200).json({ message: 'Registro de consumo fixo removido com sucesso.' });
    } catch (error: any) {
      console.error('Erro ao remover consumo fixo:', error);
      if (error.code === 'P2025') {
        return res.status(404).json({ error: 'Consumo fixo não encontrado.' });
      }
      return res.status(500).json({ error: 'Erro interno ao remover consumo fixo.' });
    }
  }
  async listar(req: Request, res: Response) {
    try {
      const consumos = await prisma.consumoFixo.findMany({
        include: { escola: true, item: true },
      });

      return res.status(200).json(consumos);
    } catch (error) {
      console.error('Erro ao listar consumos fixos:', error);
      return res.status(500).json({ error: 'Erro interno ao consultar consumos fixos.' });
    }
  }
}
