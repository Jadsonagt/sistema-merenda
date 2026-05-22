import React, { useEffect, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import {
  Plus, Trash2, MapPin, Map as MapIcon,
  ChevronRight, FileSpreadsheet,
  ChevronLeft, CalendarDays,
  ShieldPlus
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { api } from '../../services/api';
import { gerarPlanilhaReembolso } from '../../utils/exportReembolso';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';

const getCorRestricao = (nome: string) => {
  const texto = nome.toLowerCase();
  let matches = 0;
  let lastMatch = '';

  if (texto.includes('lactose') || texto.includes('leite') || texto.includes('aplv')) { matches++; lastMatch = 'lactose'; }
  if (texto.includes('glúten') || texto.includes('gluten') || texto.includes('celíaco') || texto.includes('celiaco')) { matches++; lastMatch = 'gluten'; }
  if (texto.includes('diabétic') || texto.includes('diabetic') || texto.includes('açúcar')) { matches++; lastMatch = 'diabete'; }
  if (texto.includes('ovo')) { matches++; lastMatch = 'ovo'; }
  if (texto.includes('amendoim') || texto.includes('castanha')) { matches++; lastMatch = 'castanha'; }
  if (texto.includes('soja')) { matches++; lastMatch = 'soja'; }
  if (texto.includes('corante')) { matches++; lastMatch = 'corante'; }

  if (matches > 1 || texto.includes(' e ') || texto.includes('/')) return 'bg-rose-100 text-rose-700 border-rose-200'; 

  switch (lastMatch) {
    case 'lactose': return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'gluten': return 'bg-amber-100 text-amber-700 border-amber-200';
    case 'diabete': return 'bg-teal-100 text-teal-700 border-teal-200';
    case 'ovo': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    case 'castanha': return 'bg-orange-100 text-orange-700 border-orange-200';
    case 'soja': return 'bg-green-100 text-green-700 border-green-200';
    case 'corante': return 'bg-purple-100 text-purple-700 border-purple-200';
    default: return 'bg-slate-100 text-slate-700 border-slate-200';
  }
};

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

interface Trecho {
  id: string; // ID único para controle de renderização (React Key)
  ordem: number;
  pontoId: string;
  pontoNome: string;
  km: number;
  lat?: number;
  lon?: number;
}

interface Escola {
  id: string;
  name: string;
  endereco?: string;
}

interface PontoInteresse {
  id: string;
  nome: string;
  tipo: 'ESCOLA' | 'APOIO' | 'RESIDENCIA';
}

interface Diario {
  id: string;
  data: string;
  kmTotal: number;
  odometroInicial?: number;
  trechos: {
    ordem: number;
    pontoNome: string;
    kmTrecho: number;
  }[];
}

const getHeaders = () => {
  const token = localStorage.getItem('token');
  return { headers: { Authorization: `Bearer ${token}` } };
};

const getLocalToday = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

const getWeeksOfMonth = (year: number, month: number) => {
  const weeks: ({ day: number; dateStr: string } | null)[][] = [];
  const daysInMonth = new Date(year, month, 0).getDate();
  let currentWeek: ({ day: number; dateStr: string } | null)[] = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day);
    const dow = date.getDay();
    if (dow === 0 || dow === 6) continue;
    const weekdayIndex = dow - 1;

    if (weekdayIndex === 0 && currentWeek.length > 0) {
      // Preenche slots vazios no final da semana anterior
      while (currentWeek.length < 5) currentWeek.push(null);
      weeks.push(currentWeek);
      currentWeek = [];
    }
    // Preenche slots vazios no início
    while (currentWeek.length < weekdayIndex) currentWeek.push(null);
    const m = String(month).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    currentWeek.push({ day, dateStr: `${year}-${m}-${d}` });
  }
  if (currentWeek.length > 0) {
    while (currentWeek.length < 5) currentWeek.push(null);
    weeks.push(currentWeek);
  }
  return weeks;
};

