import { api } from '../api';

const getHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    headers: {
      Authorization: `Bearer ${token}`
    }
  };
};

export const getPendenciasProcessamento = async (): Promise<string[]> => {
  const response = await api.get('/pendencias-processamento', getHeaders());
  return response.data;
};
