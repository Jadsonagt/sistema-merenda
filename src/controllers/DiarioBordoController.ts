import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { calcularDistanciaOSRM } from '../utils/osrm.js';
import { calcularDistanciaHaversine } from '../utils/geo.js';


export class DiarioBordoController {
  async salvar(req: Request, res: Response) {
    try {
      const { data, kmTotal, trechos } = req.body;
      const usuarioId = req.user?.id;

      if (!usuarioId) {
        return res.status(401).json({ error: 'Usuário não autenticado.' });
      }

      const novaData = new Date(data);
      novaData.setUTCHours(12, 0, 0, 0);

      const diario = await prisma.$transaction(async (tx) => {
        const diarioExistente = await tx.diarioBordo.findUnique({
          where: { usuarioId_data: { usuarioId, data: novaData } }
        });

        if (diarioExistente) {
          await tx.trechoViagem.deleteMany({ where: { diarioId: diarioExistente.id } });
        }

        const d = await tx.diarioBordo.upsert({
          where: { usuarioId_data: { usuarioId, data: novaData } },
          update: {
            kmTotal: Number(kmTotal),
            odometroInicial: Number(req.body.odometroInicial) || 0,
            trechos: {
              create: trechos.map((t: any, index: number) => ({
                ordem: index + 1,
                pontoNome: t.pontoNome,
                kmTrecho: Number(t.kmTrecho)
              }))
            }
          },
          create: {
            usuarioId,
            data: novaData,
            kmTotal: Number(kmTotal),
            odometroInicial: Number(req.body.odometroInicial) || 0,
            trechos: {
              create: trechos.map((t: any, index: number) => ({
                ordem: index + 1,
                pontoNome: t.pontoNome,
                kmTrecho: Number(t.kmTrecho)
              }))
            }
          },
          include: { trechos: true }
        });
        return d;
      });

      return res.status(200).json(diario);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao salvar diário de bordo.' });
    }
  }

  async listar(req: Request, res: Response) {
    try {
      const { inicio, fim } = req.query;
      const usuarioId = req.user?.id;

      if (!usuarioId) {
        return res.status(401).json({ error: 'Usuário não autenticado.' });
      }

      const where: any = { usuarioId };

      if (inicio && fim) {
        where.data = {
          gte: new Date(inicio as string),
          lte: new Date(fim as string)
        };
      }

      const diarios = await prisma.diarioBordo.findMany({
        where,
        include: { 
          trechos: {
            orderBy: { ordem: 'asc' }
          }
        },
        orderBy: { data: 'asc' }
      });
      return res.status(200).json(diarios);
    } catch (error) {
      console.error('Erro ao listar diários:', error);
      return res.status(500).json({ error: 'Erro ao listar diários de bordo.' });
    }
  }

