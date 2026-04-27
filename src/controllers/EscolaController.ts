import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';

export class EscolaController {
  async create(req: Request, res: Response) {
    try {
      const { name, type, rota_id } = req.body;

      if (!name || !type || !rota_id) {
        return res.status(400).json({ error: 'Missing required fields: name, type, rota_id' });
      }

      const rotaExists = await prisma.rota.findUnique({
        where: { id: rota_id },
      });

      if (!rotaExists) {
        return res.status(404).json({ error: 'Rota not found' });
      }

      const escola = await prisma.escola.create({
        data: {
          name,
          type,
          rotaId: rota_id,
        },
      });

      return res.status(201).json(escola);
    } catch (error) {
      console.error('Error creating escola:', error);
      return res.status(500).json({ error: 'Internal server error while creating escola' });
    }
  }

  async listByRota(req: Request, res: Response) {
    try {
      const { rota_id } = req.params;

      const escolas = await prisma.escola.findMany({
        where: { rotaId: String(rota_id) },
        orderBy: { name: 'asc' },
      });

      return res.status(200).json(escolas);
    } catch (error) {
      console.error('Error listing escolas by rota:', error);
      return res.status(500).json({ error: 'Internal server error while listing escolas' });
    }
  }

  async list(req: Request, res: Response) {
    try {
      const escolas = await prisma.escola.findMany({
        orderBy: { name: 'asc' },
      });

      return res.status(200).json(escolas);
    } catch (error) {
      console.error('Error listing escolas:', error);
      return res.status(500).json({ error: 'Internal server error while listing escolas' });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { name, type, rota_id } = req.body;

      if (!name || !type || !rota_id) {
        return res.status(400).json({ error: 'Missing required fields: name, type, rota_id' });
      }

      const rotaExists = await prisma.rota.findUnique({
        where: { id: rota_id },
      });

      if (!rotaExists) {
        return res.status(404).json({ error: 'Rota not found' });
      }

      const escola = await prisma.escola.update({
        where: { id },
        data: {
          name,
          type,
          rotaId: rota_id,
        },
      });

      return res.status(200).json(escola);
    } catch (error) {
      console.error('Error updating escola:', error);
      return res.status(500).json({ error: 'Internal server error while updating escola' });
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;

      await prisma.escola.delete({
        where: { id },
      });

      return res.status(200).json({ message: 'Escola excluída com sucesso.' });
    } catch (error: any) {
      console.error('Error deleting escola:', error);
      if (error.code === 'P2003') {
        return res.status(400).json({ error: 'Não é possível excluir esta escola pois ela já possui histórico de estoque, metas ou consumos vinculados.' });
      }
      return res.status(500).json({ error: 'Internal server error while deleting escola' });
    }
  }
}
