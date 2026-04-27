import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class DashboardService {
  async getResumoDashboard() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const [
      totalEscolas,
      totalDivergencias,
      escolasSemInventario,
      alertasEstoqueBaixo
    ] = await Promise.all([
      prisma.escola.count(),
      prisma.movimentacao.count({
        where: { type: 'ADJUSTMENT' }
      }),
      prisma.escola.count({
        where: {
          NOT: {
            movimentacoes: {
              some: {
                type: 'ADJUSTMENT',
                createdAt: {
                  gte: startOfMonth,
                  lte: endOfMonth
                }
              }
            }
          }
        }
      }),
      prisma.estoqueAtual.count({
        where: { quantityInteger: { lte: 0 } }
      })
    ]);

    // Cálculo do graficoVolume (Top 5 itens em estoque geral)
    const volumeGroups = await prisma.estoqueAtual.groupBy({
      by: ['itemId'],
      _sum: {
        quantityInteger: true
      },
      orderBy: {
        _sum: {
          quantityInteger: 'desc'
        }
      },
      take: 5
    });

    const itemIds = volumeGroups.map(v => v.itemId);
    const items = await prisma.item.findMany({
      where: { id: { in: itemIds } }
    });
    const itemsMap = new Map(items.map(item => [item.id, item.name]));
    
    const graficoVolume = volumeGroups.map(v => ({
      name: itemsMap.get(v.itemId) || 'Desconhecido',
      total: v._sum.quantityInteger || 0
    }));

    // Cálculo do graficoStatus
    const normalCount = await prisma.estoqueAtual.count({
      where: { quantityInteger: { gt: 10 } }
    });
    const baixoCount = await prisma.estoqueAtual.count({
      where: { quantityInteger: { gt: 0, lte: 10 } }
    });
    const criticoCount = await prisma.estoqueAtual.count({
      where: { quantityInteger: { lte: 0 } }
    });

    const graficoStatus = [
      { name: 'Estoque Normal', value: normalCount, fill: '#10b981' },
      { name: 'Estoque Baixo', value: baixoCount, fill: '#f59e0b' },
      { name: 'Estoque Crítico', value: criticoCount, fill: '#ef4444' }
    ];

    return {
      totalEscolas,
      totalDivergencias,
      escolasSemInventario,
      alertasEstoqueBaixo,
      graficoVolume,
      graficoStatus
    };
  }
}
