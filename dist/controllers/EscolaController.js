import { prisma } from '../lib/prisma.js';
export class EscolaController {
    /**
     * @swagger
     * /api/escolas:
     *   post:
     *     summary: Cadastra uma nova escola na rede
     *     tags: [Gestão de Rede]
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
     *               - rota_id
     *             properties:
     *               name:
     *                 type: string
     *               type:
     *                 type: string
     *                 description: Tipo da escola (Integral/Parcial)
     *               rota_id:
     *                 type: string
     *                 description: ID da rota vinculada (Obrigatório)
     *               endereco:
     *                 type: string
     *               latitude:
     *                 type: number
     *               longitude:
     *                 type: number
     *     responses:
     *       201:
     *         description: Escola criada com sucesso
     *       400:
     *         description: Campos obrigatórios ausentes
     *       404:
     *         description: Rota não encontrada
     */
    async create(req, res) {
        console.log('[DEBUG] POST /api/escolas body:', req.body);
        try {
            const { name, type, endereco, latitude, longitude, rota_id } = req.body;
            if (!name || !type || !rota_id) {
                return res.status(400).json({ error: 'Missing required fields: name, type, rota_id' });
            }
            const rotaExists = await prisma.rota.findUnique({
                where: { id: rota_id },
            });
            if (!rotaExists) {
                return res.status(404).json({ error: 'Rota not found' });
            }
            const escola = await prisma.escola.create({
                data: {
                    name,
                    type,
                    endereco,
                    latitude: latitude ? Number(latitude) : null,
                    longitude: longitude ? Number(longitude) : null,
                    rotaId: rota_id,
                },
            });
            return res.status(201).json(escola);
        }
        catch (error) {
            console.error('Error creating escola:', error);
            return res.status(500).json({ error: 'Internal server error while creating escola' });
        }
    }
    async listByRota(req, res) {
        try {
            const { rota_id } = req.params;
            const escolas = await prisma.escola.findMany({
                where: { rotaId: String(rota_id) },
                orderBy: { name: 'asc' },
            });
            return res.status(200).json(escolas);
        }
        catch (error) {
            console.error('Error listing escolas by rota:', error);
            return res.status(500).json({ error: 'Internal server error while listing escolas' });
        }
    }
    /**
     * @swagger
     * /api/escolas:
     *   get:
     *     summary: Lista todas as escolas da rede
     *     tags: [Gestão de Rede]
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: Lista de escolas retornada com sucesso
     */
    async list(req, res) {
        try {
            const escolas = await prisma.escola.findMany({
                orderBy: { name: 'asc' },
            });
            return res.status(200).json(escolas);
        }
        catch (error) {
            console.error('Error listing escolas:', error);
            return res.status(500).json({ error: 'Internal server error while listing escolas' });
        }
    }
    async update(req, res) {
        console.log('[DEBUG] PUT /api/escolas body:', req.body);
        try {
            const { id } = req.params;
            const { name, type, endereco, latitude, longitude, rota_id } = req.body;
            if (!name || !type || !rota_id) {
                return res.status(400).json({ error: 'Missing required fields: name, type, rota_id' });
            }
            const rotaExists = await prisma.rota.findUnique({
                where: { id: rota_id },
            });
            if (!rotaExists) {
                return res.status(404).json({ error: 'Rota not found' });
            }
            const escola = await prisma.escola.update({
                where: { id: String(id) },
                data: {
                    name,
                    type,
                    endereco,
                    latitude: latitude ? Number(latitude) : null,
                    longitude: longitude ? Number(longitude) : null,
                    rotaId: String(rota_id),
                },
            });
            return res.status(200).json(escola);
        }
        catch (error) {
            console.error('Error updating escola:', error);
            return res.status(500).json({ error: 'Internal server error while updating escola' });
        }
    }
    async delete(req, res) {
        try {
            const { id } = req.params;
            await prisma.escola.delete({
                where: { id: String(id) },
            });
            return res.status(200).json({ message: 'Escola excluída com sucesso.' });
        }
        catch (error) {
            console.error('Error deleting escola:', error);
            if (error.code === 'P2003') {
                return res.status(400).json({ error: 'Não é possível excluir esta escola pois ela já possui histórico de estoque, metas ou consumos vinculados.' });
            }
            return res.status(500).json({ error: 'Internal server error while deleting escola' });
        }
    }
    /**
     * Retorna todas as escolas agrupadas por "minha rota" e "outras rotas" para o Diário de Bordo
     */
    async listarParaDiarioBordo(req, res) {
        try {
            // @ts-ignore
            const usuarioId = req.user?.id;
            if (!usuarioId)
                return res.status(401).json({ error: 'Usuário não autenticado.' });
            // Busca o usuário no banco para garantir que temos o rotaId atualizado
            const usuario = await prisma.usuario.findUnique({
                where: { id: usuarioId },
                select: { rotaId: true }
            });
            const usuarioRotaId = usuario?.rotaId;
            // Busca todas as escolas com suas rotas
            const todasEscolas = await prisma.escola.findMany({
                include: { rota: true },
                orderBy: { name: 'asc' }
            });
            // Separação em dois grupos conforme solicitado pelo negócio
            const minhaRota = todasEscolas.filter(e => e.rotaId === usuarioRotaId);
            const outrasRotas = todasEscolas.filter(e => e.rotaId !== usuarioRotaId);
            return res.status(200).json({ minhaRota, outrasRotas });
        }
        catch (error) {
            console.error('Erro ao listar escolas agrupadas para Diário de Bordo:', error);
            return res.status(500).json({ error: 'Erro interno ao buscar escolas agrupadas.' });
        }
    }
}
