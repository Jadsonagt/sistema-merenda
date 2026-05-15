import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Busca a senha do .env (Produção) ou usa um padrão (Desenvolvimento Local)
  const senhaInicial = process.env.SENHA_ADMIN_INICIAL || '123456';
  const passwordHash = await bcrypt.hash(senhaInicial, 10);

  // Garantindo que o usuário ADMIN exista após o reset
  const admin = await prisma.usuario.upsert({
    where: { email: 'admin@merenda.gov.br' },
    update: { senha: passwordHash, role: Role.ADMIN },
    create: {
      nome: 'Administrador Central',
      email: 'admin@merenda.gov.br',
      senha: passwordHash,
      role: Role.ADMIN
    }
  });

  console.log('Usuário ADMIN configurado:', admin.email);

  // Criando um Supervisor de Testes
  const supervisor = await prisma.usuario.upsert({
    where: { email: 'supervisao@merenda.gov.br' },
    update: { senha: passwordHash, role: Role.SUPERVISORA },
    create: {
      nome: 'Supervisor de Teste',
      email: 'supervisao@merenda.gov.br',
      senha: passwordHash,
      role: Role.SUPERVISORA
    }
  });

  console.log('Usuário SUPERVISOR configurado:', supervisor.email);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
