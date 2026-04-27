import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import { specs } from './config/swagger.js';
import { authRoutes } from './routes/authRoutes.js';
import { itemRoutes } from './routes/item.routes.js';
import { rotaRoutes } from './routes/rota.routes.js';
import { escolaRoutes } from './routes/escola.routes.js';
import { fichaRoutes } from './routes/ficha.routes.js';
import { estoqueRoutes } from './routes/estoque.routes.js';
import { metaRoutes } from './routes/meta.routes.js';
import { consumoRoutes } from './routes/consumo.routes.js';
import { cardapioRoutes } from './routes/cardapio.routes.js';
import { consumoFixoRoutes } from './routes/consumoFixo.routes.js';
import { auditoriaRoutes } from './routes/auditoriaRoutes.js';
import { dashboardRoutes } from './routes/dashboard.routes.js';
import { preparoRoutes } from './routes/preparo.routes.js';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Rotas da Documentação
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

// Rotas públicas
app.use('/api/auth', authRoutes);

// Rotas do sistema
app.use('/api/items', itemRoutes);
app.use('/api/rotas', rotaRoutes);
app.use('/api/escolas', escolaRoutes);
app.use('/api/fichas', fichaRoutes);
app.use('/api', estoqueRoutes);
app.use('/api/metas', metaRoutes);
app.use('/api/consumos', consumoRoutes);
app.use('/api/cardapios', cardapioRoutes);
app.use('/api/consumo-fixo', consumoFixoRoutes);
app.use('/api/auditoria', auditoriaRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/escolas', preparoRoutes);

// Middleware Global de Tratamento de Erros
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

export { app };
