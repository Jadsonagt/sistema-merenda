import * as XLSX from 'xlsx';
import { format, parseISO } from 'date-fns';

// Não há mais arredondamento customizado, os valores serão exatos com 1 casa decimal. - Forçar Deploy Vercel

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
      const N = d.trechos.length;

      if (N === 2) {
        // Fallback: Apenas 1 trecho
        const origem = d.trechos[0].pontoNome;
        const destino = d.trechos[1].pontoNome;
        const kmExato = Number(d.trechos[1].kmTrecho) || 0;
        const km = Number(kmExato.toFixed(1));
        const valor = km * 1.00;

        const saida = odometroAtual;
        const retorno = odometroAtual + km;

        linhas.push({
          'DATA': dataFormatada,
          'SAÍDA': saida.toString(),
          'RETORNO': retorno.toString(),
          'SIGLA': 'R/T/R',
          'KM RODADOS': km.toString(),
          'VALOR R$ 1,00': `R$ ${valor.toFixed(2).replace('.', ',')}`,
          'PED. R$': '',
          'ESTAC. R$': '',
          'OBSERVAÇÕES': `${origem}, ${destino}`
        });

        odometroAtual = retorno;
      } else {
        // Ida: Primeiro trecho (índice 1)
        const origemIda = d.trechos[0].pontoNome;
        const destinoIda = d.trechos[1].pontoNome;
        const kmExatoIda = Number(d.trechos[1].kmTrecho) || 0;
        const kmIda = Number(kmExatoIda.toFixed(1));
        const valorIda = kmIda * 1.00;

        const saidaIda = odometroAtual;
        const retornoIda = odometroAtual + kmIda;

        linhas.push({
          'DATA': dataFormatada,
          'SAÍDA': saidaIda.toString(),
          'RETORNO': retornoIda.toString(),
          'SIGLA': 'R/T/R',
          'KM RODADOS': kmIda.toString(),
          'VALOR R$ 1,00': `R$ ${valorIda.toFixed(2).replace('.', ',')}`,
          'PED. R$': '',
          'ESTAC. R$': '',
          'OBSERVAÇÕES': `${origemIda}, ${destinoIda}`
        });

        odometroAtual = retornoIda;

        // Supervisão/Miolo: Índices 2 até N-2 (se houver, ou seja, N >= 4)
        if (N >= 4) {
          let kmExatoMiolo = 0;
          for (let j = 2; j <= N - 2; j++) {
            kmExatoMiolo += Number(d.trechos[j].kmTrecho) || 0;
          }
          const kmMiolo = Number(kmExatoMiolo.toFixed(1));
          const valorMiolo = kmMiolo * 1.00;

          const saidaMiolo = odometroAtual;
          const retornoMiolo = odometroAtual + kmMiolo;

          const pontosMiolo: string[] = [];
          for (let j = 1; j <= N - 2; j++) {
            pontosMiolo.push(d.trechos[j].pontoNome);
          }
          const obsMiolo = pontosMiolo.join(', ');

          linhas.push({
            'DATA': dataFormatada,
            'SAÍDA': saidaMiolo.toString(),
            'RETORNO': retornoMiolo.toString(),
            'SIGLA': 'SUP',
            'KM RODADOS': kmMiolo.toString(),
            'VALOR R$ 1,00': `R$ ${valorMiolo.toFixed(2).replace('.', ',')}`,
            'PED. R$': '',
            'ESTAC. R$': '',
            'OBSERVAÇÕES': obsMiolo
          });

          odometroAtual = retornoMiolo;
        }

        // Volta: Último trecho (índice N-1)
        const origemVolta = d.trechos[N - 2].pontoNome;
        const destinoVolta = d.trechos[N - 1].pontoNome;
        const kmExatoVolta = Number(d.trechos[N - 1].kmTrecho) || 0;
        const kmVolta = Number(kmExatoVolta.toFixed(1));
        const valorVolta = kmVolta * 1.00;

        const saidaVolta = odometroAtual;
        const retornoVolta = odometroAtual + kmVolta;

        linhas.push({
          'DATA': dataFormatada,
          'SAÍDA': saidaVolta.toString(),
          'RETORNO': retornoVolta.toString(),
          'SIGLA': 'R/T/R',
          'KM RODADOS': kmVolta.toString(),
          'VALOR R$ 1,00': `R$ ${valorVolta.toFixed(2).replace('.', ',')}`,
          'PED. R$': '',
          'ESTAC. R$': '',
          'OBSERVAÇÕES': `${origemVolta}, ${destinoVolta}`
        });

        odometroAtual = retornoVolta;
      }
    }
  });

  const ws = XLSX.utils.json_to_sheet(linhas);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Reembolso");
  XLSX.writeFile(wb, "Diario_Votorantim_NOVO.xlsx");
};
