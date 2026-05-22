import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';

export class ConsumoFixoController {
  // GET /api/escolas/:escolaId/consumo-fixo
  async listar(req: Request, res: Response) {
    try {
      const { escolaId } = req.params;

      const consumos = await prisma.consumoFixo.findMany({
        where: { escolaId: String(escolaId) },
        include: { item: true },
      });

      return res.status(200).json(consumos);
    } catch (error) {
      console.error('Erro ao listar consumos fixos:', error);
      return res.status(500).json({ error: 'Erro interno ao listar consumos fixos.' });
    }
  }

  // POST /api/escolas/:escolaId/consumo-fixo
  async salvar(req: Request, res: Response) {
    try {
      const { escolaId } = req.params;
      const { itemId, quantidadeDiaria, frequencia } = req.body;

      if (!itemId || quantidadeDiaria === undefined) {
        return res.status(400).json({ error: 'Faltam campos: itemId, quantidadeDiaria' });
      }

      const valorQuantidade = parseFloat(quantidadeDiaria);
      if (isNaN(valorQuantidade) || valorQuantidade < 0) {
        return res.status(400).json({ error: 'A quantidade deve ser um número válido e não negativo.' });
      }

      // Valida escola e item
      const escolaExiste = await prisma.escola.findUnique({ where: { id: String(escolaId) } });
      if (!escolaExiste) return res.status(404).json({ error: 'Escola não encontrada.' });

      const itemExiste = await prisma.item.findUnique({ where: { id: String(itemId) } });
      if (!itemExiste) return res.status(404).json({ error: 'Item não encontrado.' });

      const consumo = await prisma.consumoFixo.upsert({
        where: {
          escolaId_itemId: {
            escolaId: String(escolaId),
            itemId: String(itemId),
          },
        },
        update: {
          quantidadeDiaria: valorQuantidade,
          frequencia: frequencia || 'DIARIO',
        },
        create: {
          escolaId: String(escolaId),
          itemId: String(itemId),
          quantidadeDiaria: valorQuantidade,
          frequencia: frequencia || 'DIARIO',
        },
        include: { item: true }
      });

      return res.status(200).json(consumo);
    } catch (error) {
      console.error('Erro ao salvar consumo fixo:', error);
      return res.status(500).json({ error: 'Erro interno ao salvar consumo fixo.' });
    }
  }

  // DELETE /api/consumo-fixo/:id
  async remover(req: Request, res: Response) {
    try {
      const { id } = req.params;

      await prisma.consumoFixo.delete({
        where: { id: String(id) },
      });

      return res.status(200).json({ message: 'Removido com sucesso' });
    } catch (error: any) {
      console.error('Erro ao remover consumo fixo:', error);
      if (error.code === 'P2025') {
        return res.status(404).json({ error: 'Registro não encontrado.' });
      }
      return res.status(500).json({ error: 'Erro interno ao remover consumo fixo.' });
    }
  }
}
