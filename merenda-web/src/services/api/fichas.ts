import { api } from '../api';

export interface Ficha {
  id: string;
  name: string;
  type?: string;
  createdAt?: string;
}

const getHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    headers: {
      Authorization: `Bearer ${token}`
    }
  };
};

export const getFichas = async (): Promise<Ficha[]> => {
  const response = await api.get('/fichas', getHeaders());
  return response.data;
};

export const createFicha = async (data: { name: string; type: string }): Promise<Ficha> => {
  const response = await api.post('/fichas', data, getHeaders());
  return response.data;
};

export const updateFicha = async (
  id: string,
  data: { name: string; type: string }
): Promise<Ficha> => {
  const response = await api.put(`/fichas/${id}`, data, getHeaders());
  return response.data;
};

export const deleteFicha = async (id: string): Promise<void> => {
  await api.delete(`/fichas/${id}`, getHeaders());
};
