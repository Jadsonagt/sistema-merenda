import { api } from '../api';

export interface MetaData {
  escolaId: string;
  fichaId: string;
  quantidade: number;
}

const getHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    headers: {
      Authorization: `Bearer ${token}`
    }
  };
};

export const createMeta = async (data: MetaData) => {
  const payload = {
    escolaId: data.escolaId,
    fichaId: data.fichaId,
    quantidadePadrao: Number(data.quantidade)
  };
  
  const response = await api.post('/metas', payload, getHeaders());
  return response.data;
};
export interface MetaRetorno {
  id: string;
  escolaId: string;
  fichaId: string;
  quantidadePadrao: number;
  escola: { name: string };
  ficha: { name: string };
}

export const getMetas = async (): Promise<MetaRetorno[]> => {
  const response = await api.get('/metas', getHeaders());
  return response.data;
};

export const updateMeta = async (id: string, quantidadePadrao: number) => {
  const response = await api.put(`/metas/${id}`, { quantidadePadrao: Number(quantidadePadrao) }, getHeaders());
  return response.data;
};
