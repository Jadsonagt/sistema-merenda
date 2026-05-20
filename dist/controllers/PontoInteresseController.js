import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
export class PontoInteresseController {
    async index(req, res) {
        try {
            const pontos = await prisma.pontoInteresse.findMany({
                orderBy: { nome: 'asc' },
            });
            return res.json(pontos);
        }
        catch (error) {
            console.error(error);
            return res.status(500).json({ error: 'Erro ao listar pontos de interesse' });
        }
    }
    async store(req, res) {
        try {
            const { nome, endereco, tipo, latitude, longitude } = req.body;
            if (!nome || !tipo) {
                return res.status(400).json({ error: 'Nome e Tipo são obrigatórios' });
            }
            const ponto = await prisma.pontoInteresse.create({
                data: {
                    nome,
                    endereco,
                    tipo,
                    latitude: latitude ? parseFloat(latitude) : null,
                    longitude: longitude ? parseFloat(longitude) : null,
                },
            });
            return res.status(201).json(ponto);
        }
        catch (error) {
            console.error(error);
            return res.status(500).json({ error: 'Erro ao criar ponto de interesse' });
        }
    }
    async update(req, res) {
        try {
            const { id } = req.params;
            const { nome, endereco, tipo, latitude, longitude } = req.body;
            const ponto = await prisma.pontoInteresse.update({
                where: { id: String(id) },
                data: {
                    nome,
                    endereco,
                    tipo,
                    latitude: latitude ? parseFloat(latitude) : null,
                    longitude: longitude ? parseFloat(longitude) : null,
                },
            });
            return res.json(ponto);
        }
        catch (error) {
            console.error(error);
            return res.status(500).json({ error: 'Erro ao atualizar ponto de interesse' });
        }
    }
    async delete(req, res) {
        try {
            const { id } = req.params;
            await prisma.pontoInteresse.delete({ where: { id: String(id) } });
            return res.status(204).send();
        }
        catch (error) {
            console.error(error);
            return res.status(500).json({ error: 'Erro ao deletar ponto de interesse' });
        }
    }
}
