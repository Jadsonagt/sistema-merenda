import jwt from 'jsonwebtoken';
export function verificarToken(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ error: 'Token não fornecido' });
    }
    const [, token] = authHeader.split(' ');
    try {
        const secret = process.env.JWT_SECRET || '';
        const decoded = jwt.verify(token, secret);
        req.user = {
            id: decoded.id,
            role: decoded.role,
        };
        return next();
    }
    catch (err) {
        return res.status(401).json({ error: 'Token inválido ou expirado' });
    }
}
export function permitirRoles(rolesPermitidas) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(403).json({ error: 'Acesso negado' });
        }
        const roleUsuario = req.user.role.toUpperCase().trim();
        const rolesPermitidasUpper = rolesPermitidas.map(r => r.toUpperCase().trim());
        if (!rolesPermitidasUpper.includes(roleUsuario)) {
            return res.status(403).json({ error: 'Acesso negado' });
        }
        return next();
    };
}
