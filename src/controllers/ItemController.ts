import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';

export class ItemController {
  /**
   * @swagger
   * /api/items:
   *   post:
   *     summary: Cria um novo item no catálogo
   *     tags: [Catálogo de Itens]
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
   *               - base_unit
   *               - packaging_size
   *             properties:
   *               name:
   *                 type: string
   *               base_unit:
   *                 type: string
   *                 description: "Unidade base (ex: KG, L, UN)"
   *               packaging_size:
   *                 type: number
   *                 format: float
   *                 description: "Tamanho da embalagem para fins logísticos (ex: 5.0)"
   *     responses:
   *       201:
   *         description: Item criado com sucesso
   *       400:
   *         description: Parâmetros inválidos
   */
  async create(req: Request, res: Response) {
    try {
      const { name, base_unit, packaging_size } = req.body;

      if (!name || !base_unit || packaging_size === undefined) {
        return res.status(400).json({ error: 'Missing required fields: name, base_unit, packaging_size' });
      }

      const item = await prisma.item.create({
        data: {
          name,
          baseUnit: base_unit,
          packagingSize: Number(packaging_size),
        },
      });

      return res.status(201).json(item);
    } catch (error) {
      console.error('Error creating item:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * @swagger
   * /api/items:
   *   get:
   *     summary: Lista todos os itens do catálogo
   *     tags: [Catálogo de Itens]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Lista de itens retornada com sucesso
   */
  async list(req: Request, res: Response) {
    try {
      const items = await prisma.item.findMany({
        orderBy: {
          name: 'asc',
        },
      });

      return res.json(items);
    } catch (error) {
      console.error('Error listing items:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { name, baseUnit, packagingSize } = req.body;

      if (!name || !baseUnit || packagingSize === undefined) {
        return res.status(400).json({ error: 'Todos os campos (name, baseUnit, packagingSize) são obrigatórios.' });
      }

      if (Number(packagingSize) <= 0) {
        return res.status(400).json({ error: 'O tamanho da embalagem deve ser um número maior que zero.' });
      }

      const item = await prisma.item.update({
        where: { id: String(id) },
        data: {
          name,
          baseUnit,
          packagingSize: Number(packagingSize),
        },
      });

      return res.status(200).json(item);
    } catch (error) {
      console.error('Error updating item:', error);
      return res.status(500).json({ error: 'Erro ao atualizar item.' });
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;

      await prisma.item.delete({
        where: { id: String(id) }
      });

      return res.status(200).json({ message: 'Item excluído com sucesso.' });
    } catch (error: any) {
      console.error('Error deleting item:', error);
      if (error.code === 'P2003') {
        return res.status(400).json({ error: "Não é possível excluir este item pois ele já possui movimentações, estoques ou fichas técnicas vinculadas." });
      }
      return res.status(500).json({ error: 'Erro interno ao excluir item.' });
    }
  }
}
