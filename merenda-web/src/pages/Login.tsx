import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { LogIn } from 'lucide-react';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const response = await api.post('/auth/login', { email, senha });
      const { token, usuario } = response.data;
      
      // Limpeza de cache/sessão antiga
      localStorage.clear();
      
      localStorage.setItem('token', token);
      localStorage.setItem('usuario', JSON.stringify(usuario));
      
      console.log("Sessão Gravada com Sucesso:", localStorage.getItem('usuario'));
      
      navigate('/dashboard');
    } catch (err: any) {
      if (err.response?.status === 401) {
        setError('E-mail ou senha incorretos.');
      } else {
        setError('Erro ao realizar o login. Tente novamente mais tarde.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md shadow-2xl border-none animate-in fade-in zoom-in duration-500">
        <CardHeader className="space-y-4 text-center pb-8">
          <div className="mx-auto bg-blue-600 h-12 w-12 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
             <LogIn className="text-white h-6 w-6" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-slate-900">Merenda Pro</CardTitle>
            <CardDescription className="text-slate-500 font-medium">Gestão inteligente de alimentação escolar</CardDescription>
          </div>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-700 font-semibold ml-1">E-mail</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="exemplo@merenda.gov.br" 
                className="h-11 border-slate-200 focus:ring-2 focus:ring-blue-500/20 transition-all rounded-lg"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="senha" className="text-slate-700 font-semibold ml-1">Senha</Label>
              <Input 
                id="senha" 
                type="password" 
                placeholder="••••••••"
                className="h-11 border-slate-200 focus:ring-2 focus:ring-blue-500/20 transition-all rounded-lg"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
              />
            </div>
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-medium border border-red-100 animate-in fade-in slide-in-from-top-1">
                {error}
              </div>
            )}
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full h-11 text-md font-bold bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all rounded-lg" disabled={loading}>
              {loading ? 'Acessando...' : 'Entrar no Sistema'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};
