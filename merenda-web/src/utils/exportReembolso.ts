import * as XLSX from 'xlsx';
import { format, parseISO } from 'date-fns';

// Regra de negócio: 7.4 -> 8.0 | 7.3 -> 7.0
const arredondarCustomizado = (valor: number): number => {
  const decimal = valor - Math.floor(valor);
  return decimal >= 0.4 ? Math.ceil(valor) : Math.floor(valor);
};

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
export const gerarPlanilhaReembolso = (diarios: any[], odometroLargada: number) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const linhas: any[] = [];
  const diariosOrdenados = [...diarios].sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());

  let odometroAtual = Math.round(odometroLargada);

  diariosOrdenados.forEach((d) => {
    const dataFormatada = format(parseISO(d.data), 'dd/MM/yyyy');

    if (d.trechos && d.trechos.length > 1) {
      for (let i = 1; i < d.trechos.length; i++) {
        const origem = d.trechos[i - 1].pontoNome;
        const destino = d.trechos[i].pontoNome;
        
        // Aplica o arredondamento customizado antes de qualquer cálculo financeiro ou de odômetro
        const kmExato = Number(d.trechos[i].kmTrecho) || 0;
        const km = arredondarCustomizado(kmExato);

        const isRTR = origem.toLowerCase().includes('residência') || destino.toLowerCase().includes('residência');
        const sigla = isRTR ? 'R/T/R' : 'SUP';

        const km66 = isRTR ? km : 0;
        const km92 = !isRTR ? km : 0;

        const valor66 = km66 * 0.66;
        const valor92 = km92 * 0.92;

        const saida = odometroAtual;
        const retorno = odometroAtual + km;

        linhas.push({
          'DATA': dataFormatada,
          'SAÍDA': saida.toString(),
          'RETORNO': retorno.toString(),
          'sigla': sigla,
          'Rodados KM 0,66': km66 > 0 ? km66.toString() : '0',
          'Rodados KM 0,92': km92 > 0 ? km92.toString() : '0',
          'R$ 0,66': valor66 > 0 ? `R$ ${valor66.toFixed(2).replace('.', ',')}` : '-',
          'R$ 0,92': valor92 > 0 ? `R$ ${valor92.toFixed(2).replace('.', ',')}` : '-',
          'PED. R$': '',
          'ESTAC. R$': '',
          'OBSERVAÇÕES': `${origem}, ${destino}`
        });

        odometroAtual = retorno;
      }
    }
  });

  const ws = XLSX.utils.json_to_sheet(linhas);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Reembolso");
  XLSX.writeFile(wb, `Reembolso_${format(new Date(), 'ddMMyyyy_HHmm')}.xlsx`);
};
