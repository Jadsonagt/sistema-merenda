// Build Trigger: 2026-05-15 11:10
import { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Pencil,
  Trash2,
  Key,
  Shield,
  Mail,
  User,
  Route
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  getUsuarios,
  createUsuario,
  updateUsuario,
  deleteUsuario,
  type Usuario
} from '@/services/api/usuarios';
import { api } from '@/services/api';

const ROLES = [
  { value: 'ADMIN', label: 'Administrador' },
  { value: 'SUPERVISORA', label: 'Supervisora' }
];

export const UsuariosPage = () => {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingUsuario, setEditingUsuario] = useState<Usuario | null>(null);
  
  // Form state
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [role, setRole] = useState('');
  const [rotaId, setRotaId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [rotas, setRotas] = useState<any[]>([]);

  const { toast } = useToast();

  useEffect(() => {
    const userStr = localStorage.getItem('usuario');
    const user = JSON.parse(userStr || '{}');
    setCurrentUser(user);
    console.log('--- DEBUG USUARIOS ---');
    console.log('LocalStorage "usuario":', userStr);
    console.log('Current User Role:', user?.role);
    console.log('----------------------');
    fetchUsuarios();
  }, []);

  const fetchUsuarios = async () => {
    setLoading(true);
    try {
      const [usersData, rotasRes] = await Promise.all([
        getUsuarios(),
        api.get('/rotas')
      ]);
      setUsuarios(usersData);
      setRotas(rotasRes.data || []);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível carregar a lista de usuários.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (usuario?: Usuario) => {
    if (usuario) {
      setEditingUsuario(usuario);
      setNome(usuario.nome);
      setEmail(usuario.email);
      setRole(usuario.role);
      setRotaId(usuario.rotaId || 'none');
      setSenha(''); // Senha vazia ao editar (opcional)
    } else {
      setEditingUsuario(null);
      setNome('');
      setEmail('');
      setRole('SUPERVISORA');
      setRotaId('none');
      setSenha('');
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload = { 
        nome, 
        email, 
        role, 
        senha: senha || undefined,
        rotaId: (rotaId === 'none' || rotaId === '') ? null : rotaId 
      };
      
      console.log('ID da Rota sendo enviado:', payload.rotaId);
      console.log('Enviando payload para API:', payload);

      let result;

      if (editingUsuario) {
        result = await updateUsuario(editingUsuario.id, payload);
        console.log('ID da Rota sendo enviado:', payload.rotaId);
        console.log('Resposta da API (update):', result);
        
        // Atualiza o estado local imediatamente com o objeto completo (incluindo a relação rota)
        setUsuarios(prev => prev.map(u => u.id === editingUsuario.id ? result : u));
        
        toast({ className: 'bg-emerald-50 text-emerald-900 border-emerald-200', title: 'Sucesso', description: 'Usuário atualizado com sucesso.' });
      } else {
        if (!senha) {
           toast({ variant: 'destructive', title: 'Erro', description: 'Senha é obrigatória para novos usuários.' });
           setIsSubmitting(false);
           return;
        }
        result = await createUsuario(payload);
        // Adiciona o novo usuário ao estado local imediatamente
        setUsuarios(prev => [...prev, result]);
        toast({ className: 'bg-emerald-50 text-emerald-900 border-emerald-200', title: 'Sucesso', description: 'Usuário criado com sucesso.' });
      }
      
      // Se o usuário editado for o próprio usuário logado, atualiza o localStorage
      if (currentUser && (editingUsuario?.id === currentUser.id || (!editingUsuario && email === currentUser.email))) {
        const updatedSession = { 
          ...currentUser, 
          rotaId: result.rotaId, 
          role: result.role, 
          nome: result.nome,
          rota: result.rota // Inclui o objeto da rota para garantir o isolamento no Dashboard
        };
        localStorage.setItem('usuario', JSON.stringify(updatedSession));
        setCurrentUser(updatedSession);
        // Notifica outros componentes (como o Dashboard) via evento customizado se necessário
        window.dispatchEvent(new Event('storage'));
      }

      setIsModalOpen(false);
      // Forçar refresh da lista
      await fetchUsuarios();
    } catch (error: any) {
      console.error('Erro ao salvar usuário:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar',
        description: error.response?.data?.error || 'Erro interno do servidor.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este usuário?')) return;
    
    try {
      await deleteUsuario(id);
      toast({ title: 'Excluído', description: 'Usuário removido com sucesso.' });
      fetchUsuarios();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir',
        description: error.response?.data?.error || 'Erro ao remover usuário.'
      });
    }
  };

  const isAdmin = currentUser?.role?.toUpperCase() === 'ADMIN';

  return (
    <div className="p-4 sm:p-8 w-full max-w-6xl mx-auto space-y-6 sm:space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="w-full sm:w-auto">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Users className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
            Gestão de Usuários
          </h1>
          <p className="text-slate-500 mt-1 text-xs sm:text-sm font-medium">Controle de acessos e permissões do sistema.</p>
        </div>
        <Button onClick={() => handleOpenModal()} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 shadow-lg shadow-blue-500/20">
          <UserPlus className="mr-2 h-5 w-5" /> Novo Usuário
        </Button>
      </div>

      <div className="shadow-md border-slate-200 overflow-hidden bg-transparent sm:bg-white sm:rounded-xl">
        <div className="p-0">
          {loading ? (
            <div className="py-20 text-center flex flex-col items-center gap-3 bg-white rounded-xl">
              <div className="h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-slate-400 font-medium">Buscando usuários...</span>
            </div>
          ) : (
            <>
              {/* Mobile Card List */}
              <div className="grid grid-cols-1 gap-4 sm:hidden px-0">
                {usuarios.map((u) => (
                  <div key={u.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4 animate-in slide-in-from-bottom-2 duration-300">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-lg font-black shrink-0">
                          {u.nome.charAt(0).toUpperCase()}
                        </div>
                        <div className="space-y-0.5">
                          <h3 className="font-bold text-slate-900 leading-tight">{u.nome}</h3>
                          <p className="text-xs font-medium text-slate-500 break-all">{u.email}</p>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider shrink-0 ${
                        u.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {u.role}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-xs font-medium text-slate-500 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
                      <Route className="h-3 w-3 text-blue-500" />
                      <span>Rota: {u.rota?.name || 'Rede Global'}</span>
                    </div>
                    
                    <div className="pt-4 border-t border-slate-100 flex gap-3">
                      <Button
                        variant="outline"
                        className="flex-1 h-11 text-slate-600 font-bold border-slate-200 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all"
                        onClick={() => handleOpenModal(u)}
                      >
                        <Pencil className="h-4 w-4 mr-2" /> Editar
                      </Button>
                      <Button
                        variant="outline"
                        className="w-12 h-11 text-slate-400 border-slate-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all"
                        onClick={() => handleDelete(u.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table */}
              <div className="hidden sm:block overflow-x-auto w-full">
                <Table>
                  <TableHeader className="bg-slate-50/80">
                    <TableRow>
                      <TableHead className="font-bold text-slate-700 px-8 py-4 h-14">Usuário</TableHead>
                      <TableHead className="font-bold text-slate-700 h-14 text-center">E-mail</TableHead>
                      <TableHead className="font-bold text-slate-700 h-14 text-center">Cargo / Role</TableHead>
                      <TableHead className="font-bold text-slate-700 h-14 text-center">Rota de Atuação</TableHead>
                      <TableHead className="font-bold text-slate-700 text-right px-8 h-14">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usuarios.map((u) => (
                      <TableRow key={u.id} className="hover:bg-slate-50/50 transition-all">
                        <TableCell className="px-8 py-5">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold shrink-0">
                              {u.nome.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-bold text-slate-800">{u.nome}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center text-slate-500 font-medium">
                          <div className="truncate max-w-[240px] mx-auto" title={u.email}>
                            {u.email}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            u.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {u.role}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-medium border ${
                            u.rota?.name ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-50 text-slate-500 border-slate-100'
                          }`}>
                            {u.rota?.name || 'Rede Global'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right px-8 py-5">
                          <div className="flex justify-end gap-3">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-9 px-3 text-slate-600 hover:text-blue-600 hover:bg-blue-50 border-slate-200"
                              onClick={() => handleOpenModal(u)}
                            >
                              <Pencil className="h-4 w-4 mr-2" /> Editar
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-9 px-3 text-slate-400 hover:text-red-600 hover:bg-red-50 border-slate-200"
                              onClick={() => handleDelete(u.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </div>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden rounded-2xl border-none shadow-2xl">
          <DialogHeader className="bg-slate-900 text-white p-8">
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              {editingUsuario ? <Pencil className="h-6 w-6 text-blue-400" /> : <UserPlus className="h-6 w-6 text-blue-400" />}
              {editingUsuario ? 'Editar' : 'Novo'} Usuário
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-base mt-2">
              Configure as credenciais e nível de acesso do colaborador.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="p-8 space-y-6 bg-white">
            <div className="grid grid-cols-1 gap-5">
              <div className="space-y-2">
                <Label className="text-sm font-bold text-slate-700 ml-1">Nome Completo</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input 
                    value={nome} 
                    onChange={(e) => setNome(e.target.value)} 
                    className="pl-10 h-12 bg-slate-50 border-slate-200 font-medium" 
                    placeholder="Ex: João da Silva"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-bold text-slate-700 ml-1">E-mail Corporativo</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input 
                    type="email"
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    className="pl-10 h-12 bg-slate-50 border-slate-200 font-medium" 
                    placeholder="email@merenda.gov.br"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-bold text-slate-700 ml-1">
                  {editingUsuario ? 'Nova Senha (deixe vazio para manter)' : 'Senha de Acesso'}
                </Label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input 
                    type="password"
                    value={senha} 
                    onChange={(e) => setSenha(e.target.value)} 
                    className="pl-10 h-12 bg-slate-50 border-slate-200 font-medium" 
                    placeholder="••••••••"
                    required={!editingUsuario}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-bold text-slate-700 ml-1">Cargo / Nível de Acesso</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger className="h-12 bg-slate-50 border-slate-200">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-blue-600" />
                      <SelectValue placeholder="Selecione um cargo" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map(r => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {role === 'SUPERVISORA' && (
                <div className="space-y-2 animate-in slide-in-from-top-2">
                  <Label className="text-sm font-bold text-slate-700 ml-1">Rota de Atuação</Label>
                  <Select 
                    value={rotaId || 'none'} 
                    onValueChange={setRotaId}
                    disabled={!isAdmin}
                  >
                    <SelectTrigger className="h-12 bg-slate-50 border-slate-200">
                      <div className="flex items-center gap-2">
                        <Route className="h-4 w-4 text-blue-600" />
                        <SelectValue placeholder="Selecione uma rota" />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhuma Rota (Acesso Global)</SelectItem>
                      {rotas.map(r => (
                        <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-slate-400 italic ml-1">Supervisoras são isoladas aos dados da rota selecionada.</p>
                </div>
              )}
            </div>

            <DialogFooter className="bg-slate-50 -mx-8 -mb-8 p-6 mt-8 flex flex-row gap-3 border-t border-slate-100">
              <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)} className="flex-1 font-bold text-slate-500">
                Cancelar
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold h-11 shadow-lg shadow-blue-500/20"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Salvando...' : editingUsuario ? 'Atualizar Usuário' : 'Criar Usuário'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
