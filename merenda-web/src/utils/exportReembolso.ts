import * as XLSX from 'xlsx';
import { format, parseISO } from 'date-fns';

// Não há mais arredondamento customizado, os valores serão exatos com 1 casa decimal.

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
export const gerarPlanilhaReembolso = (diarios: any[], odometroLargada: number) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const linhas: any[] = [];
  const diariosOrdenados = [...diarios].sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());

  let odometroAtual = Number(Number(odometroLargada).toFixed(1));

  diariosOrdenados.forEach((d) => {
    const dataFormatada = format(parseISO(d.data), 'dd/MM/yyyy');

    if (d.trechos && d.trechos.length > 1) {
      for (let i = 1; i < d.trechos.length; i++) {
        const origem = d.trechos[i - 1].pontoNome;
        const destino = d.trechos[i].pontoNome;
        
        // Aplica o arredondamento customizado antes de qualquer cálculo financeiro ou de odômetro
        const kmExato = Number(d.trechos[i].kmTrecho) || 0;
        const km = Number(kmExato.toFixed(1));

        const valor = km * 1.00;

        const saida = odometroAtual;
        const retorno = odometroAtual + km;

        linhas.push({
          'DATA': dataFormatada,
          'SAÍDA': saida.toString(),
          'RETORNO': retorno.toString(),
          'KM RODADOS': km.toString(),
          'VALOR A RECEBER': `R$ ${valor.toFixed(2).replace('.', ',')}`,
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
