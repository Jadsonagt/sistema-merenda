import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { formatLogisticValue } from '../utils/unitFormatter.js'; // 🔥 CORREÇÃO: Importação adicionada!

export class DashboardController {
  /**
   * @swagger
   * /api/dashboard/resumo:
   *   get:
   *     summary: Retorna o resumo gerencial para o Dashboard
   *     tags: [Dashboard]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: escolaId
   *         schema:
   *           type: string
   *         description: ID da escola para filtrar os dados (opcional)
   *     responses:
   *       200:
   *         description: Resumo retornado com sucesso
   *       500:
   *         description: Erro interno no servidor
   */
  async resumo(req: Request, res: Response) {
    try {
      const { escolaId } = req.query;

      // Filtro dinâmico
      const whereFilter = escolaId ? { escolaId: String(escolaId) } : {};

      const [
        totalEscolas,
        totalReceitas,
        alertasEstoque,
        historicoMotor,
        alertasRemanejamento,
        escolasLista
      ] = await Promise.all([
        prisma.escola.count(),
        prisma.fichaTecnica.count(),
        prisma.estoque.findMany({
          where: {
            quantidade: { lt: 0 },
            ...whereFilter
          },
          include: {
            escola: true,
            item: true
          }
        }),
        prisma.processamentoLog.findMany({
          orderBy: { dataProcessamento: 'desc' },
          take: 5
        }),
        prisma.alertaRemanejamento.findMany({
          where: {
            status: 'PENDENTE',
            ...whereFilter
          },
          include: { escola: true, item: true }
        }),
        prisma.escola.findMany({
          where: escolaId ? { id: String(escolaId) } : {},
          select: { id: true, name: true, type: true }
        })
      ]);

      return res.status(200).json({
        totalEscolas: escolaId ? 1 : totalEscolas,
        totalReceitas,
        alertasEstoque,
        historicoMotor,
        alertasRemanejamento,
        escolasLista
      });
    } catch (error) {
      console.error('Erro ao buscar resumo do dashboard:', error);
      return res.status(500).json({ error: 'Erro interno ao buscar indicadores.' });
    }
  }

  /**
   * @swagger
   * /api/dashboard/divergencias:
   *   get:
   *     summary: Retorna as top divergências de estoque
   *     tags: [Dashboard]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: escolaId
   *         schema:
   *           type: string
   *         description: ID da escola para filtrar os dados (opcional)
   *     responses:
   *       200:
   *         description: Lista de divergências retornada com sucesso
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 type: object
   *                 properties:
   *                   id:
   *                     type: string
   *                   escolaId:
   *                     type: string
   *                   escolaNome:
   *                     type: string
   *                   produto:
   *                     type: string
   *                   divergencia:
   *                     type: number
   *                   valor:
   *                     type: string
   *                     example: "-5 UN (5kg)"
   */
  async getTopDivergencias(req: Request, res: Response) {
    try {
      const { escolaId } = req.query;

      const whereFilter = escolaId ? { escolaId: String(escolaId) } : {};

      // Busca os últimos registros de inventário
      const registros = await prisma.inventarioHistorico.findMany({
        where: {
          ...whereFilter,
          // 🔥 CORREÇÃO: Usando a sintaxe nativa do Prisma para comparar colunas
          quantidadeFisica: {
            lt: prisma.inventarioHistorico.fields.estoqueTeoricoNoMomento
          }
        },
        include: {
          escola: { select: { id: true, name: true } },
          item: { select: { name: true, baseUnit: true, packagingSize: true } }
        },
        orderBy: [
          { dataContagem: 'desc' }
        ],
        take: 50
      });

      // Deduplicação: Manter apenas o registro mais recente por (escola + item)
      const registrosUnicos = new Map<string, typeof registros[0]>();
      
      for (const r of registros) {
        // Chave única para Escola + Produto
        const chave = `${r.escolaId}-${r.itemId}`; 
        
        // Como vem ordenado DESC, o primeiro que aparece é o mais recente
        if (!registrosUnicos.has(chave)) {
          registrosUnicos.set(chave, r);
        }
      }
      
      const registrosFiltrados = Array.from(registrosUnicos.values());

      // Filtra e mapeia para o payload do widget
      const divergencias = registrosFiltrados
        .map(r => {
          const divergenciaCalc = r.quantidadeFisica - r.estoqueTeoricoNoMomento;
          return {
            id: r.id,
            escolaId: r.escolaId,
            escolaNome: r.escola.name,
            produto: `Falta de ${r.item.name}`,
            divergencia: divergenciaCalc,
            valor: formatLogisticValue(
              divergenciaCalc,
              r.item.baseUnit,
              r.item.packagingSize
            )
          };
        })
        .filter(r => r.divergencia < 0)
        .sort((a, b) => a.divergencia - b.divergencia) // do maior furo para o menor
        .slice(0, 10);

      return res.status(200).json(divergencias);
    } catch (error) {
      console.error('Erro ao buscar divergencias:', error);
      return res.status(500).json({ error: 'Erro interno ao buscar divergências de estoque.' });
    }
  }

  /**
   * @swagger
   * /api/dashboard/vencimentos:
   *   get:
   *     summary: Retorna alertas de vencimentos críticos
   *     tags: [Dashboard]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: escolaId
   *         schema:
   *           type: string
   *         description: ID da escola para filtrar os dados (opcional)
   *     responses:
   *       200:
   *         description: Lista de vencimentos retornada com sucesso
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 type: object
   *                 properties:
   *                   id:
   *                     type: string
   *                   escolaId:
   *                     type: string
   *                   escolaNome:
   *                     type: string
   *                   produto:
   *                     type: string
   *                   diasParaVencer:
   *                     type: number
   *                   valor:
   *                     type: string
   *                     example: "Vence em 5 dias"
   */
  async getVencimentosCriticos(req: Request, res: Response) {
    try {
      const { escolaId } = req.query;

      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const limite = new Date(hoje);
      limite.setDate(limite.getDate() + 30);

      const whereFilter = escolaId ? { escolaId: String(escolaId) } : {};

      const alertas = await prisma.alertaRemanejamento.findMany({
        where: {
          ...whereFilter,
          status: 'PENDENTE',
          dataVencimento: {
            gte: hoje,
            lte: limite
          }
        },
        include: {
          escola: { select: { id: true, name: true } },
          item: { select: { name: true, baseUnit: true } }
        },
        orderBy: { dataVencimento: 'asc' },
        take: 10
      });

      const resultado = alertas.map(a => {
        const dias = Math.ceil(
          (new Date(a.dataVencimento!).getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24)
        );
        return {
          id: a.id,
          escolaId: a.escolaId,
          escolaNome: a.escola.name,
          produto: a.item.name,
          diasParaVencer: dias,
          valor: `Vence em ${dias} dias` // Formatado direto para o frontend
        };
      });

      return res.status(200).json(resultado);
    } catch (error) {
      console.error('Erro ao buscar vencimentos críticos:', error);
      return res.status(500).json({ error: 'Erro interno ao buscar vencimentos.' });
    }
  }
}