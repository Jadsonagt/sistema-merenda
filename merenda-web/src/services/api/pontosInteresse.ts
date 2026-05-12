import { api } from '../api';

export interface PontoInteresse {
  id: string;
  nome: string;
  endereco: string | null;
  tipo: string;
  latitude: number | null;
  longitude: number | null;
  createdAt?: string;
  updatedAt?: string;
}

const getHeaders = () => {
  const token = localStorage.getItem('token');
  return { headers: { Authorization: `Bearer ${token}` } };
};

export const getPontosInteresse = async (): Promise<PontoInteresse[]> => {
  const response = await api.get('/pontos-interesse', getHeaders());
  return response.data;
};

export const createPontoInteresse = async (data: Partial<PontoInteresse>): Promise<PontoInteresse> => {
  const response = await api.post('/pontos-interesse', data, getHeaders());
  return response.data;
};

export const updatePontoInteresse = async (id: string, data: Partial<PontoInteresse>): Promise<PontoInteresse> => {
  const response = await api.put(`/pontos-interesse/${id}`, data, getHeaders());
  return response.data;
};

export const deletePontoInteresse = async (id: string): Promise<void> => {
  await api.delete(`/pontos-interesse/${id}`, getHeaders());
};
