import { api } from '../api';

export interface ConsumoFixoData {
  escolaId: string;
  itemId: string;
  quantidade: string | number;
}

const getHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    headers: {
      Authorization: `Bearer ${token}`
    }
  };
};

export const createConsumoFixo = async (data: ConsumoFixoData) => {
  const payload = {
    escolaId: data.escolaId,
    itemId: data.itemId,
    quantidade: Math.floor(Number(data.quantidade))
  };
  
  console.log("Enviando Consumo Fixo:", payload);

  const response = await api.post('/consumo-fixo', payload, getHeaders());
  return response.data;
};
export interface ConsumoRetorno {
  id: string;
  escolaId: string;
  itemId: string;
  quantidade: number;
  escola: { name: string };
  item: { name: string };
}

export const getConsumos = async (): Promise<ConsumoRetorno[]> => {
  const response = await api.get('/consumos', getHeaders());
  return response.data;
};

export const updateConsumoFixo = async (id: string, quantidade: number) => {
  const response = await api.put(`/consumos/${id}`, { quantidade: Math.floor(Number(quantidade)) }, getHeaders());
  return response.data;
};
