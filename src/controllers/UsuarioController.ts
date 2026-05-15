import { Request, Response } from 'express';
import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

export class UsuarioController {
  async index(req: Request, res: Response) {
    try {
      const usuarios = await prisma.usuario.findMany({
        select: {
          id: true,
          nome: true,
          email: true,
          role: true,
          rotaId: true,
          rota: {
            select: { id: true, name: true }
          },
          createdAt: true,
        },
        orderBy: { nome: 'asc' },
      });
      return res.json(usuarios);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao listar usuários' });
    }
  }

  async store(req: Request, res: Response) {
    try {
      console.log("Dados recebidos no server (store):", req.body);
      const { nome, email, senha, role, rotaId } = req.body;

      if (!nome || !email || !senha || !role) {
        return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
      }

      const userExists = await prisma.usuario.findUnique({ where: { email } });
      if (userExists) {
        return res.status(400).json({ error: 'E-mail já cadastrado' });
      }

      const passwordHash = await bcrypt.hash(senha, 10);

      const createData = {
        nome,
        email,
        senha: passwordHash,
        role: role as Role,
        rotaId: (rotaId === 'none' || rotaId === '') ? null : (rotaId || null),
      };

      console.log("PRISMA CREATE PAYLOAD:", JSON.stringify(createData, null, 2));

      const usuario = await prisma.usuario.create({
        data: createData,
        select: {
          id: true,
          nome: true,
          email: true,
          role: true,
          rotaId: true,
          rota: {
            select: { id: true, name: true }
          },
        },
      });

      return res.status(201).json(usuario);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao criar usuário' });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { nome, email, senha, role, rotaId } = req.body;

      console.log("UUID da Rota que chegou:", rotaId);

      const updateData: any = {
        nome,
        email,
        role: role as Role,
        rotaId: rotaId === 'none' || !rotaId ? null : rotaId,
      };

      if (senha) {
        updateData.senha = await bcrypt.hash(senha, 10);
      }

      console.log("PRISMA UPDATE PAYLOAD (id=" + id + "):", JSON.stringify(updateData, null, 2));

      const usuario = await prisma.usuario.update({
        where: { id: String(id) },
        data: updateData,
        select: {
          id: true,
          nome: true,
          email: true,
          role: true,
          rotaId: true,
          rota: {
            select: { id: true, name: true }
          },
        },
      });

      return res.json(usuario);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao atualizar usuário' });
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;

      // Evitar que o usuário delete a si mesmo
      if (id === userId) {
        return res.status(400).json({ error: 'Você não pode deletar sua própria conta' });
      }

      await prisma.usuario.delete({ 
        where: { id: String(id) } 
      });

      return res.status(204).send();
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao deletar usuário' });
    }
  }
}
