import { prisma } from '../lib/prisma.js';
export class CardapioController {
    async criar(req, res) {
        try {
            const { data_agendada, descricao, ficha_tecnica_id, tipos_escola, isFeriado } = req.body;
            if (!data_agendada || !tipos_escola || !Array.isArray(tipos_escola) || tipos_escola.length === 0) {
                return res.status(400).json({ error: 'Campos obrigatorios ausentes: data_agendada, tipos_escola (Array de strings obrigatório)' });
            }
            const feriadoBool = Boolean(isFeriado);
            if (!feriadoBool && !ficha_tecnica_id) {
                return res.status(400).json({ error: 'Campo ficha_tecnica_id obrigatorio se nao for feriado.' });
            }
            // Converte a string de data ("YYYY-MM-DD") para o objeto Date do Prisma
            const dataServico = new Date(data_agendada);
            if (isNaN(dataServico.getTime())) {
                return res.status(400).json({ error: 'Invalid data_agendada format. Use ISO format or YYYY-MM-DD.' });
            }
            const cardapio = await prisma.cardapio.create({
                data: {
                    data_agendada: dataServico,
                    descricao: descricao || null,
                    isFeriado: feriadoBool,
                    tipos_escola: tipos_escola,
                    fichaTecnicaId: feriadoBool ? null : ficha_tecnica_id,
                },
            });
            return res.status(201).json(cardapio);
        }
        catch (error) {
            console.error('Error creating cardapio:', error);
            return res.status(500).json({ error: 'Internal server error while creating cardapio' });
        }
    }
    async listar(req, res) {
        try {
            const { mes, ano } = req.query;
            // Determina o mês/ano alvo (padrão: mês atual)
            const now = new Date();
            const targetMonth = mes ? Number(mes) : now.getMonth() + 1; // 1-12
            const targetYear = ano ? Number(ano) : now.getFullYear();
            if (targetMonth < 1 || targetMonth > 12 || isNaN(targetMonth) || isNaN(targetYear)) {
                return res.status(400).json({ error: 'Parâmetros mes (1-12) e ano inválidos.' });
            }
            // Primeiro dia do mês às 00:00 UTC
            const startOfMonth = new Date(Date.UTC(targetYear, targetMonth - 1, 1, 0, 0, 0, 0));
            // Último dia do mês às 23:59:59 UTC
            const endOfMonth = new Date(Date.UTC(targetYear, targetMonth, 0, 23, 59, 59, 999));
            const cardapios = await prisma.cardapio.findMany({
                where: {
                    data_agendada: {
                        gte: startOfMonth,
                        lte: endOfMonth,
                    },
                },
                include: {
                    ficha: true,
                },
                orderBy: {
                    data_agendada: 'asc',
                },
            });
            return res.status(200).json(cardapios);
        }
        catch (error) {
            console.error('Error listing cardapios:', error);
            return res.status(500).json({ error: 'Internal server error while listing cardapios' });
        }
    }
    async listarPorData(req, res) {
        try {
            const { data } = req.params;
            if (!data) {
                return res.status(400).json({ error: 'Missing required date parameter' });
            }
            const queryDate = new Date(data);
            if (isNaN(queryDate.getTime())) {
                return res.status(400).json({ error: 'Invalid date parameter format. Use YYYY-MM-DD.' });
            }
            // Tratativa de Timezone/Horário para abranger o dia especificado inteiro
            const startOfDay = new Date(queryDate.setUTCHours(0, 0, 0, 0));
            const endOfDay = new Date(queryDate.setUTCHours(23, 59, 59, 999));
            const cardapios = await prisma.cardapio.findMany({
                where: {
                    data_agendada: {
                        gte: startOfDay,
                        lte: endOfDay,
                    },
                },
                // O relation name no schema foi nomeado 'ficha', caso nomeie 'fichaTecnica', ajuste este campo!
                include: {
                    ficha: true,
                },
            });
            return res.status(200).json(cardapios);
        }
        catch (error) {
            console.error('Error listing cardapios by date:', error);
            return res.status(500).json({ error: 'Internal server error while listing cardapios' });
        }
    }
    async atualizar(req, res) {
        try {
            const { id } = req.params;
            const { data_agendada, descricao, ficha_tecnica_id, tipos_escola, isFeriado } = req.body;
            if (!data_agendada || !tipos_escola || !Array.isArray(tipos_escola) || tipos_escola.length === 0) {
                return res.status(400).json({ error: 'Campos obrigatórios ausentes: data_agendada, tipos_escola' });
            }
            const feriadoBool = Boolean(isFeriado);
            if (!feriadoBool && !ficha_tecnica_id) {
                return res.status(400).json({ error: 'Campo ficha_tecnica_id obrigatório se não for feriado.' });
            }
            const dataServico = new Date(data_agendada);
            if (isNaN(dataServico.getTime())) {
                return res.status(400).json({ error: 'Invalid data_agendada format. Use ISO format or YYYY-MM-DD.' });
            }
            const cardapio = await prisma.cardapio.update({
                where: { id: String(id) },
                data: {
                    data_agendada: dataServico,
                    descricao: descricao || null,
                    isFeriado: feriadoBool,
                    tipos_escola: tipos_escola,
                    fichaTecnicaId: feriadoBool ? null : ficha_tecnica_id,
                },
                include: { ficha: true },
            });
            return res.status(200).json(cardapio);
        }
        catch (error) {
            console.error('Error updating cardapio:', error);
            return res.status(500).json({ error: 'Internal server error while updating cardapio' });
        }
    }
    async excluir(req, res) {
        try {
            const { id } = req.params;
            const cardapio = await prisma.cardapio.findUnique({
                where: { id: String(id) }
            });
            if (!cardapio) {
                return res.status(404).json({ error: 'Cardápio não encontrado.' });
            }
            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0);
            if (cardapio.data_agendada < hoje) {
                return res.status(403).json({
                    error: 'Não é possível excluir um cardápio de uma data passada. O estoque deste dia já foi consolidado. Para corrigir saldos, utilize a tela de Ajuste de Estoque.'
                });
            }
            await prisma.cardapio.delete({
                where: { id: String(id) },
            });
            return res.status(200).json({ message: 'Cardápio excluído com sucesso.' });
        }
        catch (error) {
            console.error('Error deleting cardapio:', error);
            return res.status(500).json({ error: 'Internal server error while deleting cardapio' });
        }
    }
}
