import { api } from '../api';

export interface Escola {
  id: string;
  name: string;
  type: string;
  rotaId: string;
}

export const getEscolas = async (): Promise<Escola[]> => {
  const response = await api.get('/escolas');
  return response.data;
};

export const createEscola = async (data: { name: string; type: string; rota_id: string }): Promise<Escola> => {
  const response = await api.post('/escolas', data);
  return response.data;
};

export const updateEscola = async (id: string, data: { name: string; type: string; rota_id: string }): Promise<Escola> => {
  const response = await api.put(`/escolas/${id}`, data);
  return response.data;
};

export const deleteEscola = async (id: string): Promise<void> => {
  await api.delete(`/escolas/${id}`);
};
