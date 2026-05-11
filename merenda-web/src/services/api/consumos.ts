import { api } from '../api';

export interface ConsumoFixo {
  id: string;
  escolaId: string;
  itemId: string;
  quantidadeDiaria: number;
  item: {
    id: string;
    name: string;
    baseUnit: string;
  };
}

const getHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    headers: {
      Authorization: `Bearer ${token}`
    }
  };
};

export const getConsumosFixosByEscola = async (escolaId: string): Promise<ConsumoFixo[]> => {
  const response = await api.get(`/escolas/${escolaId}/consumo-fixo`, getHeaders());
  return response.data;
};

export const saveConsumoFixo = async (escolaId: string, data: { itemId: string; quantidadeDiaria: number }) => {
  const response = await api.post(`/escolas/${escolaId}/consumo-fixo`, data, getHeaders());
  return response.data;
};

export const deleteConsumoFixo = async (id: string) => {
  const response = await api.delete(`/consumo-fixo/${id}`, getHeaders());
  return response.data;
};
