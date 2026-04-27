import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';

export class RotaController {
  async create(req: Request, res: Response) {
    try {
      const { name } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Missing required field: name' });
      }

      const rota = await prisma.rota.create({
        data: {
          name,
        },
      });

      return res.status(201).json(rota);
    } catch (error) {
      console.error('Error creating rota:', error);
      return res.status(500).json({ error: 'Internal server error while creating rota' });
    }
  }

  async list(req: Request, res: Response) {
    try {
      const rotas = await prisma.rota.findMany({
        include: { escolas: true },
        orderBy: { name: 'asc' },
      });

      return res.status(200).json(rotas);
    } catch (error) {
      console.error('Error listing rotas:', error);
      return res.status(500).json({ error: 'Internal server error while listing rotas' });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { name } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Missing required field: name' });
      }

      const rota = await prisma.rota.update({
        where: { id },
        data: { name },
      });

      return res.status(200).json(rota);
    } catch (error) {
      console.error('Error updating rota:', error);
      return res.status(500).json({ error: 'Internal server error while updating rota' });
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;

      await prisma.rota.delete({
        where: { id },
      });

      return res.status(200).json({ message: 'Rota excluída com sucesso.' });
    } catch (error: any) {
      console.error('Error deleting rota:', error);
      if (error.code === 'P2003') {
        return res.status(400).json({ error: 'Não é possível excluir esta rota pois existem escolas vinculadas a ela.' });
      }
      return res.status(500).json({ error: 'Internal server error while deleting rota' });
    }
  }
}
