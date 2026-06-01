import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';

export class FichaTecnicaController {
  /**
   * @swagger
   * /api/fichas:
   *   post:
   *     summary: Cria uma nova ficha técnica (receita)
   *     tags: [Fichas Técnicas]
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
   *               - type
   *             properties:
   *               name:
   *                 type: string
   *               type:
   *                 type: string
   *               ingredientes:
   *                 type: array
   *                 description: Lista de ingredientes da receita (opcional no momento da criação da ficha básica)
   *                 items:
   *                   type: object
   *                   properties:
   *                     itemId:
   *                       type: string
   *                     quantidade:
   *                       type: number
   *     responses:
   *       201:
   *         description: Ficha técnica criada com sucesso
   */
  async create(req: Request, res: Response) {
    try {
      const { name, type } = req.body;

      if (!name || !type) {
        return res.status(400).json({ error: 'Missing required fields: name, type' });
      }

      const ficha = await prisma.fichaTecnica.create({
        data: { name, type },
      });

      return res.status(201).json(ficha);
    } catch (error) {
      console.error('Error creating ficha tecnica:', error);
      return res.status(500).json({ error: 'Internal server error while creating ficha tecnica' });
    }
  }

  /**
   * @swagger
   * /api/fichas:
   *   get:
   *     summary: Lista todas as fichas técnicas
   *     tags: [Fichas Técnicas]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Lista retornada com sucesso
   */
  async list(req: Request, res: Response) {
    try {
      const fichas = await prisma.fichaTecnica.findMany({
        orderBy: { name: 'asc' },
      });

      return res.status(200).json(fichas);
    } catch (error) {
      console.error('Error listing fichas:', error);
      return res.status(500).json({ error: 'Internal server error while listing fichas' });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { name, type } = req.body;

      if (!name || !type) {
        return res.status(400).json({ error: 'Missing required fields: name, type' });
      }

      const fichaExists = await prisma.fichaTecnica.findUnique({
        where: { id: String(id) },
      });

      if (!fichaExists) {
        return res.status(404).json({ error: 'Ficha técnica não encontrada.' });
      }

      const ficha = await prisma.fichaTecnica.update({
        where: { id: String(id) },
        data: { name, type },
      });

      return res.status(200).json(ficha);
    } catch (error) {
      console.error('Error updating ficha tecnica:', error);
      return res.status(500).json({ error: 'Internal server error while updating ficha tecnica' });
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;

      // Trava manual: verificar se a ficha está agendada em algum cardápio
      const usoNoCardapio = await prisma.cardapioRefeicao.findFirst({
        where: { fichaTecnicaId: String(id) },
      });

      if (usoNoCardapio) {
        return res.status(400).json({ error: 'Não é possível excluir esta ficha técnica pois ela já está agendada em um cardápio.' });
      }

      // Trava manual: verificar se a ficha tem preparos vinculados
      const usoNoPreparo = await prisma.preparoEscola.findFirst({
        where: { fichaTecnicaId: String(id) },
      });

      if (usoNoPreparo) {
        return res.status(400).json({ error: 'Não é possível excluir esta ficha técnica pois ela possui preparos de escola vinculados.' });
      }

      await prisma.fichaTecnica.delete({
        where: { id: String(id) },
      });

      return res.status(200).json({ message: 'Ficha técnica excluída com sucesso.' });
    } catch (error: any) {
      console.error('Error deleting ficha tecnica:', error);
      if (error.code === 'P2003') {
        return res.status(400).json({ error: 'Não é possível excluir esta ficha técnica pois ela possui vínculos ativos.' });
      }
      return res.status(500).json({ error: 'Internal server error while deleting ficha tecnica' });
    }
  }
}
