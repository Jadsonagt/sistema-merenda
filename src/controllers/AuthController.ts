import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../lib/prisma.js';
import { Role } from '@prisma/client';

export class AuthController {
  async registrar(req: Request, res: Response) {
    try {
      const { nome, email, senha, role } = req.body;

      if (!nome || !email || !senha) {
        return res.status(400).json({ error: 'Campos nome, email e senha são obrigatórios' });
      }

      const usuarioExiste = await prisma.usuario.findUnique({
        where: { email },
      });

      if (usuarioExiste) {
        return res.status(400).json({ error: 'Usuário já existe' });
      }

      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(senha, saltRounds);

      const roleEnum = role === 'ADMIN' ? Role.ADMIN : Role.SUPERVISORA;

      const usuario = await prisma.usuario.create({
        data: {
          nome,
          email,
          senha: hashedPassword,
          role: roleEnum,
        },
      });

      return res.status(201).json({
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        role: usuario.role,
      });
    } catch (error) {
      console.error('Erro no registro:', error);
      return res.status(500).json({ error: 'Erro interno de servidor' });
    }
  }

  async login(req: Request, res: Response) {
    try {
      const { email, senha } = req.body;

      if (!email || !senha) {
        return res.status(400).json({ error: 'Email e senha são obrigatórios' });
      }

      const usuario = await prisma.usuario.findUnique({
        where: { email },
      });

      if (!usuario) {
        return res.status(401).json({ error: 'Credenciais inválidas' });
      }

      const senhaValida = await bcrypt.compare(senha, usuario.senha);

      if (!senhaValida) {
        return res.status(401).json({ error: 'Credenciais inválidas' });
      }

      const secret = process.env.JWT_SECRET || '';
      
      const token = jwt.sign(
        { id: usuario.id, role: usuario.role },
        secret,
        { expiresIn: '8h' }
      );

      return res.status(200).json({
        usuario: {
          id: usuario.id,
          nome: usuario.nome,
          email: usuario.email,
          role: usuario.role,
        },
        token,
      });
    } catch (error) {
      console.error('Erro no login:', error);
      return res.status(500).json({ error: 'Erro interno de servidor' });
    }
  }

  async esqueciSenha(req: Request, res: Response) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ error: 'O email é obrigatório' });
      }

      const usuario = await prisma.usuario.findUnique({
        where: { email },
      });

      if (!usuario) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      const token = crypto.randomBytes(20).toString('hex');
      const expires = new Date();
      expires.setHours(expires.getHours() + 1);

      await prisma.usuario.update({
        where: { id: usuario.id },
        data: {
          resetToken: token,
          resetTokenExpires: expires,
        },
      });

      console.log(`[SIMULAÇÃO DE EMAIL] Token de recuperação gerado para ${email}: ${token}`);

      return res.status(200).json({ message: 'Instruções para redefinir senha foram geradas com sucesso!' });
    } catch (error) {
      console.error('Erro no esqueciSenha:', error);
      return res.status(500).json({ error: 'Erro interno de servidor' });
    }
  }

  async resetarSenha(req: Request, res: Response) {
    try {
      const { token, novaSenha } = req.body;

      if (!token || !novaSenha) {
        return res.status(400).json({ error: 'Token e novaSenha são obrigatórios' });
      }

      const usuario = await prisma.usuario.findFirst({
        where: {
          resetToken: token,
          resetTokenExpires: {
            gt: new Date(),
          },
        },
      });

      if (!usuario) {
        return res.status(400).json({ error: 'Token inválido ou expirado' });
      }

      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(novaSenha, saltRounds);

      await prisma.usuario.update({
        where: { id: usuario.id },
        data: {
          senha: hashedPassword,
          resetToken: null,
          resetTokenExpires: null,
        },
      });

      return res.status(200).json({ message: 'Senha redefinida com sucesso' });
    } catch (error) {
      console.error('Erro no resetarSenha:', error);
      return res.status(500).json({ error: 'Erro interno de servidor' });
    }
  }
}
