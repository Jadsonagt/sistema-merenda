import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';

export class MetaPreparoController {
  async upsert(req: Request, res: Response) {
    try {
      const { escolaId, fichaId, quantidadePadrao } = req.body;

      if (!escolaId || !fichaId || quantidadePadrao === undefined) {
        return res.status(400).json({ error: 'Missing required fields: escolaId, fichaId, quantidadePadrao' });
      }

      const meta = await prisma.metaPreparo.upsert({
        where: {
          escolaId_fichaId: {
            escolaId,
            fichaId,
          },
        },
        update: {
          quantidadePadrao: Number(quantidadePadrao),
        },
        create: {
          escolaId,
          fichaId,
          quantidadePadrao: Number(quantidadePadrao),
        },
      });

      return res.status(201).json(meta);
    } catch (error) {
      console.error('Error upserting meta preparo:', error);
      return res.status(500).json({ error: 'Internal server error while handling meta preparo' });
    }
  }

  async listar(req: Request, res: Response) {
    try {
      const metas = await prisma.metaPreparo.findMany({
        include: {
          escola: true,
          ficha: true,
        },
      });

      return res.status(200).json(metas);
    } catch (error) {
      console.error('Error fetching metas:', error);
      return res.status(500).json({ error: 'Internal server error while fetching metas' });
    }
  }

  async atualizar(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { quantidadePadrao } = req.body;

      if (quantidadePadrao === undefined) {
        return res.status(400).json({ error: 'Campo quantidadePadrao é obrigatório' });
      }

      const metaAtualizada = await prisma.metaPreparo.update({
        where: { id: String(id) },
        data: { quantidadePadrao: Number(quantidadePadrao) },
      });

      return res.status(200).json(metaAtualizada);
    } catch (error) {
      console.error('Error updating meta preparo:', error);
      return res.status(500).json({ error: 'Internal server error while updating meta preparo' });
    }
  }
}
