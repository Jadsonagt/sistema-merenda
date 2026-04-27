import { Request, Response } from 'express';
import { DashboardService } from '../services/dashboard.service.js';

export class DashboardController {
  async getDashboard(req: Request, res: Response): Promise<void> {
    try {
      const dashboardService = new DashboardService();
      const dados = await dashboardService.getResumoDashboard();
      
      res.status(200).json(dados);
    } catch (error) {
      console.error('Erro ao buscar resumo do dashboard:', error);
      res.status(500).json({ error: 'Erro interno ao buscar dados do dashboard' });
    }
  }
}
