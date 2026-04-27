import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const escolas = await prisma.escola.findMany();
  console.log('Escolas:', escolas);

  const estoques = await prisma.estoqueAtual.findMany({
    include: { item: true }
  });
  console.log('Estoque Atual:', JSON.stringify(estoques, null, 2));
}

main().finally(() => prisma.$disconnect());
