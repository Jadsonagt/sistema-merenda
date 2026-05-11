import { api } from '../api';

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  role: string;
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

export const getUsuarios = async (): Promise<Usuario[]> => {
  const response = await api.get('/usuarios', getHeaders());
  return response.data;
};

export const createUsuario = async (data: Partial<Usuario> & { senha?: string }): Promise<Usuario> => {
  const response = await api.post('/usuarios', data, getHeaders());
  return response.data;
};

export const updateUsuario = async (id: string, data: Partial<Usuario> & { senha?: string }): Promise<Usuario> => {
  const response = await api.put(`/usuarios/${id}`, data, getHeaders());
  return response.data;
};

export const deleteUsuario = async (id: string): Promise<void> => {
  await api.delete(`/usuarios/${id}`, getHeaders());
};
