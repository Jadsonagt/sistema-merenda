import { api } from '../api';

export interface Cardapio {
  id: string;
  data_agendada: string;
  descricao?: string;
  fichaTecnicaId?: string | null;
  ficha_tecnica_id?: string | null;
  ficha?: { id: string; name: string; type?: string };
  isFeriado?: boolean;
  is_feriado?: boolean;
  tipos_escola?: string[];
  fichas_ids?: string[];
  fichas_detalhe?: { id: string; name: string }[];
}

const getHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    headers: {
      Authorization: `Bearer ${token}`
    }
  };
};

export const getCardapios = async (mes?: number, ano?: number): Promise<Cardapio[]> => {
  const params: Record<string, number> = {};
  if (mes) params.mes = mes;
  if (ano) params.ano = ano;
  const response = await api.get('/cardapios', { ...getHeaders(), params });
  return response.data;
};

export const createCardapio = async (data: { 
  data_agendada: string; 
  ficha_tecnica_id?: string | null; 
  isFeriado: boolean; 
  tipos_escola: string[];
}): Promise<Cardapio> => {
  const response = await api.post('/cardapios', data, getHeaders());
  return response.data;
};

export const updateCardapio = async (
  id: string,
  data: {
    data_agendada: string;
    ficha_tecnica_id: string | null;
    tipos_escola: string[];
    is_feriado: boolean;
  }
): Promise<Cardapio> => {
  const payload = {
    ...data,
    isFeriado: data.is_feriado
  };
  const response = await api.put(`/cardapios/${id}`, payload, getHeaders());
  return response.data;
};

export const deleteCardapio = async (id: string): Promise<void> => {
  await api.delete(`/cardapios/${id}`, getHeaders());
};

