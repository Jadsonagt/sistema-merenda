import { api } from '../api';

export interface Rota {
  id: string;
  name: string;
  escolas?: { id: string; name: string }[];
}

export const getRotas = async (): Promise<Rota[]> => {
  const response = await api.get('/rotas');
  return response.data;
};

export const createRota = async (data: { name: string }): Promise<Rota> => {
  const response = await api.post('/rotas', data);
  return response.data;
};

export const updateRota = async (id: string, data: { name: string }): Promise<Rota> => {
  const response = await api.put(`/rotas/${id}`, data);
  return response.data;
};

export const deleteRota = async (id: string): Promise<void> => {
  await api.delete(`/rotas/${id}`);
};
