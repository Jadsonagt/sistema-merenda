import { api } from '../api';

export interface Item {
  id: string;
  name: string;
}

const getHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    headers: {
      Authorization: `Bearer ${token}`
    }
  };
};

export const getItems = async (): Promise<Item[]> => {
  const response = await api.get('/items', getHeaders());
  return response.data;
};