const RoteiroForm: React.FC<{
  date: string;
  trechos: Trecho[];
  isSubmitting: boolean;
  onRemoveParada: (idx: number) => void;
  onUpdateKm: (idx: number, km: number) => void;
  onDelete: () => void;
  hasExisting: boolean;
  onClose: () => void;
  onSubmit: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  restricoesPorEscola: Record<string, any[]>;
}> = ({ date, trechos, isSubmitting, onRemoveParada, onUpdateKm, onDelete, hasExisting, onClose, onSubmit, restricoesPorEscola }) => {
  return (
    <>
      <DialogHeader className="p-6 border-b bg-slate-50">
        <div className="flex justify-between items-start">
          <div>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <MapPin className="h-5 w-5 text-blue-600" />
              Roteiro de {format(parseISO(date), 'dd/MM/yyyy')}
            </DialogTitle>
            <DialogDescription>Gerencie as paradas e quilometragem do dia.</DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 max-h-[60vh]">
        <div className="bg-slate-900 rounded-xl p-6 text-white flex justify-between items-center shadow-xl">
          <div className="flex flex-col">
            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Total do Dia</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-4xl font-black font-mono text-blue-400 tracking-tighter">
                {trechos.reduce((acc, t) => acc + (Number(t.km) || 0), 0).toFixed(1)}
              </span>
              <span className="text-lg font-bold text-slate-500">km</span>
            </div>
          </div>
          <div className="text-right">
            <span className="block text-[10px] font-bold text-slate-500 uppercase">Paradas</span>
            <span className="text-2xl font-black text-white">{trechos.length}</span>
          </div>
        </div>

        <div className="relative pl-6 space-y-4 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
          {trechos.length === 0 ? (
            <div className="py-8 text-center text-slate-400 border-2 border-dashed rounded-xl border-slate-100">
              <MapPin className="h-8 w-8 mx-auto mb-2 opacity-20" />
              <p className="text-xs font-medium">Nenhuma parada adicionada.<br />Use o seletor abaixo para iniciar.</p>
            </div>
          ) : (
            trechos.map((t, idx) => (
              <div key={t.id} className="relative flex flex-col gap-2">
                <div className={`absolute -left-[19px] top-4 h-3 w-3 rounded-full border-2 border-white ring-2 ${idx === 0 ? 'ring-blue-500 bg-blue-500' : idx === trechos.length - 1 ? 'ring-emerald-500 bg-emerald-500' : 'ring-slate-300 bg-slate-300'}`} />
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-4 md:p-2 mb-3 md:mb-1 border border-slate-200 md:border-none rounded-lg md:rounded-none bg-white md:bg-transparent shadow-sm md:shadow-none w-full group">
                  <div className="flex flex-col w-full md:flex-1 md:min-w-0">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Parada {t.ordem}</span>
                    <h3 className="text-base font-bold text-slate-800 whitespace-normal break-words leading-tight" title={t.pontoNome}>{t.pontoNome}</h3>
                    {restricoesPorEscola[t.pontoId] && restricoesPorEscola[t.pontoId].length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {restricoesPorEscola[t.pontoId].map((restricao: any, i: number) => (
                          <span key={i} className={`text-[8px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-tighter flex items-center gap-1 ${getCorRestricao(restricao.tipoDieta?.nome || '')}`}>
                            <ShieldPlus className="w-2 h-2 shrink-0" />
                            {restricao.quantidade} {restricao.tipoDieta?.nome}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-row justify-between md:justify-end items-center gap-4 w-full md:w-auto mt-2 md:mt-0 pt-3 md:pt-0 border-t border-slate-100 md:border-none shrink-0">
                    {idx > 0 ? (
                      <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                        KM: 
                        <Input
                          type="number"
                          step="0.1"
                          className={`w-16 md:w-20 text-center text-base md:text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${(t.km || 0) === 0 ? 'border-amber-300 bg-amber-50' : ''}`}
                          value={t.km || 0}
                          onChange={e => onUpdateKm(idx, Number(e.target.value))}
                        />
                      </label>
                    ) : <div className="flex-1 md:hidden"></div>}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemoveParada(idx)}
                      className="h-8 w-8 p-0 text-slate-300 hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <DialogFooter className="p-6 border-t bg-slate-50 flex gap-3 sm:justify-between">
        {hasExisting && (
          <Button variant="destructive" className="flex-1 bg-red-500 hover:bg-red-600 text-white" onClick={onDelete} disabled={isSubmitting}>
            Excluir Dia
          </Button>
        )}
        <Button variant="outline" className="flex-1" onClick={onClose} disabled={isSubmitting}>Cancelar</Button>
        <Button className="flex-1 bg-blue-600 text-white" onClick={onSubmit} disabled={isSubmitting}>
          {isSubmitting ? 'Salvando...' : 'Finalizar Dia'}
        </Button>
      </DialogFooter>
    </>
  );
};

export const DiarioBordo: React.FC = () => {
  const now = new Date();
  const [currentMonth, setCurrentMonth] = useState(now.getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [diarios, setDiarios] = useState<Diario[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [escolas, setEscolas] = useState<{ minhaRota: Escola[], outrasRotas: Escola[] }>({ minhaRota: [], outrasRotas: [] });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [pontos, setPontos] = useState<PontoInteresse[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [userProfile, setUserProfile] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [demandasRede, setDemandasRede] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const chaveStorage = `km_base_${currentYear}_${currentMonth}`;
  const [saldoInicialMes, setSaldoInicialMes] = useState<number>(() => Number(localStorage.getItem(chaveStorage)) || 0);
  const [kmInputTemp, setKmInputTemp] = useState<string>('');

  useEffect(() => {
    const valor = Number(localStorage.getItem(chaveStorage)) || 0;
    setSaldoInicialMes(valor);
    setKmInputTemp(valor > 0 ? valor.toString() : '');
  }, [currentMonth, currentYear, chaveStorage]);

  const handleMudancaSaldo = (valor: number) => {
    setSaldoInicialMes(valor);
    setKmInputTemp(valor > 0 ? valor.toString() : '');
    localStorage.setItem(chaveStorage, valor.toString());
  };

  const validarEConfirmarKm = (novoValorStr: string) => {
    const novoValor = Number(novoValorStr);
    
    // Se não mudou nada, apenas formata e sai
    if (novoValor === saldoInicialMes) {
      setKmInputTemp(saldoInicialMes > 0 ? saldoInicialMes.toString() : '');
      return;
    }

    // Se já havia um valor antes e está tentando mudar/apagar, pede confirmação
    if (saldoInicialMes > 0) {
      const confirmou = window.confirm(
        `Atenção!\n\nVocê está alterando o KM inicial do mês de ${saldoInicialMes} para ${novoValor || 0}.\nIsso recalculará a escada de odômetro de todos os dias deste mês.\n\nDeseja realmente aplicar essa alteração?`
      );
      
      if (!confirmou) {
        // Se cancelar, restaura o valor antigo no input
        setKmInputTemp(saldoInicialMes.toString());
        return;
      }
    }

    // Se confirmou (ou se era 0 e está preenchendo a primeira vez), salva
    handleMudancaSaldo(novoValor);
  };
  const [trechos, setTrechos] = useState<Trecho[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualEndereco, setManualEndereco] = useState('');
  const [manualLat, setManualLat] = useState('');
  const [manualLon, setManualLon] = useState('');
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportInicio, setExportInicio] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [exportFim, setExportFim] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [isExporting, setIsExporting] = useState(false);

  const { toast } = useToast();
  const todayStr = getLocalToday();

  const dataAtual = new Date();
  const [filtroInicio, setFiltroInicio] = useState(format(new Date(dataAtual.getFullYear(), dataAtual.getMonth(), 1), 'yyyy-MM-dd'));
  const [filtroFim, setFiltroFim] = useState(format(new Date(dataAtual.getFullYear(), dataAtual.getMonth(), 15), 'yyyy-MM-dd'));

  const fetchData = async () => {
    setLoading(true);
    try {
      const inicio = format(new Date(currentYear, currentMonth - 1, 1), 'yyyy-MM-dd');
      const fim = format(new Date(currentYear, currentMonth, 0), 'yyyy-MM-dd');
      const [escRes, pontoRes, diarioRes, userRes, demandasRes] = await Promise.allSettled([
        api.get('/escolas/diario/agrupadas', getHeaders()),
        api.get('/supervisao/pontos-interesse', getHeaders()),
        api.get(`/supervisao/diario-bordo?inicio=${inicio}&fim=${fim}`, getHeaders()),
        api.get('/auth/me', getHeaders()),
        api.get('/dietas/demandas', getHeaders())
      ]);
      setEscolas(escRes.status === 'fulfilled' ? (escRes.value.data || { minhaRota: [], outrasRotas: [] }) : { minhaRota: [], outrasRotas: [] });
      setPontos(pontoRes.status === 'fulfilled' ? (pontoRes.value.data || []) : []);
      setDiarios(diarioRes.status === 'fulfilled' ? (diarioRes.value.data || []) : []);
      setUserProfile(userRes.status === 'fulfilled' ? userRes.value.data : null);
      setDemandasRede(demandasRes.status === 'fulfilled' ? (demandasRes.value.data || []) : []);
    } catch (error) {
      console.error("Erro crítico no fetchData do Diário:", error);
    } finally {
      setLoading(false);
    }
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any

  useEffect(() => { fetchData(); }, [currentMonth, currentYear]);

  const restricoesPorEscola = useMemo(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mapa: Record<string, any[]> = {};
    demandasRede.forEach(d => {
      if (!mapa[d.escolaId]) mapa[d.escolaId] = [];
      mapa[d.escolaId].push(d);
    });
    return mapa;
  }, [demandasRede]);

  const diariosByDate = useMemo(() => {
    const map: Record<string, Diario> = {};
    if (Array.isArray(diarios)) {
      diarios.forEach(d => {
        if (d?.data) {
          const dateKey = typeof d.data === 'string' ? d.data.substring(0, 10) : '';
          if (dateKey) map[dateKey] = d;
        }
      });
    }
    return map;
  }, [diarios]);



  const weeks = useMemo(() => getWeeksOfMonth(currentYear, currentMonth), [currentYear, currentMonth]);
  
  const totalKmPeriodo = useMemo(() => {
    return (diarios || []).filter(d => {
      if (!d.data) return false;
      const dataDiario = typeof d.data === 'string' ? d.data.substring(0, 10) : '';
      return dataDiario >= filtroInicio && dataDiario <= filtroFim;
    }).reduce((acc, d) => acc + (Number(d.kmTotal) || 0), 0);
  }, [diarios, filtroInicio, filtroFim]);

  const handlePrevMonth = () => {
    if (currentMonth === 1) { setCurrentMonth(12); setCurrentYear(y => y - 1); }
    else setCurrentMonth(m => m - 1);
  };
  const handleNextMonth = () => {
    if (currentMonth === 12) { setCurrentMonth(1); setCurrentYear(y => y + 1); }
    else setCurrentMonth(m => m + 1);
  };

  const handleSelectDay = (dateStr: string) => {
    setSelectedDate(dateStr);
    const existing = diariosByDate[dateStr];
    if (existing) {
      setTrechos(existing.trechos?.map((t, idx) => ({
        id: `edit-${idx}-${Date.now()}`,
        ordem: t.ordem,
        pontoId: 'LEGACY_' + t.pontoNome,
        pontoNome: t.pontoNome,
        km: t.kmTrecho,
        lat: undefined, // Legacy data might not have coords
        lon: undefined
      })) || []);
    } else {
      if (userProfile?.latitudeResidencial) {
        setTrechos([{ 
          id: 'start-' + Date.now(), 
          ordem: 1, 
          pontoId: 'RESIDENCIA_ME', 
          pontoNome: 'Minha Residência', 
          km: 0,
          lat: userProfile.latitudeResidencial,
          lon: userProfile.longitudeResidencial
        }]);
      } else {
        setTrechos([]);
      }
    }
  };

  const handleAddParada = (value: string) => {
    if (value === 'MANUAL') { setIsManualModalOpen(true); return; }
    let nome = '';
    // Busca o nome na estrutura agrupada
    const todasEscolas = [...(escolas.minhaRota || []), ...(escolas.outrasRotas || [])];
    const escola = todasEscolas.find(e => e?.id === value);
    
    if (escola) nome = escola.name;
    else {
      const ponto = Array.isArray(pontos) ? pontos.find(p => p?.id === value) : null;
      if (ponto) nome = ponto.nome;
      else if (value === 'RESIDENCIA_ME') nome = 'Minha Residência';
    }
    if (!nome) return;
    executeAddParada(value, nome);
  };

  const executeAddParada = async (id: string, nome: string, lat?: string, lon?: string) => {
    const ultimo = trechos.length > 0 ? trechos[trechos.length - 1] : null;
    let kmSugerido = 0;
    if (ultimo) {
      try {
        const payload = { 
          origemId: ultimo.pontoId, 
          destinoId: id,
          origemManual: (ultimo.pontoId.startsWith('MANUAL_') || ultimo.pontoId === 'RESIDENCIA_ME') ? { lat: ultimo.lat, lon: ultimo.lon } : null,
          destinoManual: id.startsWith('MANUAL_') ? { lat: parseFloat(lat || '0'), lon: parseFloat(lon || '0') } : null
        };
        console.log('[DiarioBordo] Payload para cálculo:', payload);
        const res = await api.post('/supervisao/calcular-distancia', payload, getHeaders());
        console.log('[DiarioBordo] Resposta cálculo:', res.data);
        kmSugerido = res.data.km || 0;
      } catch (error) { console.warn('Falha OSRM:', error); }
    }
    setTrechos([...trechos, { 
      id: `t-${trechos.length}-${Date.now()}`, 
      ordem: trechos.length + 1, 
      pontoId: id, 
      pontoNome: nome, 
      km: kmSugerido,
      lat: lat ? parseFloat(lat) : undefined,
      lon: lon ? parseFloat(lon) : undefined
    }]);
  };

  const handleManualSmartPaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData('text');
    if (text.includes(',')) {
      e.preventDefault();
      const parts = text.split(',');
      setManualLat(parts[0].trim());
      setManualLon(parts[1].trim());
      toast({ 
        className: "bg-emerald-50 text-emerald-900 border-emerald-200", 
        title: "Smart Paste", 
        description: "Coordenadas extraídas." 
      });
    }
  };

  const handleUpdateKm = (idx: number, val: number) => {
    const novos = [...trechos];
    novos[idx].km = val;
    setTrechos(novos);
  };

  const handleRemoveParada = (idx: number) => {
    setTrechos(trechos.filter((_, i) => i !== idx).map((t, i) => ({ ...t, ordem: i + 1 })));
  };

  const handleSubmit = async () => {
    if (!selectedDate || trechos.length < 2) {
      toast({ variant: "destructive", title: "Atenção", description: "Roteiro incompleto." });
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = {
        data: selectedDate,
        kmTotal: trechos.reduce((acc, t) => acc + (t.km || 0), 0),
        trechos: trechos.map(t => ({ pontoNome: t.pontoNome, kmTrecho: t.km }))
      };
      await api.post('/supervisao/diario-bordo', payload, getHeaders());
      toast({ className: "bg-emerald-50 text-emerald-900 border-emerald-200", title: "Sucesso", description: "Salvo com sucesso." });
      setSelectedDate(null);
      fetchData();
    } catch (error) { toast({ variant: "destructive", title: "Erro", description: "Falha ao salvar." }); }
    finally { setIsSubmitting(false); }
  };

  const handleDeleteDiario = async () => {
    if (!selectedDate) return;
    if (!confirm('Tem certeza que deseja excluir todo o roteiro deste dia? Esta ação não pode ser desfeita.')) return;

    setIsSubmitting(true);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
    try {
      await api.delete(`/supervisao/diario-bordo?data=${selectedDate}`, getHeaders());
      toast({ title: "Sucesso", description: "Roteiro excluído com sucesso." });
      setSelectedDate(null);
      fetchData();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: error.response?.data?.error || "Erro ao excluir." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExport = () => {
    setIsExporting(true);
    setTimeout(() => {
      try {
        const diariosOrdenados = [...(diarios || [])].sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());
        
        let odoAcumulado = saldoInicialMes;
        const diariosFiltrados: Diario[] = [];

        diariosOrdenados.forEach(d => {
          const dataDiario = typeof d.data === 'string' ? d.data.substring(0, 10) : '';
          if (dataDiario < filtroInicio) {
            odoAcumulado += (Number(d.kmTotal) || 0);
          } else if (dataDiario >= filtroInicio && dataDiario <= filtroFim) {
            diariosFiltrados.push(d);
          }
        });

        if (diariosFiltrados.length === 0) {
          toast({ variant: "destructive", title: "Vazio", description: "Nenhum roteiro no período." });
          return;
        }

        gerarPlanilhaReembolso(diariosFiltrados, odoAcumulado);
        toast({ className: "bg-emerald-50 text-emerald-900 border-emerald-200", title: "Sucesso", description: "Planilha gerada com sucesso!" });
      } finally {
        setIsExporting(false);
      }
    }, 100);
  };

  const ultimoPontoId = (trechos?.length || 0) > 0 ? trechos[trechos.length - 1]?.pontoId : null;
  
  // Filtros para o Select agrupado
  const escolasDisponiveis = useMemo(() => ({
    minhaRota: (escolas.minhaRota || []).filter(e => e.id !== ultimoPontoId),
    outrasRotas: (escolas.outrasRotas || []).filter(e => e.id !== ultimoPontoId)
  }), [escolas, ultimoPontoId]);

  const pontosDisponiveis = Array.isArray(pontos) ? pontos.filter(p => p.id !== ultimoPontoId) : [];

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto flex flex-col gap-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-3">
            <CalendarDays className="h-6 w-6 md:h-8 md:w-8 text-blue-600" />
            Diário de Bordo
          </h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">Clique em um dia para gerenciar seu roteiro.</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-4 items-stretch bg-white p-2 rounded-lg border shadow-sm w-full lg:w-auto">
          <div className="flex flex-col justify-center gap-1 px-2 border-b lg:border-b-0 lg:border-r border-slate-100 pb-2 lg:pb-0">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Km Inicial do Mês</span>
            <div className="flex gap-2 items-center">
              <Input 
                type="number" 
                step="0.1"
                className="h-8 text-xs font-bold text-slate-700 w-full lg:w-24 text-center" 
                value={kmInputTemp} 
                onChange={e => setKmInputTemp(e.target.value)}
                onBlur={e => validarEConfirmarKm(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && validarEConfirmarKm(kmInputTemp)}
                placeholder="Ex: 115000.5"
              />
            </div>
          </div>

          <div className="flex flex-col justify-center gap-1 px-2 border-b lg:border-b-0 lg:border-r border-slate-100 pb-2 lg:pb-0">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Período de Apuração</span>
            <div className="flex flex-wrap sm:flex-nowrap gap-2 items-center">
              <Input type="date" className="h-8 text-xs w-full sm:w-auto" value={filtroInicio} onChange={e => setFiltroInicio(e.target.value)} />
              <span className="text-slate-300 text-xs font-bold w-full sm:w-auto text-center">até</span>
              <Input type="date" className="h-8 text-xs w-full sm:w-auto" value={filtroFim} onChange={e => setFiltroFim(e.target.value)} />
            </div>
          </div>

          <div className="bg-blue-50 rounded px-4 py-1 flex flex-col justify-center items-center lg:items-end min-w-[120px]">
            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Total no Período</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-blue-900">{totalKmPeriodo.toFixed(1)}</span>
              <span className="text-sm font-bold text-blue-700">km</span>
            </div>
          </div>

          <Button onClick={handleExport} className="h-12 lg:h-auto bg-emerald-600 hover:bg-emerald-700 text-white flex flex-row lg:flex-col gap-2 lg:gap-1 items-center justify-center px-4">
            <FileSpreadsheet className="h-4 w-4" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Baixar Excel</span>
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-center gap-4 bg-white rounded-lg border border-slate-200 shadow-sm p-3">
        <Button variant="outline" size="sm" onClick={handlePrevMonth}><ChevronLeft className="h-4 w-4" /></Button>
        <h2 className="text-xl font-bold text-slate-800 min-w-[220px] text-center">{MESES[currentMonth - 1]} de {currentYear}</h2>
        <Button variant="outline" size="sm" onClick={handleNextMonth}><ChevronRight className="h-4 w-4" /></Button>
      </div>

      <div className="w-full pb-6">
        {loading ? (
          <div className="py-20 text-center text-slate-400">Carregando...</div>
        ) : (
          <div className="flex flex-col gap-4 w-full min-w-0 lg:min-w-[1000px]">
            {/* Cabeçalho da grade (5 colunas) */}
            <div className="hidden lg:grid grid-cols-5 gap-4">
              {['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'].map((dia) => (
                <div key={dia} className="bg-slate-800 text-white text-center text-sm font-semibold py-2.5 rounded-t-md">
                  {dia}
                </div>
              ))}
            </div>

            {/* Renderização das Semanas */}
            {weeks.map((week, weekIdx) => (
              <div key={weekIdx} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {week.map((slot, dayIdx) => {
                  // CARD VAZIO (Exatamente como no Cardápio)
                  if (!slot) {
                    return <div key={dayIdx} className="hidden lg:block min-h-[120px] bg-slate-50 rounded-md border border-slate-100" />;
                  }

                  const d = diariosByDate[slot.dateStr];
                  const isToday = slot.dateStr === todayStr;

                  return (
                    <button 
                      key={dayIdx}
                      onClick={() => handleSelectDay(slot.dateStr)}
                      className={`min-h-[140px] rounded-xl border p-3 flex flex-col gap-2 transition-all cursor-pointer shadow-sm group relative ${
                        isToday
                          ? 'bg-orange-50 border-orange-300 ring-2 ring-orange-200'
                          : 'bg-white border-slate-200 hover:border-blue-400 hover:shadow-md'
                      }`}
                    >
                      {/* Número do dia */}
                      <div className="flex justify-between items-center h-5 w-full">
                        <span className={`text-xl font-bold ${isToday ? 'text-orange-700' : 'text-slate-800'}`}>
                          {slot.day} <span className="lg:hidden ml-1 text-slate-500 text-xs font-semibold">({['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'][dayIdx]})</span>
                        </span>
                        <div className="flex items-center gap-1">
                          {isToday && (
                            <span className="text-[8px] font-bold bg-orange-600 text-white px-1.5 py-0.5 rounded">HOJE</span>
                          )}
                        </div>
                      </div>

                      {/* Conteúdo interno do diário (km, status, etc) */}
                      <div className="mt-auto w-full flex items-center justify-between pt-1.5 border-t border-slate-50">
                        {d ? (
                          <span className="text-[11px] font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100/50">
                            {(d.kmTotal || 0).toFixed(1)} KM
                          </span>
                        ) : (
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">
                            Preencher
                          </span>
                        )}
                        <ChevronRight className="w-4 h-4 text-slate-400 lg:hidden" />
                      </div>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!selectedDate} onOpenChange={open => !open && setSelectedDate(null)}>
        <DialogContent 
          className="sm:max-w-[500px] bg-white p-0 overflow-hidden shadow-2xl border-none"
          onInteractOutside={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          {selectedDate && (
            <div className="flex flex-col h-full max-h-[90vh]">
              <RoteiroForm 
                date={selectedDate} trechos={trechos} isSubmitting={isSubmitting} 
                onRemoveParada={handleRemoveParada} onUpdateKm={handleUpdateKm} 
                onDelete={handleDeleteDiario} hasExisting={!!diariosByDate[selectedDate]}
                onClose={() => setSelectedDate(null)} onSubmit={handleSubmit}
                restricoesPorEscola={restricoesPorEscola}
              />
              <div className="p-6 pt-0 bg-slate-50 border-t">
                <div className="pt-4">
                  <Label className="text-[10px] font-bold text-slate-500 uppercase mb-2 block">Novo Destino</Label>
                  <Select onValueChange={handleAddParada}>
                    <SelectTrigger className="w-full bg-blue-50 border-blue-200 text-blue-700 font-bold">
                      <Plus className="mr-2 h-4 w-4" /> <SelectValue placeholder="Adicionar parada..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px] bg-white z-[100] shadow-2xl border">
                      <SelectGroup>
                        <SelectLabel>Atalhos</SelectLabel>
                        <SelectItem value="RESIDENCIA_ME">🏠 Minha Residência</SelectItem>
                        <SelectItem value="MANUAL">✍️ Destino Manual</SelectItem>
                      </SelectGroup>
                      {pontosDisponiveis.length > 0 && (
                        <SelectGroup>
                          <SelectLabel>Pontos de Apoio</SelectLabel>
                          {pontosDisponiveis.map(p => <SelectItem key={p.id} value={p.id}>🏢 {p.nome}</SelectItem>)}
                        </SelectGroup>
                      )}
                      <SelectGroup>
                        <SelectLabel>Minha Rota</SelectLabel>
                        {escolasDisponiveis.minhaRota.map(e => <SelectItem key={e.id} value={e.id}>🏫 {e.name}</SelectItem>)}
                      </SelectGroup>
                      {escolasDisponiveis.outrasRotas.length > 0 && (
                        <SelectGroup>
                          <SelectLabel>Outras Rotas</SelectLabel>
                          {escolasDisponiveis.outrasRotas.map(e => <SelectItem key={e.id} value={e.id}>🌍 {e.name}</SelectItem>)}
                        </SelectGroup>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isManualModalOpen} onOpenChange={setIsManualModalOpen}>
        <DialogContent 
          className="sm:max-w-[450px] bg-white border-none p-0 overflow-hidden shadow-2xl rounded-2xl"
          onInteractOutside={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader className="bg-slate-900 text-white p-6">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <MapPin className="h-5 w-5 text-blue-400" />
              Destino Manual
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Adicione uma parada personalizada ao seu roteiro.
            </DialogDescription>
          </DialogHeader>
          
          <div className="p-6 space-y-4 bg-white">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase text-slate-500 ml-1">Nome do Local</Label>
              <Input 
                autoFocus 
                placeholder="Ex: Posto, Cartório, Oficina..." 
                value={manualName} 
                onChange={e => setManualName(e.target.value)} 
                className="h-11 bg-slate-50 border-slate-200"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase text-slate-500 ml-1">Endereço (Opcional)</Label>
              <div className="flex gap-2">
                <Input 
                  placeholder="Rua, Número..." 
                  value={manualEndereco} 
                  onChange={e => setManualEndereco(e.target.value)} 
                  className="h-11 bg-slate-50 border-slate-200 flex-1"
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  size="icon" 
                  className="shrink-0 h-11 w-11 border-blue-200 text-blue-600 hover:bg-blue-50"
                  onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(manualEndereco || manualName)}`, '_blank')}
                  title="Pesquisar no Google Maps"
                >
                  <MapIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase text-slate-400 ml-1">Latitude</Label>
                <Input 
                  placeholder="-23.5..." 
                  value={manualLat} 
                  onChange={e => setManualLat(e.target.value)} 
                  onPaste={handleManualSmartPaste}
                  className="h-11 bg-slate-50 border-slate-200 font-mono text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase text-slate-400 ml-1">Longitude</Label>
                <Input 
                  placeholder="-46.6..." 
                  value={manualLon} 
                  onChange={e => setManualLon(e.target.value)} 
                  className="h-11 bg-slate-50 border-slate-200 font-mono text-xs"
                />
              </div>
            </div>
            
            <p className="text-[10px] text-amber-600 font-bold uppercase leading-tight bg-amber-50 p-2 rounded border border-amber-100">
              Dica: Cole as coordenadas completas na Latitude para preencher ambos.
            </p>
          </div>

          <DialogFooter className="p-6 bg-slate-50 border-t flex flex-row gap-3">
            <Button variant="ghost" onClick={() => setIsManualModalOpen(false)} className="flex-1 font-bold text-slate-500">Cancelar</Button>
            <Button 
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold" 
              onClick={() => {
                executeAddParada('MANUAL_'+Date.now(), manualName, manualLat, manualLon); 
                setManualName(''); setManualEndereco(''); setManualLat(''); setManualLon(''); 
                setIsManualModalOpen(false);
              }}
              disabled={!manualName}
            >
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isExportModalOpen} onOpenChange={setIsExportModalOpen}>
        <DialogContent className="sm:max-w-[450px] bg-white border shadow-2xl">
          <DialogHeader><DialogTitle>Exportar Reembolso</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2"><Label>Início</Label><Input type="date" value={exportInicio} onChange={e => setExportInicio(e.target.value)} /></div>
            <div className="space-y-2"><Label>Fim</Label><Input type="date" value={exportFim} onChange={e => setExportFim(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsExportModalOpen(false)}>Cancelar</Button>
            <Button className="bg-emerald-600 text-white" onClick={handleExport} disabled={isExporting}>{isExporting ? 'Processando...' : 'Baixar Excel'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
