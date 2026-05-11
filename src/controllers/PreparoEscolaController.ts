import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';

export class PreparoEscolaController {
  /**
   * Salvar/Atualizar o preparo de uma escola para uma ficha técnica.
   * POST /api/escolas/:escolaId/preparos
   * Body: { fichaTecnicaId, ingredientes: [{ itemId, quantidade }] }
   */
  async salvarPreparo(req: Request, res: Response) {
    try {
      const { escolaId } = req.params;
      const { fichaTecnicaId, ingredientes } = req.body;

      if (!fichaTecnicaId) {
        return res.status(400).json({ error: 'Campo fichaTecnicaId é obrigatório.' });
      }

      if (!ingredientes || !Array.isArray(ingredientes) || ingredientes.length === 0) {
        return res.status(400).json({ error: 'Array de ingredientes é obrigatório e não pode ser vazio.' });
      }

      // Validar que a escola existe
      const escola = await prisma.escola.findUnique({ where: { id: String(escolaId) } });
      if (!escola) {
        return res.status(404).json({ error: 'Escola não encontrada.' });
      }

      // Validar que a ficha técnica existe
      const ficha = await prisma.fichaTecnica.findUnique({ where: { id: fichaTecnicaId } });
      if (!ficha) {
        return res.status(404).json({ error: 'Ficha técnica não encontrada.' });
      }

      const preparo = await prisma.$transaction(async (tx) => {
        // Upsert do PreparoEscola (cria ou encontra o existente)
        const preparoEscola = await tx.preparoEscola.upsert({
          where: {
            escolaId_fichaTecnicaId: {
              escolaId: String(escolaId),
              fichaTecnicaId,
            },
          },
          create: {
            escolaId: String(escolaId),
            fichaTecnicaId,
          },
          update: {
            updatedAt: new Date(),
          },
        });

        // Limpa ingredientes antigos
        await tx.preparoIngrediente.deleteMany({
          where: { preparoEscolaId: preparoEscola.id },
        });

        // Insere os novos ingredientes
        await tx.preparoIngrediente.createMany({
          data: ingredientes.map((ing: { itemId: string; quantidade: number }) => ({
            preparoEscolaId: preparoEscola.id,
            itemId: ing.itemId,
            quantidade: Number(ing.quantidade),
          })),
        });

        // Retorna o preparo completo
        return tx.preparoEscola.findUnique({
          where: { id: preparoEscola.id },
          include: {
            escola: true,
            fichaTecnica: true,
            ingredientes: {
              include: { item: true },
            },
          },
        });
      });

      return res.status(200).json(preparo);
    } catch (error) {
      console.error('Error saving preparo escola:', error);
      return res.status(500).json({ error: 'Internal server error while saving preparo.' });
    }
  }

  /**
   * Listar todos os preparos de uma escola.
   * GET /api/escolas/:escolaId/preparos
   */
  async listarPorEscola(req: Request, res: Response) {
    try {
      const { escolaId } = req.params;

      const preparos = await prisma.preparoEscola.findMany({
        where: { escolaId: String(escolaId) },
        include: {
          fichaTecnica: true,
          ingredientes: {
            include: { item: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return res.status(200).json(preparos);
    } catch (error) {
      console.error('Error listing preparos:', error);
      return res.status(500).json({ error: 'Internal server error while listing preparos.' });
    }
  }

  /**
   * Buscar um preparo específico (escola + ficha).
   * GET /api/escolas/:escolaId/preparos/:fichaTecnicaId
   */
  async buscarPreparo(req: Request, res: Response) {
    try {
      const { escolaId, fichaTecnicaId } = req.params;

      const preparo = await prisma.preparoEscola.findUnique({
        where: {
          escolaId_fichaTecnicaId: {
            escolaId: String(escolaId),
            fichaTecnicaId: String(fichaTecnicaId),
          },
        },
        include: {
          fichaTecnica: true,
          ingredientes: {
            include: { item: true },
          },
        },
      });

      if (!preparo) {
        return res.status(404).json({ error: 'Preparo não encontrado para esta escola e ficha.' });
      }

      return res.status(200).json(preparo);
    } catch (error) {
      console.error('Error fetching preparo:', error);
      return res.status(500).json({ error: 'Internal server error while fetching preparo.' });
    }
  }

  /**
   * Excluir um preparo de escola.
   * DELETE /api/escolas/:escolaId/preparos/:fichaTecnicaId
   */
  async excluirPreparo(req: Request, res: Response) {
    try {
      const { escolaId, fichaTecnicaId } = req.params;

      const preparo = await prisma.preparoEscola.findUnique({
        where: {
          escolaId_fichaTecnicaId: {
            escolaId: String(escolaId),
            fichaTecnicaId: String(fichaTecnicaId),
          },
        },
      });

      if (!preparo) {
        return res.status(404).json({ error: 'Preparo não encontrado.' });
      }

      await prisma.preparoEscola.delete({
        where: { id: preparo.id },
      });

      return res.status(200).json({ message: 'Preparo excluído com sucesso.' });
    } catch (error) {
      console.error('Error deleting preparo:', error);
      return res.status(500).json({ error: 'Internal server error while deleting preparo.' });
    }
  }

  /**
   * Clonar todos os preparos de uma escola para outra.
   * POST /api/escolas/:escolaId/clonar-preparos
   * Body: { escolaOrigemId }
   */
  async clonarPreparos(req: Request, res: Response) {
    try {
      const { escolaId } = req.params; // Destino
      const { escolaOrigemId } = req.body; // Origem

      if (!escolaOrigemId) {
        return res.status(400).json({ error: 'Campo escolaOrigemId é obrigatório.' });
      }

      if (escolaId === escolaOrigemId) {
        return res.status(400).json({ error: 'Escola de origem e destino não podem ser a mesma.' });
      }

      // 1. Buscar todos os preparos da origem com ingredientes
      const preparosOrigem = await prisma.preparoEscola.findMany({
        where: { escolaId: escolaOrigemId },
        include: { ingredientes: true }
      });

      if (preparosOrigem.length === 0) {
        return res.status(400).json({ error: 'A escola de origem não possui preparos configurados para clonar.' });
      }

      // 2. Executar clonagem em transação
      await prisma.$transaction(async (tx) => {
        for (const p of preparosOrigem) {
          // Upsert do PreparoEscola no destino
          const preparoDestino = await tx.preparoEscola.upsert({
            where: {
              escolaId_fichaTecnicaId: {
                escolaId: String(escolaId),
                fichaTecnicaId: p.fichaTecnicaId
              }
            },
            create: {
              escolaId: String(escolaId),
              fichaTecnicaId: p.fichaTecnicaId
            },
            update: {
              updatedAt: new Date()
            }
          });

          // Limpa ingredientes antigos do destino para este preparo
          await tx.preparoIngrediente.deleteMany({
            where: { preparoEscolaId: preparoDestino.id }
          });

          // Insere ingredientes clonados
          if (p.ingredientes.length > 0) {
            await tx.preparoIngrediente.createMany({
              data: p.ingredientes.map(ing => ({
                preparoEscolaId: preparoDestino.id,
                itemId: ing.itemId,
                quantidade: ing.quantidade
              }))
            });
          }
        }
      });

      return res.status(200).json({ message: `${preparosOrigem.length} preparos clonados com sucesso.` });
    } catch (error) {
      console.error('Error cloning preparos:', error);
      return res.status(500).json({ error: 'Internal server error while cloning preparos.' });
    }
  }
}
