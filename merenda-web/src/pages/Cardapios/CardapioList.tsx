import React, { useEffect, useState, useMemo } from 'react';
import { createCardapio, getCardapios, updateCardapio, deleteCardapio, type Cardapio } from '../../services/api/cardapios';
import { getFichas, type Ficha } from '../../services/api/fichas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Trash2, Plus, ChevronLeft, ChevronRight, CalendarDays, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
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
// Define as prioridades e cores para cada tipo de refeição
const getRefeicaoProps = (tipo?: string) => {
  if (!tipo) return { weight: 99, borderColor: 'border-slate-300', textColor: 'text-slate-500' };
  const t = tipo.toUpperCase();
  if (t.includes('CAFÉ') || t.includes('DESJEJUM') || t.includes('MANHÃ')) {
    return { weight: 1, borderColor: 'border-orange-400', textColor: 'text-orange-500' };
  }
  if (t.includes('ALMOÇO') || t.includes('JANTAR') || t.includes('JANTA')) {
    return { weight: 2, borderColor: 'border-blue-500', textColor: 'text-blue-600' };
  }
  if (t.includes('LANCHE') || t.includes('MERENDA') || t.includes('TARDE')) {
    return { weight: 3, borderColor: 'border-emerald-500', textColor: 'text-emerald-600' };
  }
  if (t.includes('CEIA') || t.includes('NOITE')) {
    return { weight: 4, borderColor: 'border-indigo-500', textColor: 'text-indigo-600' };
  }
  return { weight: 5, borderColor: 'border-slate-400', textColor: 'text-slate-500' };
};

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
  const [segmentoFiltro, setSegmentoFiltro] = useState<string>('TODOS');

  // Estados para Modal (Novo/Editar)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [cardapioEmEdicao, setCardapioEmEdicao] = useState<Cardapio | null>(null);

  const [editData, setEditData] = useState('');
  const [editFichasIds, setEditFichasIds] = useState<string[]>([]);
  const [editTiposEscola, setEditTiposEscola] = useState<string[]>([]);
  const [editIsFeriado, setEditIsFeriado] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Exclusão
  const [cardapioParaExcluir, setCardapioParaExcluir] = useState<Cardapio | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { toast } = useToast();

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

  // --- Handlers Modal ---
  const handleOpenCreate = (date?: string, template?: Cardapio) => {
    setModalMode('create');
    setCardapioEmEdicao(null);
    setEditData(date || '');
    setEditFichasIds(template?.fichas_ids || (template?.ficha_tecnica_id ? [template.ficha_tecnica_id] : []));
    setEditTiposEscola(template?.tipos_escola || [...TIPOS_ESCOLA_OPTIONS]);
    setEditIsFeriado(template ? !!isFeriado(template) : false);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (dayCardapios: Cardapio[]) => {
    const principal = dayCardapios[0];
    if (!principal) return;

    setModalMode('edit');
    setCardapioEmEdicao(principal);
    setEditData(toDateString(principal.data_agendada));
    
    // Extrai todos os IDs de fichas técnicas do dia
    const idsExtraidos = dayCardapios
      .map(c => c.ficha_tecnica_id || c.fichaTecnicaId)
      .filter((id): id is string => !!id);
    
    setEditFichasIds(idsExtraidos);
    setEditTiposEscola(principal.tipos_escola || []);
    setEditIsFeriado(!!isFeriado(principal));
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCardapioEmEdicao(null);
  };

  const handleToggleTipoEscola = (tipo: string) => {
    setEditTiposEscola((prev) =>
      prev.includes(tipo) ? prev.filter((t) => t !== tipo) : [...prev, tipo]
    );
  };

  const handleDeleteAll = async () => {
    if (!editData) return;
    
    const registrosDoDia = cardapios.filter(c => toDateString(c.data_agendada) === editData);
    if (registrosDoDia.length === 0) return;

    if (!window.confirm('Tem certeza que deseja excluir TODO o cardápio deste dia?')) {
      return;
    }

    setIsSubmitting(true);
    try {
      await Promise.all(registrosDoDia.map(r => deleteCardapio(r.id)));
      toast({ className: "bg-emerald-50 text-emerald-900 border-emerald-200", title: "Sucesso", description: "Cardápio do dia excluído com sucesso." });
      handleCloseModal();
      fetchCardapios();
    } catch (error: any) {
      console.error('Erro ao excluir cardápio do dia:', error);
      toast({ variant: "destructive", title: "Erro", description: "Não foi possível excluir o cardápio." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteIndividual = async (e: React.MouseEvent, cardapioId: string) => {
    e.stopPropagation(); // Evita abrir a modal de edição
    if (!window.confirm('Excluir esta receita do cardápio?')) return;

    try {
      await deleteCardapio(cardapioId);
      toast({ className: "bg-emerald-50 text-emerald-900 border-emerald-200", title: "Sucesso", description: "Receita removida do cardápio." });
      // Atualização silenciosa sem setLoading para não colapsar o scroll
      const updatedData = await getCardapios(currentMonth, currentYear);
      setCardapios(updatedData);
    } catch (error: any) {
      console.error('Erro ao excluir receita:', error);
      toast({ variant: "destructive", title: "Erro", description: "Falha ao remover a receita." });
    }
  };

  const handleSubmit = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) e.preventDefault();
    if (!editData || editTiposEscola.length === 0) {
      toast({ variant: "destructive", title: "Atenção", description: "Data e Tipos de Escola são obrigatórios." });
      return;
    }
    if (!editIsFeriado && editFichasIds.length === 0) {
      toast({ variant: "destructive", title: "Atenção", description: "Selecione ao menos uma Ficha Técnica ou marque como Feriado." });
      return;
    }

    setIsSubmitting(true);
    try {
      if (modalMode === 'create') {
        // Envia uma requisição para cada ficha selecionada
        const promises = editFichasIds.length > 0 
          ? editFichasIds.map(fichaId => createCardapio({
              data_agendada: `${editData}T12:00:00.000Z`,
              ficha_tecnica_id: fichaId,
              isFeriado: editIsFeriado,
              tipos_escola: editTiposEscola,
            }))
          : [createCardapio({
              data_agendada: `${editData}T12:00:00.000Z`,
              ficha_tecnica_id: null,
              isFeriado: editIsFeriado,
              tipos_escola: editTiposEscola,
            })];
        
        await Promise.all(promises);
        toast({ className: "bg-emerald-50 text-emerald-900 border-emerald-200", title: "Sucesso", description: "Cardápio criado com sucesso." });
      } else if (cardapioEmEdicao) {
        // Pega todos os registros existentes para aquele dia
        const registrosDoDia = cardapios.filter(c => toDateString(c.data_agendada) === editData);

        if (editIsFeriado) {
          // Se mudou para feriado, mantém apenas 1 registro e exclui os demais
          const principal = registrosDoDia[0] || cardapioEmEdicao;
          const paraDeletar = registrosDoDia.filter(r => r.id !== principal.id);
          
          await Promise.all([
            updateCardapio(principal.id, {
              data_agendada: `${editData}T12:00:00.000Z`,
              ficha_tecnica_id: null,
              tipos_escola: editTiposEscola,
              is_feriado: true,
            }),
            ...paraDeletar.map(r => deleteCardapio(r.id))
          ]);
        } else {
          // === LÓGICA DE DIFF PARA RECEITAS ===
          const idsNoBanco = registrosDoDia
            .map(r => r.ficha_tecnica_id || r.fichaTecnicaId)
            .filter(Boolean) as string[];

          // 1. ADICIONAR (IDs selecionados que não estão no banco)
          const toAddIds = editFichasIds.filter(id => !idsNoBanco.includes(id));
          const addPromises = toAddIds.map(fichaId => createCardapio({
            data_agendada: `${editData}T12:00:00.000Z`,
            ficha_tecnica_id: fichaId,
            isFeriado: false,
            tipos_escola: editTiposEscola,
          }));

          // 2. REMOVER (Registros no banco cujo ID não está mais selecionado)
          const toRemove = registrosDoDia.filter(r => {
            const fId = r.ficha_tecnica_id || r.fichaTecnicaId;
            return r.isFeriado || r.is_feriado || (fId && !editFichasIds.includes(fId));
          });
          const removePromises = toRemove.map(r => deleteCardapio(r.id));

          // 3. ATUALIZAR (Registros no banco que continuam selecionados)
          const toUpdate = registrosDoDia.filter(r => !toRemove.includes(r));
          const updatePromises = toUpdate.map(r => updateCardapio(r.id, {
            data_agendada: `${editData}T12:00:00.000Z`,
            ficha_tecnica_id: r.ficha_tecnica_id || r.fichaTecnicaId || null,
            tipos_escola: editTiposEscola,
            is_feriado: false,
          }));

          await Promise.all([...addPromises, ...removePromises, ...updatePromises]);
        }

        toast({ className: "bg-emerald-50 text-emerald-900 border-emerald-200", title: "Sucesso", description: "Cardápio atualizado e sincronizado." });
      }
      handleCloseModal();
      // Atualização silenciosa
      const updatedData = await getCardapios(currentMonth, currentYear);
      setCardapios(updatedData);
    } catch (error: any) {
      console.error('Erro detalhado ao salvar cardápio:', error);
      toast({ variant: "destructive", title: "Erro no Servidor", description: error.response?.data?.error || "Erro ao salvar o cardápio. Verifique o console." });
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Exclusão ---
  const handleConfirmDelete = async () => {
    if (!cardapioParaExcluir) return;
    setIsDeleting(true);
    try {
      await deleteCardapio(cardapioParaExcluir.id);
      toast({ className: "bg-emerald-50 text-emerald-900 border-emerald-200", title: "Sucesso", description: "Cardápio excluído." });
      const updatedData = await getCardapios(currentMonth, currentYear);
      setCardapios(updatedData);
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
          <h1 className="text-2xl md:text-4xl font-black tracking-tight text-foreground flex items-center gap-3">
            <CalendarDays className="h-8 w-8 text-blue-600" />
            Planejamento de Cardápio
          </h1>
          <p className="text-muted-foreground mt-1">Grade semanal de refeições por mês.</p>
        </div>
      </div>

      {/* Cabeçalho e Filtros */}
      <div className="flex flex-col md:flex-row justify-between gap-4 bg-white rounded-lg border border-slate-200 shadow-sm p-4 overflow-hidden">
        {/* Navegação Mês/Ano */}
        <div className="flex items-center justify-center gap-6 w-full py-4">
          <Button 
            variant="outline" 
            onClick={handlePrevMonth} 
            className="h-10 w-10 rounded-full border border-slate-200 bg-slate-50 flex items-center justify-center hover:bg-slate-100 active:bg-slate-200 p-0"
          >
            <ChevronLeft className="h-4 w-4 text-slate-600" />
          </Button>
          <h2 className="text-xl md:text-2xl font-bold text-slate-800 text-center min-w-[140px]">
            {MESES[currentMonth - 1]} de {currentYear}
          </h2>
          <Button 
            variant="outline" 
            onClick={handleNextMonth} 
            className="h-10 w-10 rounded-full border border-slate-200 bg-slate-50 flex items-center justify-center hover:bg-slate-100 active:bg-slate-200 p-0"
          >
            <ChevronRight className="h-4 w-4 text-slate-600" />
          </Button>
        </div>

        {/* Filtro de Segmento (Tabs) */}
        <div className="flex overflow-x-auto pb-2 -mx-4 px-4 gap-2 no-scrollbar snap-x items-center md:justify-end">
          {['TODOS', ...TIPOS_ESCOLA_OPTIONS].map((tipo) => (
            <button
              key={tipo}
              onClick={() => setSegmentoFiltro(tipo)}
              className={`whitespace-nowrap shrink-0 snap-start px-3 py-1.5 rounded-full text-[10px] font-bold tracking-wide uppercase transition-all ${
                segmentoFiltro === tipo
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700'
              }`}
            >
              {tipo}
            </button>
          ))}
        </div>
      </div>

      {/* Grade Semanal */}
      {loading ? (
        <div className="py-12 text-center text-slate-500">Carregando cardápios...</div>
      ) : (
        <div className="w-full overflow-x-auto pb-6 custom-scrollbar">
          <div className="flex flex-col gap-4 w-full min-w-0 lg:min-w-[1000px]">
            {/* Cabeçalho da grade */}
            <div className="hidden lg:grid grid-cols-5 gap-4">
              {DIAS_SEMANA.map((dia) => (
                <div key={dia} className="bg-slate-800 text-white text-center text-sm font-semibold py-2.5 rounded-t-md">
                  {dia}
                </div>
              ))}
            </div>

            {/* Semanas */}
            {weeks.map((week, weekIdx) => (
              <div key={weekIdx} className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                {week.map((slot, dayIdx) => {
                  if (!slot) {
                    return <div key={dayIdx} className="hidden lg:block min-h-[120px] bg-slate-50 rounded-md border border-slate-100" />;
                  }

                  const dayCardapios = cardapiosByDate[slot.dateStr] || [];
                  const filteredCardapios = dayCardapios.filter(c => 
                    segmentoFiltro === 'TODOS' || (c.tipos_escola && c.tipos_escola.includes(segmentoFiltro))
                  );

                  // Ordena cronologicamente com base no peso da refeição
                  const sortedCardapios = [...filteredCardapios].sort((a, b) => {
                    const weightA = getRefeicaoProps(a.ficha?.type).weight;
                    const weightB = getRefeicaoProps(b.ficha?.type).weight;
                    return weightA - weightB;
                  });

                  const isToday = slot.dateStr === todayStr;
                  const isPast = slot.dateStr < todayStr;

                  return (
                    <div
                      key={dayIdx}
                      onClick={() => {
                        if (dayCardapios.length > 0) handleOpenEdit(dayCardapios);
                        else handleOpenCreate(slot.dateStr);
                      }}
                      className={`min-h-[140px] rounded-xl border p-3 flex flex-col gap-2 transition-all cursor-pointer shadow-sm group relative ${
                        isToday
                          ? 'bg-orange-50 border-orange-300 ring-2 ring-orange-200'
                          : isPast
                          ? 'bg-slate-50 border-slate-200 opacity-80'
                          : 'bg-white border-slate-200 hover:border-blue-400 hover:shadow-md'
                      }`}
                    >
                      {/* Número do dia */}
                      <div className="flex justify-between items-center h-5">
                        <span className={`text-[10px] font-black ${isToday ? 'text-orange-700' : isPast ? 'text-slate-400' : 'text-slate-500'} uppercase`}>
                          {slot.day} <span className="lg:hidden ml-1 text-slate-500">({DIAS_SEMANA[dayIdx]})</span>
                        </span>
                        <div className="flex items-center gap-1">
                          {isToday && (
                            <span className="text-[8px] font-bold bg-orange-600 text-white px-1 py-0.5 rounded">HOJE</span>
                          )}
                          <div className="h-4 w-4 flex items-center justify-center bg-blue-100 text-blue-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                            <Plus className="h-2.5 w-2.5" />
                          </div>
                        </div>
                      </div>

                      {/* Exibição Unificada do Cardápio */}
                      {sortedCardapios.length === 0 ? (
                        <div className="flex-1 flex items-center justify-center border-2 border-dashed border-slate-100 rounded-lg">
                          <Plus className="h-4 w-4 text-slate-200 group-hover:text-blue-400 transition-colors" />
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2">
                          {sortedCardapios.map((cardapio) => (
                            <div key={cardapio.id} className="space-y-2">
                              {isFeriado(cardapio) ? (
                                <div className="bg-red-50 text-red-600 p-2 rounded-md text-center font-black text-[10px] uppercase tracking-wider border border-red-200">
                                  Feriado / Recesso
                                </div>
                              ) : (
                                <>
                                  <div className="flex flex-col gap-1">
                                    {cardapio.ficha?.name && (() => {
                                      const style = getRefeicaoProps(cardapio.ficha.type);
                                      return (
                                        <div className={`bg-white border-l-4 ${style.borderColor} border-y border-r border-y-slate-200 border-r-slate-200 px-2 py-1.5 rounded-md shadow-sm flex flex-col relative group/item`}>
                                          <div className="flex justify-between items-start">
                                            <span className="text-[10px] font-black leading-tight uppercase truncate pr-4 text-slate-800">
                                              {cardapio.ficha.name}
                                            </span>
                                            <button 
                                              onClick={(e) => handleDeleteIndividual(e, cardapio.id)}
                                              className="absolute top-1 right-1 opacity-0 group-hover/item:opacity-100 text-slate-300 hover:text-red-500 transition-colors"
                                              title="Excluir receita"
                                            >
                                              <Trash2 className="h-3 w-3" />
                                            </button>
                                          </div>
                                          {cardapio.ficha.type && (
                                            <span className={`text-[8px] font-bold uppercase mt-0.5 ${style.textColor}`}>
                                              {cardapio.ficha.type}
                                            </span>
                                          )}
                                        </div>
                                      );
                                    })()}
                                  </div>
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

      )}

      {/* ========== Modal Único (Novo/Editar) ========== */}
      <Dialog open={isModalOpen} onOpenChange={(open) => !open && handleCloseModal()}>
        <DialogContent 
          className="sm:max-w-[520px] max-h-[85vh] overflow-y-auto bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-100"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-slate-100">
              {modalMode === 'create' ? 'Novo Cardápio' : 'Editar Cardápio'}
            </DialogTitle>
            <DialogDescription className="text-slate-500 dark:text-slate-400">
              {modalMode === 'create' ? 'Agende uma nova refeição para a rede.' : 'Ajuste os dados do agendamento.'}
            </DialogDescription>
          </DialogHeader>

          {modalMode === 'edit' && editData < todayStr && (
            <div className="flex items-start gap-3 p-3 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-sm">
              <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold">Aviso Operacional</p>
                <p className="text-amber-700 text-xs mt-0.5">
                  Você está alterando um cardápio do passado. O estoque já foi processado para este dia.
                </p>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col gap-2">
              <Label className="text-slate-900 dark:text-slate-200 font-semibold">Data Agendada</Label>
              <Input type="date" value={editData} onChange={(e) => setEditData(e.target.value)} />
              {/* Checkbox Feriado - Versão Discreta */}
              <div className="flex items-center gap-2 mt-2">
                <input 
                  type="checkbox" 
                  id="editIsFeriado" 
                  checked={editIsFeriado} 
                  onChange={(e) => setEditIsFeriado(e.target.checked)} 
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" 
                />
                <Label htmlFor="editIsFeriado" className="text-sm text-slate-500 dark:text-slate-400 font-normal cursor-pointer mb-0">
                  Marcar este dia como Feriado ou Facultativo
                </Label>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label className="text-slate-900 dark:text-slate-200 font-semibold">Fichas Técnicas (Receitas do Dia)</Label>
              {!editIsFeriado ? (
                <div className="grid grid-cols-1 gap-1 max-h-[40vh] overflow-y-auto p-1.5 border rounded-md bg-slate-50 custom-scrollbar">
                  {fichas.map((f) => (
                    <label key={f.id} className="flex items-center gap-2 py-1.5 px-2 hover:bg-white rounded-md cursor-pointer transition-colors border border-transparent hover:border-slate-200">
                      <input
                        type="checkbox"
                        checked={editFichasIds.includes(f.id)}
                        onChange={(e) => {
                          if (e.target.checked) setEditFichasIds([...editFichasIds, f.id]);
                          else setEditFichasIds(editFichasIds.filter(id => id !== f.id));
                        }}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-700 leading-tight">{f.name}</span>
                        {f.type && <span className="text-[9px] text-slate-400 uppercase tracking-tight mt-0.5">{f.type}</span>}
                      </div>
                    </label>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-slate-400 italic text-sm bg-slate-50 rounded-md border border-dashed">
                  Nenhuma ficha necessária em dias de feriado.
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label className="text-slate-900 dark:text-slate-200 font-semibold">Tipos de Escola</Label>
              <div className="flex flex-wrap gap-1.5">
                {TIPOS_ESCOLA_OPTIONS.map((tipo) => (
                  <button
                    key={tipo}
                    type="button"
                    onClick={() => handleToggleTipoEscola(tipo)}
                    className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide border transition-all ${
                      editTiposEscola.includes(tipo)
                        ? 'bg-blue-600 text-white border-blue-700 shadow-md scale-105'
                        : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {tipo}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter className="flex justify-between items-center sm:justify-between w-full mt-4">
            {modalMode === 'edit' ? (
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleDeleteAll}
                disabled={isSubmitting}
                className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 font-semibold mr-auto"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir Dia
              </Button>
            ) : (
              <div /> // Spacer para manter botões à direita
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleCloseModal} disabled={isSubmitting}>Cancelar</Button>
              <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm font-bold tracking-wide">
                {isSubmitting ? 'Salvando...' : modalMode === 'create' ? 'Criar Cardápio' : 'Salvar Alterações'}
              </Button>
            </div>
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
