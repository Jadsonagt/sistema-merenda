import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js'; // Ajuste o caminho do prisma conforme o projeto

export class DietaController {
  // ================= CATALOGO DE DIETAS =================
  async listarTipos(req: Request, res: Response) {
    try {
      const tipos = await prisma.tipoDieta.findMany({ orderBy: { nome: 'asc' } });
      return res.status(200).json(tipos);
    } catch (error) {
      console.error('[DietaController] Erro ao listar tipos:', error);
      return res.status(500).json({ error: 'Erro ao listar os tipos de dieta.' });
    }
  }

  async criarTipo(req: Request, res: Response) {
    try {
      const { nome, descricao } = req.body;
      if (!nome) return res.status(400).json({ error: 'Nome da dieta é obrigatório.' });

      const tipo = await prisma.tipoDieta.create({ data: { nome, descricao } });
      return res.status(201).json(tipo);
    } catch (error) {
      console.error('[DietaController] Erro ao criar tipo:', error);
      return res.status(500).json({ error: 'Erro ao criar o tipo de dieta (verifique se já existe).' });
    }
  }

  async excluirTipo(req: Request, res: Response) {
    try {
      const { id } = req.params;

      // 1. Trava de Segurança: Conta quantos registros existem usando esta dieta
      const demandasAtivas = await prisma.demandaDieta.aggregate({
        where: { tipoDietaId: String(id) },
        _sum: { quantidade: true }
      });

      const totalAlunos = demandasAtivas._sum.quantidade || 0;

      if (totalAlunos > 0) {
        return res.status(400).json({ error: `Ação bloqueada: Existem ${totalAlunos} aluno(s) vinculados a esta restrição na rede escolar. Zere as demandas antes de excluir do catálogo.` });
      }

      // 2. Se não houver alunos, permite a exclusão
      await prisma.tipoDieta.delete({ where: { id: String(id) } });
      return res.status(200).json({ message: 'Tipo de restrição excluído do catálogo.' });
    } catch (error) {
      console.error('[DietaController] Erro ao excluir tipo:', error);
      return res.status(500).json({ error: 'Erro interno ao tentar excluir a dieta.' });
    }
  }

  // ================= DEMANDAS POR ESCOLA =================
  async listarDemandas(req: Request, res: Response) {
    try {
      const { escolaId } = req.query;
      const where = escolaId ? { escolaId: String(escolaId) } : {};

      const demandas = await prisma.demandaDieta.findMany({
        where,
        include: { tipoDieta: true, escola: { select: { name: true } } }
      });
      return res.status(200).json(demandas);
    } catch (error) {
      return res.status(500).json({ error: 'Erro ao listar demandas nutricionais.' });
    }
  }

  async salvarDemandasDaEscola(req: Request, res: Response) {
    try {
      const { escolaId, demandas } = req.body; // demandas = [{ tipoDietaId, quantidade }]

      if (!escolaId || !Array.isArray(demandas)) {
        return res.status(400).json({ error: 'Payload inválido. Necessário escolaId e array de demandas.' });
      }

      // Transação: Limpa as demandas antigas e recria com os dados novos (filtra zeros)
      await prisma.$transaction(async (tx) => {
        await tx.demandaDieta.deleteMany({ where: { escolaId } });

        const demandasValidas = demandas.filter((d: any) => Number(d.quantidade) > 0);

        if (demandasValidas.length > 0) {
          await tx.demandaDieta.createMany({
            data: demandasValidas.map((d: any) => ({
              escolaId,
              tipoDietaId: d.tipoDietaId,
              quantidade: Number(d.quantidade)
            }))
          });
        }
      });

      return res.status(200).json({ message: 'Quadro de dietas da escola atualizado com sucesso.' });
    } catch (error) {
      console.error('[DietaController] Erro ao salvar demandas:', error);
      return res.status(500).json({ error: 'Erro ao atualizar as demandas da escola.' });
    }
  }
}
