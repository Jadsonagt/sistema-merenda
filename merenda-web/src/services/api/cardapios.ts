import { api } from '../api';

export interface CardapioRefeicao {
  id: string;
  cardapioId: string;
  fichaTecnicaId: string;
  tipo_refeicao: string;
  fichaTecnica?: { id: string; name: string; type?: string };
}

export interface Cardapio {
  id: string;
  data_agendada: string;
  descricao?: string;
  isFeriado?: boolean;
  is_feriado?: boolean;
  tipos_escola?: string[];
  refeicoes?: CardapioRefeicao[];
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
  refeicoes?: { fichaTecnicaId: string; tipo_refeicao: string }[]; 
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
    refeicoes: { fichaTecnicaId: string; tipo_refeicao: string }[];
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

