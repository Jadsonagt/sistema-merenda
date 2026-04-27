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
  date: string; 
  fichaId?: string; 
  is_feriado: boolean; 
  tipos_escola: string[] 
}): Promise<Cardapio> => {
  const payload = {
    data_agendada: `${data.date}T12:00:00.000Z`,
    ficha_tecnica_id: data.is_feriado ? undefined : data.fichaId,
    tipos_escola: data.tipos_escola,
    isFeriado: data.is_feriado, // Enviando as chaves necessárias para suportar a API de forma resiliente
    is_feriado: data.is_feriado 
  };
  const response = await api.post('/cardapios', payload, getHeaders());
  return response.data;
};

export const updateCardapio = async (
  id: string,
  data: {
    data_agendada: string;
    descricao?: string;
    ficha_tecnica_id?: string | null;
    tipos_escola: string[];
    isFeriado: boolean;
  }
): Promise<Cardapio> => {
  const response = await api.put(`/cardapios/${id}`, data, getHeaders());
  return response.data;
};

export const deleteCardapio = async (id: string): Promise<void> => {
  await api.delete(`/cardapios/${id}`, getHeaders());
};

