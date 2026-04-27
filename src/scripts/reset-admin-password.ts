import { prisma } from '../lib/prisma.js';
import bcrypt from 'bcrypt';

async function resetAdminPassword() {
  try {
    const adminUser = await prisma.usuario.findFirst({
      where: {
        role: 'ADMIN',
      },
    });

    if (!adminUser) {
      console.log('Nenhum usuário com a role ADMIN foi encontrado no banco de dados.');
      return;
    }

    const newPassword = 'Admin123!';
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    await prisma.usuario.update({
      where: {
        id: adminUser.id,
      },
      data: {
        senha: hashedPassword,
      },
    });

    console.log(`Sucesso: Senha do administrador (${adminUser.email}) foi redefinida para '${newPassword}'.`);
  } catch (error) {
    console.error('Erro ao tentar redefinir a senha do administrador:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetAdminPassword();
