-- CreateEnum
CREATE TYPE "TipoRefeicao" AS ENUM ('DESJEJUM', 'MERENDA');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'SUPERVISOR', 'SUPERVISORA');

-- CreateEnum
CREATE TYPE "MovimentacaoType" AS ENUM ('IN', 'OUT', 'TRANSFER', 'ADJUSTMENT', 'CONSUMPTION');

-- CreateEnum
CREATE TYPE "PlanejamentoStatus" AS ENUM ('DRAFT', 'FROZEN');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'SUPERVISORA',
    "rotaId" TEXT,
    "resetToken" TEXT,
    "resetTokenExpires" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rotas" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rotas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "escolas" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "rotaId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "escolas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "itens" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "baseUnit" TEXT NOT NULL,
    "packagingSize" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "itens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fichas_tecnicas" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fichas_tecnicas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ficha_tecnica_ingredientes" (
    "id" TEXT NOT NULL,
    "fichaId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantityInBaseUnit" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ficha_tecnica_ingredientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "estoque_atual" (
    "id" TEXT NOT NULL,
    "escolaId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantityInteger" INTEGER NOT NULL,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "estoque_atual_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "planejamento_mensal" (
    "id" TEXT NOT NULL,
    "escolaId" TEXT NOT NULL,
    "fichaId" TEXT NOT NULL,
    "frequency" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "status" "PlanejamentoStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "planejamento_mensal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimentacoes" (
    "id" TEXT NOT NULL,
    "escolaId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "type" "MovimentacaoType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "numeroGuia" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movimentacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "metas_preparo" (
    "id" TEXT NOT NULL,
    "escolaId" TEXT NOT NULL,
    "fichaId" TEXT NOT NULL,
    "quantidadePadrao" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "metas_preparo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cardapios" (
    "id" TEXT NOT NULL,
    "data_agendada" TIMESTAMP(3) NOT NULL,
    "descricao" TEXT,
    "isFeriado" BOOLEAN NOT NULL DEFAULT false,
    "tipos_escola" TEXT[],
    "fichaTecnicaId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cardapios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consumos_fixos" (
    "id" TEXT NOT NULL,
    "escolaId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "consumos_fixos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "estoque_atual_escolaId_itemId_key" ON "estoque_atual"("escolaId", "itemId");

-- CreateIndex
CREATE UNIQUE INDEX "metas_preparo_escolaId_fichaId_key" ON "metas_preparo"("escolaId", "fichaId");

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_rotaId_fkey" FOREIGN KEY ("rotaId") REFERENCES "rotas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "escolas" ADD CONSTRAINT "escolas_rotaId_fkey" FOREIGN KEY ("rotaId") REFERENCES "rotas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ficha_tecnica_ingredientes" ADD CONSTRAINT "ficha_tecnica_ingredientes_fichaId_fkey" FOREIGN KEY ("fichaId") REFERENCES "fichas_tecnicas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ficha_tecnica_ingredientes" ADD CONSTRAINT "ficha_tecnica_ingredientes_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "itens"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estoque_atual" ADD CONSTRAINT "estoque_atual_escolaId_fkey" FOREIGN KEY ("escolaId") REFERENCES "escolas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estoque_atual" ADD CONSTRAINT "estoque_atual_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "itens"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planejamento_mensal" ADD CONSTRAINT "planejamento_mensal_escolaId_fkey" FOREIGN KEY ("escolaId") REFERENCES "escolas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planejamento_mensal" ADD CONSTRAINT "planejamento_mensal_fichaId_fkey" FOREIGN KEY ("fichaId") REFERENCES "fichas_tecnicas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentacoes" ADD CONSTRAINT "movimentacoes_escolaId_fkey" FOREIGN KEY ("escolaId") REFERENCES "escolas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentacoes" ADD CONSTRAINT "movimentacoes_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "itens"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metas_preparo" ADD CONSTRAINT "metas_preparo_escolaId_fkey" FOREIGN KEY ("escolaId") REFERENCES "escolas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metas_preparo" ADD CONSTRAINT "metas_preparo_fichaId_fkey" FOREIGN KEY ("fichaId") REFERENCES "fichas_tecnicas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cardapios" ADD CONSTRAINT "cardapios_fichaTecnicaId_fkey" FOREIGN KEY ("fichaTecnicaId") REFERENCES "fichas_tecnicas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consumos_fixos" ADD CONSTRAINT "consumos_fixos_escolaId_fkey" FOREIGN KEY ("escolaId") REFERENCES "escolas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consumos_fixos" ADD CONSTRAINT "consumos_fixos_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "itens"("id") ON DELETE CASCADE ON UPDATE CASCADE;
