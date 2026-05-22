import { Request, Response } from 'express';
import ExcelJS from 'exceljs';
import { prisma } from '../lib/prisma.js';
import { 
  startOfDay, 
  endOfDay, 
  startOfMonth, 
  endOfMonth 
} from 'date-fns';

export class MotorComprasController {
  async preverCompras(req: Request, res: Response) {
    try {
      const { mesAlvo, anoAlvo, escolaId, descontarEstoque = true } = req.body;

      if (!mesAlvo || !anoAlvo || !escolaId) {
        return res.status(400).json({ error: 'Mês, Ano alvo e Escola são obrigatórios.' });
      }

      const hoje = new Date();
      const fimMesAtual = endOfMonth(hoje);
      
      const dataInicioAlvo = startOfMonth(new Date(Number(anoAlvo), Number(mesAlvo) - 1));
      const dataFimAlvo = endOfMonth(dataInicioAlvo);

      // --- BUSCA DA ESCOLA ESPECÍFICA ---
      const escola = await prisma.escola.findUnique({ where: { id: escolaId } });
      if (!escola) return res.status(404).json({ error: 'Escola não encontrada.' });

      const itensCatalogo = await prisma.item.findMany();
      
      // --- FASE 1: O Que Vai Sobrar (Hoje até fim do mês atual) ---
      const cardapiosRestantes = await prisma.cardapio.findMany({
        where: {
          data_agendada: {
            gte: startOfDay(hoje),
            lte: endOfDay(fimMesAtual)
          },
          isFeriado: false,
          tipos_escola: { has: escola.type }
        }
      });

      const demandaRestantePorItem: Record<string, number> = {};

      // Consumo de cardápio restante
      for (const cardapio of cardapiosRestantes) {
        const preparo = await prisma.preparoEscola.findUnique({
          where: {
            escolaId_fichaTecnicaId: {
              escolaId: escola.id,
              fichaTecnicaId: cardapio.fichaTecnicaId!
            }
          },
          include: { ingredientes: true }
        });

        if (preparo) {
          preparo.ingredientes.forEach(ing => {
            demandaRestantePorItem[ing.itemId] = (demandaRestantePorItem[ing.itemId] || 0) + ing.quantidade;
          });
        }
      }

      // Consumo fixo restante
      const diffDias = Math.max(0, fimMesAtual.getDate() - hoje.getDate() + 1);
      const consumosFixos = await prisma.consumoFixo.findMany({
        where: { escolaId: escola.id }
      });

      consumosFixos.forEach(cf => {
        const diasLetivos = diffDias;
        let quantidadeTotal = 0;
        if (cf.frequencia === 'SEMANAL') {
          const semanas = Math.ceil(diasLetivos / 5);
          quantidadeTotal = cf.quantidadeDiaria * semanas;
        } else {
          quantidadeTotal = cf.quantidadeDiaria * diasLetivos;
        }
        demandaRestantePorItem[cf.itemId] = (demandaRestantePorItem[cf.itemId] || 0) + quantidadeTotal;
      });

      // --- FASE 2: Demanda do Novo Mês ---
      const cardapiosAlvo = await prisma.cardapio.findMany({
        where: {
          data_agendada: {
            gte: dataInicioAlvo,
            lte: dataFimAlvo
          },
          isFeriado: false,
          tipos_escola: { has: escola.type }
        }
      });

      const demandaMesAlvoPorItem: Record<string, number> = {};
      const diasMesAlvo = dataFimAlvo.getDate();

      for (const cardapio of cardapiosAlvo) {
        const preparo = await prisma.preparoEscola.findUnique({
          where: {
            escolaId_fichaTecnicaId: {
              escolaId: escola.id,
              fichaTecnicaId: cardapio.fichaTecnicaId!
            }
          },
          include: { ingredientes: true }
        });

        if (preparo) {
          preparo.ingredientes.forEach(ing => {
            demandaMesAlvoPorItem[ing.itemId] = (demandaMesAlvoPorItem[ing.itemId] || 0) + ing.quantidade;
          });
        }
      }

      consumosFixos.forEach(cf => {
        const diasLetivos = diasMesAlvo;
        let quantidadeTotal = 0;
        if (cf.frequencia === 'SEMANAL') {
          const semanas = Math.ceil(diasLetivos / 5);
          quantidadeTotal = cf.quantidadeDiaria * semanas;
        } else {
          quantidadeTotal = cf.quantidadeDiaria * diasLetivos;
        }
        demandaMesAlvoPorItem[cf.itemId] = (demandaMesAlvoPorItem[cf.itemId] || 0) + quantidadeTotal;
      });

      // --- FASE 3: Cálculo Final ---
      const estoquesAtuais = await prisma.estoque.findMany({
        where: { escolaId: escola.id }
      });
      
      const relatorio = itensCatalogo.map(item => {
        const estoque = estoquesAtuais.find(e => e.itemId === item.id);
        const estoqueFisico = estoque ? estoque.quantidade : 0;
        const demandaRestante = demandaRestantePorItem[item.id] || 0;

        const estoqueProjetado = Math.max(0, estoqueFisico - demandaRestante);
        const demandaAlvo = demandaMesAlvoPorItem[item.id] || 0;
        
        // Regra de Arredondamento Teto (Math.ceil) para Compras
        const sugestaoCompra = descontarEstoque 
          ? Math.ceil(Math.max(0, demandaAlvo - estoqueProjetado)) 
          : Math.ceil(demandaAlvo);

        return {
          itemId: item.id,
          nome: item.name,
          unidade: item.baseUnit,
          estoqueFisicoAtual: Number(estoqueFisico.toFixed(2)),
          estoqueProjetado: Number(estoqueProjetado.toFixed(2)),
          demandaMesAlvo: Number(demandaAlvo.toFixed(2)),
          quantidadeComprar: sugestaoCompra
        };
      }); // Filtro removido para manter todos os itens no relatório

      return res.status(200).json(relatorio);
    } catch (error: any) {
      console.error('Erro na previsão de compras:', error);
      return res.status(500).json({ error: 'Erro interno ao calcular necessidade de compras.' });
    }
  }

