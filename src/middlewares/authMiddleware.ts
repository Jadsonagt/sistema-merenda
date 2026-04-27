import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

interface TokenPayload {
  id: string;
  role: string;
  iat: number;
  exp: number;
}

export function verificarToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  const [, token] = authHeader.split(' ');

  try {
    const secret = process.env.JWT_SECRET || '';
    const decoded = jwt.verify(token, secret) as TokenPayload;

    req.user = {
      id: decoded.id,
      role: decoded.role,
    };

    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido ou expirado' });
  }
}

export function permitirRoles(rolesPermitidas: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !rolesPermitidas.includes(req.user.role)) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    return next();
  };
}
