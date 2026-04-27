import React, { useEffect, useState, useMemo } from 'react';
import { getCardapios, updateCardapio, deleteCardapio, type Cardapio } from '../../services/api/cardapios';
import { getFichas, type Ficha } from '../../services/api/fichas';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pencil, Trash2, Plus, ChevronLeft, ChevronRight, CalendarDays, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

const TIPOS_ESCOLA_OPTIONS = ['CRECHE', 'FUNDAMENTAL', 'INTEGRAL', 'PARCIAL', 'EJA'];
const DIAS_SEMANA = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'];
const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

const getLocalToday = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

const toDateString = (iso: string): string => iso.substring(0, 10);

/**
 * Gera as semanas úteis (Seg-Sex) de um mês.
 * Cada semana é um array de 5 slots (null = dia fora do mês ou fim de semana preenchido).
 * Cada slot: { day: number, dateStr: 'YYYY-MM-DD' }
 */
const getWeeksOfMonth = (year: number, month: number) => {
  const weeks: ({ day: number; dateStr: string } | null)[][] = [];
  const daysInMonth = new Date(year, month, 0).getDate(); // month is 1-based here

  let currentWeek: ({ day: number; dateStr: string } | null)[] = [];

  for (let day = 1; day <= daysInMonth; day++) {
    // JS Date month is 0-based
    const date = new Date(year, month - 1, day);
    const dow = date.getDay(); // 0=Sun, 1=Mon ... 6=Sat

    if (dow === 0 || dow === 6) continue; // Pula sábado e domingo

    // dow: 1=Mon -> index 0, 2=Tue -> index 1, etc.
    const weekdayIndex = dow - 1;

    // Se é segunda-feira e já temos dados na semana atual, salva e começa nova
    if (weekdayIndex === 0 && currentWeek.length > 0) {
      // Preenche slots vazios no final da semana anterior
      while (currentWeek.length < 5) currentWeek.push(null);
      weeks.push(currentWeek);
      currentWeek = [];
    }

    // Preenche slots vazios no início (ex: mês começa na quarta)
    while (currentWeek.length < weekdayIndex) currentWeek.push(null);

    const m = String(month).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    currentWeek.push({ day, dateStr: `${year}-${m}-${d}` });
  }

  // Salva última semana
  if (currentWeek.length > 0) {
    while (currentWeek.length < 5) currentWeek.push(null);
    weeks.push(currentWeek);
  }

  return weeks;
};

