import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Convertendo usuários SUPERVISOR para SUPERVISORA...');
  const result = await (prisma as any).usuario.updateMany({
    where: { role: 'SUPERVISOR' },
    data: { role: 'SUPERVISORA' }
  });
  console.log(`Concluído. ${result.count} usuários atualizados.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