  async calcularDistancia(req: Request, res: Response) {
    try {
      const { origemId, destinoId } = req.body;
      const usuarioId = req.user?.id;

      if (!origemId || !destinoId) {
        return res.status(400).json({ error: 'ID de origem e destino são obrigatórios.' });
      }

      // 1. Tentar buscar na tabela de Distância de Referência (Matriz de Distâncias do Município)
      const distRef = await prisma.distanciaReferencia.findFirst({
        where: {
          OR: [
            { origemId, destinoId },
            { origemId: destinoId, destinoId: origemId } // Bidirecional
          ]
        }
      });

      if (distRef) {
        return res.status(200).json({ km: distRef.quilometros });
      }

      const getCoords = async (id: string) => {
        // 1. Tratamento da Residência
        if (id === 'RESIDENCIA_ME') {
          const user = await prisma.usuario.findUnique({ where: { id: usuarioId } });
          if (user?.latitudeResidencial && user?.longitudeResidencial) {
            return { lat: user.latitudeResidencial, lng: user.longitudeResidencial };
          }
          return null;
        }

        // 2. Tratamento do Bug de Rota Salva (Legacy - Busca por Nome)
        if (id.startsWith('LEGACY_')) {
          const nomeEscola = id.replace('LEGACY_', '');
          const escola = await prisma.escola.findFirst({ where: { name: nomeEscola } });
          if (escola?.latitude && escola?.longitude) return { lat: escola.latitude, lng: escola.longitude };
          return null;
        }

        // 3. Tratamento de Escolas e Pontos de Interesse (Manual ou ID)
        // Tentamos buscar como UUID em Escola
        try {
          const escola = await prisma.escola.findUnique({ where: { id } });
          if (escola?.latitude && escola?.longitude) return { lat: escola.latitude, lng: escola.longitude };
        } catch (e) { /* ignore */ }

        // Se não for escola, tentamos buscar como Ponto de Interesse (Apoio/Manual)
        try {
          const ponto = await prisma.pontoInteresse.findUnique({ where: { id } });
          if (ponto?.latitude && ponto?.longitude) return { lat: ponto.latitude, lng: ponto.longitude };
        } catch (e) { /* ignore */ }

        return null;
      };

      const coordsOrigem = await getCoords(origemId);
      const coordsDestino = await getCoords(destinoId);

      if (!coordsOrigem || !coordsDestino) {
        // Se não há coordenadas, retorna 0 para permitir preenchimento manual no front
        return res.status(200).json({ km: 0 });
      }

      // 4. Tentar cálculo via OSRM (Roteamento por ruas)
      let km = await calcularDistanciaOSRM(coordsOrigem, coordsDestino);

      // 5. Fallback: Se OSRM retornar 0 (falha ou fora de rota), calcular Haversine (Linha Reta + Margem)
      if (km === 0) {
        km = calcularDistanciaHaversine(
          coordsOrigem.lat, coordsOrigem.lng,
          coordsDestino.lat, coordsDestino.lng
        );
      }

      return res.status(200).json({ km });
    } catch (error: any) {
      console.error('[DiarioBordo] Erro fatal no cálculo:', error);
      return res.status(500).json({ error: 'Erro interno ao calcular distância no servidor.' });
    }
  }

  async excluir(req: Request, res: Response) {
    try {
      const { data } = req.query;
      const usuarioId = req.user?.id;

      if (!usuarioId) return res.status(401).json({ error: 'Usuário não autenticado.' });
      if (!data) return res.status(400).json({ error: 'A data é obrigatória para exclusão.' });

      const dataAlvo = new Date(data as string);
      dataAlvo.setUTCHours(12, 0, 0, 0); // Mesmo fuso usado na criação

      const diario = await prisma.diarioBordo.findUnique({
        where: { usuarioId_data: { usuarioId, data: dataAlvo } }
      });

      if (!diario) {
        return res.status(404).json({ error: 'Roteiro não encontrado para esta data.' });
      }

      // Transação para garantir deleção dos trechos e do diário sem quebrar chave estrangeira
      await prisma.$transaction([
        prisma.trechoViagem.deleteMany({ where: { diarioId: diario.id } }),
        prisma.diarioBordo.delete({ where: { id: diario.id } })
      ]);

      return res.status(200).json({ message: 'Roteiro excluído com sucesso.' });
    } catch (error) {
      console.error('[DiarioBordo] Erro ao excluir:', error);
      return res.status(500).json({ error: 'Erro interno ao excluir roteiro.' });
    }
  }
}

export class PontoInteresseController {
  async listar(req: Request, res: Response) {
    try {
      const pontos = await prisma.pontoInteresse.findMany({
        orderBy: { nome: 'asc' }
      });
      return res.status(200).json(pontos);
    } catch (error) {
      return res.status(500).json({ error: 'Erro ao listar pontos de interesse.' });
    }
  }

  async criar(req: Request, res: Response) {
    try {
      const { nome, endereco, tipo } = req.body;
      const ponto = await prisma.pontoInteresse.create({
        data: { nome, endereco, tipo }
      });
      return res.status(201).json(ponto);
    } catch (error) {
      return res.status(500).json({ error: 'Erro ao criar ponto de interesse.' });
    }
  }

  async excluir(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      await prisma.pontoInteresse.delete({ where: { id } });
      return res.status(200).json({ message: 'Ponto de interesse excluído.' });
    } catch (error) {
      return res.status(500).json({ error: 'Erro ao excluir ponto.' });
    }
  }
}