export const CardapioList: React.FC = () => {
  const now = new Date();
  const [currentMonth, setCurrentMonth] = useState(now.getMonth() + 1); // 1-12
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [cardapios, setCardapios] = useState<Cardapio[]>([]);
  const [fichas, setFichas] = useState<Ficha[]>([]);
  const [loading, setLoading] = useState(false);

  // Edição
  const [cardapioEmEdicao, setCardapioEmEdicao] = useState<Cardapio | null>(null);
  const [editData, setEditData] = useState('');
  const [editDescricao, setEditDescricao] = useState('');
  const [editFichaId, setEditFichaId] = useState('');
  const [editTiposEscola, setEditTiposEscola] = useState<string[]>([]);
  const [editIsFeriado, setEditIsFeriado] = useState(false);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // Exclusão
  const [cardapioParaExcluir, setCardapioParaExcluir] = useState<Cardapio | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { toast } = useToast();
  const navigate = useNavigate();

  const fetchCardapios = async () => {
    setLoading(true);
    try {
      const data = await getCardapios(currentMonth, currentYear);
      setCardapios(data);
    } catch (error) {
      console.error('Erro ao buscar cardápios:', error);
      toast({ variant: "destructive", title: "Erro", description: "Não foi possível carregar os cardápios." });
    } finally {
      setLoading(false);
    }
  };

  const fetchFichas = async () => {
    try {
      const data = await getFichas();
      setFichas(data);
    } catch (error) {
      console.error('Erro ao buscar fichas:', error);
    }
  };

  useEffect(() => { fetchFichas(); }, []);
  useEffect(() => { fetchCardapios(); }, [currentMonth, currentYear]);

  const isFeriado = (c: Cardapio) => c.isFeriado || c.is_feriado;
  const todayStr = getLocalToday();

  // Agrupa cardápios por dateStr (YYYY-MM-DD)
  const cardapiosByDate = useMemo(() => {
    const map: Record<string, Cardapio[]> = {};
    cardapios.forEach((c) => {
      const key = toDateString(c.data_agendada);
      if (!map[key]) map[key] = [];
      map[key].push(c);
    });
    return map;
  }, [cardapios]);

  // Gera as semanas do mês
  const weeks = useMemo(() => getWeeksOfMonth(currentYear, currentMonth), [currentYear, currentMonth]);

  // Navegação
  const handlePrevMonth = () => {
    if (currentMonth === 1) { setCurrentMonth(12); setCurrentYear((y) => y - 1); }
    else setCurrentMonth((m) => m - 1);
  };
  const handleNextMonth = () => {
    if (currentMonth === 12) { setCurrentMonth(1); setCurrentYear((y) => y + 1); }
    else setCurrentMonth((m) => m + 1);
  };

  // --- Edição ---
  const handleOpenEdit = (cardapio: Cardapio) => {
    setCardapioEmEdicao(cardapio);
    setEditData(toDateString(cardapio.data_agendada));
    setEditDescricao(cardapio.descricao || '');
    setEditFichaId(cardapio.fichaTecnicaId || cardapio.ficha_tecnica_id || '');
    setEditTiposEscola(cardapio.tipos_escola || []);
    setEditIsFeriado(!!isFeriado(cardapio));
  };
  const handleCloseEdit = () => setCardapioEmEdicao(null);
  const isEditingPastDate = editData < todayStr;

  const handleToggleTipoEscola = (tipo: string) => {
    setEditTiposEscola((prev) =>
      prev.includes(tipo) ? prev.filter((t) => t !== tipo) : [...prev, tipo]
    );
  };

  const handleSubmitEdit = async () => {
    if (!cardapioEmEdicao) return;
    if (!editData || editTiposEscola.length === 0) {
      toast({ variant: "destructive", title: "Atenção", description: "Data e Tipos de Escola são obrigatórios." });
      return;
    }
    if (!editIsFeriado && !editFichaId) {
      toast({ variant: "destructive", title: "Atenção", description: "Selecione uma Ficha Técnica ou marque como Feriado." });
      return;
    }
    setIsSubmittingEdit(true);
    try {
      await updateCardapio(cardapioEmEdicao.id, {
        data_agendada: `${editData}T12:00:00.000Z`,
        descricao: editDescricao || undefined,
        ficha_tecnica_id: editIsFeriado ? null : editFichaId,
        tipos_escola: editTiposEscola,
        isFeriado: editIsFeriado,
      });
      toast({ className: "bg-emerald-50 text-emerald-900 border-emerald-200", title: "Sucesso", description: "Cardápio atualizado." });
      handleCloseEdit();
      fetchCardapios();
    } catch (error: any) {
      console.error('Erro ao atualizar cardápio:', error);
      toast({ variant: "destructive", title: "Erro", description: error.response?.data?.error || "Erro ao atualizar." });
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // --- Exclusão ---
  const handleConfirmDelete = async () => {
    if (!cardapioParaExcluir) return;
    setIsDeleting(true);
    try {
      await deleteCardapio(cardapioParaExcluir.id);
      toast({ className: "bg-emerald-50 text-emerald-900 border-emerald-200", title: "Sucesso", description: "Cardápio excluído." });
      fetchCardapios();
    } catch (error: any) {
      console.error('Erro ao excluir cardápio:', error);
      toast({ variant: "destructive", title: "Erro", description: error.response?.data?.error || "Erro ao excluir." });
    } finally {
      setIsDeleting(false);
      setCardapioParaExcluir(null);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto flex flex-col gap-6">
      {/* Cabeçalho */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <CalendarDays className="h-8 w-8 text-orange-600" />
            Planejamento de Cardápio
          </h1>
          <p className="text-muted-foreground mt-1">Grade semanal de refeições por mês.</p>
        </div>
        <Button onClick={() => navigate('/cardapios/novo')} className="bg-orange-600 hover:bg-orange-700 text-white">
          <Plus className="mr-2 h-4 w-4" /> Novo Cardápio
        </Button>
      </div>

      {/* Navegação Mês/Ano */}
      <div className="flex items-center justify-center gap-4 bg-white rounded-lg border border-slate-200 shadow-sm p-3">
        <Button variant="outline" size="sm" onClick={handlePrevMonth} className="h-9 w-9 p-0">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-xl font-bold text-slate-800 min-w-[220px] text-center">
          {MESES[currentMonth - 1]} de {currentYear}
        </h2>
        <Button variant="outline" size="sm" onClick={handleNextMonth} className="h-9 w-9 p-0">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Grade Semanal */}
      {loading ? (
        <div className="py-12 text-center text-slate-500">Carregando cardápios...</div>
      ) : (
        <div className="flex flex-col gap-1">
          {/* Cabeçalho da grade */}
          <div className="grid grid-cols-5 gap-1">
            {DIAS_SEMANA.map((dia) => (
              <div key={dia} className="bg-slate-800 text-white text-center text-sm font-semibold py-2.5 rounded-t-md">
                {dia}
              </div>
            ))}
          </div>

          {/* Semanas */}
          {weeks.map((week, weekIdx) => (
            <div key={weekIdx} className="grid grid-cols-5 gap-1">
              {week.map((slot, dayIdx) => {
                if (!slot) {
                  return <div key={dayIdx} className="min-h-[120px] bg-slate-50 rounded-md border border-slate-100" />;
                }

                const dayCardapios = cardapiosByDate[slot.dateStr] || [];
                const isToday = slot.dateStr === todayStr;
                const isPast = slot.dateStr < todayStr;

                return (
                  <div
                    key={dayIdx}
                    className={`min-h-[120px] rounded-md border p-2 flex flex-col gap-1.5 transition-colors ${
                      isToday
                        ? 'bg-orange-50 border-orange-300 ring-2 ring-orange-200'
                        : isPast
                        ? 'bg-slate-50 border-slate-200'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    {/* Número do dia */}
                    <div className="flex justify-between items-center">
                      <span className={`text-xs font-bold ${isToday ? 'text-orange-700' : isPast ? 'text-slate-400' : 'text-slate-600'}`}>
                        {slot.day}
                      </span>
                      {isToday && (
                        <span className="text-[10px] font-semibold bg-orange-600 text-white px-1.5 py-0.5 rounded">HOJE</span>
                      )}
                    </div>

                    {/* Cards dos cardápios do dia */}
                    {dayCardapios.length === 0 ? (
                      <div className="flex-1 flex items-center justify-center">
                        <span className="text-[10px] text-slate-300 italic">Sem agendamento</span>
                      </div>
                    ) : (
                      dayCardapios.map((cardapio) => (
                        <Card
                          key={cardapio.id}
                          className={`shadow-none border ${
                            isFeriado(cardapio)
                              ? 'bg-red-50 border-red-200'
                              : 'bg-blue-50 border-blue-200'
                          }`}
                        >
                          <CardContent className="p-2">
                            {isFeriado(cardapio) ? (
                              <p className="text-xs font-bold text-red-700 text-center">FERIADO / RECESSO</p>
                            ) : (
                              <>
                                <p className="text-xs font-semibold text-slate-800 leading-tight truncate" title={cardapio.ficha?.name}>
                                  {cardapio.ficha?.name || 'Ficha?'}
                                </p>
                                {cardapio.tipos_escola && cardapio.tipos_escola.length > 0 && (
                                  <div className="flex flex-wrap gap-0.5 mt-1">
                                    {cardapio.tipos_escola.map((t) => (
                                      <span key={t} className="text-[9px] bg-blue-100 text-blue-700 rounded px-1 py-px font-medium">
                                        {t}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </>
                            )}
                            {/* Ações */}
                            <div className="flex justify-end gap-1 mt-1.5">
                              <button
                                onClick={() => handleOpenEdit(cardapio)}
                                className="p-0.5 rounded hover:bg-blue-100 text-slate-400 hover:text-blue-600 transition-colors"
                                title="Editar"
                              >
                                <Pencil className="h-3 w-3" />
                              </button>
                              <button
                                onClick={() => setCardapioParaExcluir(cardapio)}
                                className="p-0.5 rounded hover:bg-red-100 text-slate-400 hover:text-red-600 transition-colors"
                                title="Excluir"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {/* ========== Modal de Edição (PUT) ========== */}
      <Dialog open={!!cardapioEmEdicao} onOpenChange={(open) => !open && handleCloseEdit()}>
        <DialogContent className="sm:max-w-[520px] max-h-[85vh] overflow-y-auto bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-100">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-slate-100">Editar Cardápio</DialogTitle>
            <DialogDescription className="text-slate-500 dark:text-slate-400">Ajuste os dados do agendamento.</DialogDescription>
          </DialogHeader>

          {isEditingPastDate && (
            <div className="flex items-start gap-3 p-3 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-sm">
              <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold">Aviso Operacional</p>
                <p className="text-amber-700 text-xs mt-0.5">
                  Você está alterando um cardápio do passado. O estoque já foi processado para este dia.
                  Faça um ajuste de Inventário Físico se houver divergência nas prateleiras.
                </p>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col gap-2">
              <Label className="text-slate-900 dark:text-slate-200 font-semibold">Data Agendada</Label>
              <Input type="date" value={editData} onChange={(e) => setEditData(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label className="text-slate-900 dark:text-slate-200 font-semibold">Descrição (opcional)</Label>
              <Input value={editDescricao} onChange={(e) => setEditDescricao(e.target.value)} placeholder="Ex: Cardápio especial" />
            </div>
            <div className="flex items-center gap-3">
              <input type="checkbox" id="editIsFeriado" checked={editIsFeriado} onChange={(e) => setEditIsFeriado(e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
              <Label htmlFor="editIsFeriado" className="text-slate-900 dark:text-slate-200 font-semibold cursor-pointer">Feriado / Facultativo</Label>
            </div>
            {!editIsFeriado && (
              <div className="flex flex-col gap-2">
                <Label className="text-slate-900 dark:text-slate-200 font-semibold">Ficha Técnica</Label>
                <Select value={editFichaId} onValueChange={setEditFichaId}>
                  <SelectTrigger className="bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"><SelectValue placeholder="Selecione a ficha" /></SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800">
                    {fichas.map((f) => (
                      <SelectItem key={f.id} value={f.id} className="text-slate-900 dark:text-slate-100 focus:bg-slate-100 dark:focus:bg-slate-800">{f.name} {f.type ? `(${f.type})` : ''}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex flex-col gap-2">
              <Label className="text-slate-900 dark:text-slate-200 font-semibold">Tipos de Escola</Label>
              <div className="flex flex-wrap gap-2">
                {TIPOS_ESCOLA_OPTIONS.map((tipo) => (
                  <button key={tipo} type="button" onClick={() => handleToggleTipoEscola(tipo)} className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${editTiposEscola.includes(tipo) ? 'bg-orange-100 text-orange-800 border-orange-300' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}>{tipo}</button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseEdit} disabled={isSubmittingEdit}>Cancelar</Button>
            <Button onClick={handleSubmitEdit} disabled={isSubmittingEdit} className="bg-orange-600 hover:bg-orange-700 text-white">{isSubmittingEdit ? 'Salvando...' : 'Salvar Alterações'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========== Modal de Exclusão (DELETE) ========== */}
      <AlertDialog open={!!cardapioParaExcluir} onOpenChange={(open) => !open && setCardapioParaExcluir(null)}>
        <AlertDialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-100">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-900 dark:text-slate-100">
              Excluir cardápio de {cardapioParaExcluir ? new Date(cardapioParaExcluir.data_agendada).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : ''}?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500 dark:text-slate-400">Esta ação removerá permanentemente este agendamento.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting} className="text-slate-900 dark:text-slate-100 border-slate-200 dark:border-slate-800">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); handleConfirmDelete(); }} disabled={isDeleting} className="bg-red-600 hover:bg-red-700 text-white">{isDeleting ? 'Excluindo...' : 'Sim, Excluir'}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
