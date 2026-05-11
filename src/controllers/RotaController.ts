import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';

export class RotaController {
  /**
   * @swagger
   * /api/rotas:
   *   post:
   *     summary: Cria uma nova rota de logística
   *     tags: [Gestão de Rede]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - name
   *             properties:
   *               name:
   *                 type: string
   *     responses:
   *       201:
   *         description: Rota criada com sucesso
   */
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

  /**
   * @swagger
   * /api/rotas:
   *   get:
   *     summary: Lista todas as rotas de logística
   *     tags: [Gestão de Rede]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Lista de rotas retornada com sucesso
   */
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
        where: { id: String(id) },
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
        where: { id: String(id) },
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