  // --- NOVO RELATÓRIO EXCEL CONSOLIDADO ---
  async exportarExcelConsolidado(req: Request, res: Response) {
    try {
      const { mesAlvo, anoAlvo } = req.body;

      if (!mesAlvo || !anoAlvo) {
        return res.status(400).json({ error: 'Mês e Ano alvo são obrigatórios.' });
      }

      const dataInicioAlvo = startOfMonth(new Date(Number(anoAlvo), Number(mesAlvo) - 1));
      const dataFimAlvo = endOfMonth(dataInicioAlvo);
      const diasMesAlvo = dataFimAlvo.getDate();

      const escolas = await prisma.escola.findMany({ orderBy: { name: 'asc' } });
      const itensCatalogo = await prisma.item.findMany();
      const demandaEscolaPorItem: Record<string, Record<string, number>> = {};
      
      for (const escola of escolas) {
        demandaEscolaPorItem[escola.id] = {};
        const cardapiosAlvo = await prisma.cardapio.findMany({
          where: { data_agendada: { gte: dataInicioAlvo, lte: dataFimAlvo }, isFeriado: false, tipos_escola: { has: escola.type } }
        });

        for (const cardapio of cardapiosAlvo) {
          if (!cardapio.fichaTecnicaId) continue;
          const preparo = await prisma.preparoEscola.findUnique({
            where: { escolaId_fichaTecnicaId: { escolaId: escola.id, fichaTecnicaId: cardapio.fichaTecnicaId } },
            include: { ingredientes: true }
          });
          if (preparo) {
            preparo.ingredientes.forEach(ing => {
              demandaEscolaPorItem[escola.id][ing.itemId] = (demandaEscolaPorItem[escola.id][ing.itemId] || 0) + ing.quantidade;
            });
          }
        }

        const consumosFixos = await prisma.consumoFixo.findMany({ where: { escolaId: escola.id } });
        consumosFixos.forEach(cf => {
          const diasLetivos = diasMesAlvo;
          let quantidadeTotal = 0;
          if (cf.frequencia === 'SEMANAL') {
            const semanas = Math.ceil(diasLetivos / 5);
            quantidadeTotal = cf.quantidadeDiaria * semanas;
          } else {
            quantidadeTotal = cf.quantidadeDiaria * diasLetivos;
          }
          demandaEscolaPorItem[escola.id][cf.itemId] = (demandaEscolaPorItem[escola.id][cf.itemId] || 0) + quantidadeTotal;
        });
      }

      const itensOrdenados = [...itensCatalogo].sort((a, b) => a.name.localeCompare(b.name));

      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Pedido Mensal Consolidado', {
        pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, printTitlesColumn: 'A:A' }
      });

      const columns = [
        { header: 'Unidade Escolar', key: 'escola', width: 30 },
        ...itensOrdenados.map(item => ({ header: `${item.name}\n(${item.baseUnit || 'UN'})`, key: item.id, width: 14 })),
        { header: 'Assinatura do Supervisor', key: 'assinatura', width: 35 }
      ];
      sheet.columns = columns;

      sheet.getRow(1).eachCell((cell) => {
        cell.font = { bold: true, size: 9 };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      });
      sheet.getRow(1).height = 45;

      escolas.forEach(escola => {
        const rowData: any = { escola: escola.name };
        itensOrdenados.forEach(item => {
          const qtd = demandaEscolaPorItem[escola.id][item.id] || 0;
          rowData[item.id] = qtd > 0 ? Math.ceil(qtd) : '';
        });
        rowData['assinatura'] = '';
        
        const row = sheet.addRow(rowData);
        row.height = 25;
        row.eachCell((cell, colNumber) => {
          cell.font = { size: 9 };
          cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
          if (colNumber === 1) cell.alignment = { horizontal: 'left', vertical: 'middle' };
          else cell.alignment = { horizontal: 'center', vertical: 'middle' };
        });
      });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=Pedido_Consolidado_${mesAlvo}_${anoAlvo}.xlsx`);
      
      await workbook.xlsx.write(res);
      return res.end();
    } catch (error: any) {
      console.error('Erro na exportacao de excel:', error);
      return res.status(500).json({ error: 'Erro interno ao exportar excel.' });
    }
  }
}
