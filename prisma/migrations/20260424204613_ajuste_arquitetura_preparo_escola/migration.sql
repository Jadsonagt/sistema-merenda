/*
  Warnings:

  - You are about to drop the `ficha_tecnica_ingredientes` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ficha_tecnica_ingredientes" DROP CONSTRAINT "ficha_tecnica_ingredientes_fichaId_fkey";

-- DropForeignKey
ALTER TABLE "ficha_tecnica_ingredientes" DROP CONSTRAINT "ficha_tecnica_ingredientes_itemId_fkey";

-- DropTable
DROP TABLE "ficha_tecnica_ingredientes";

-- CreateTable
CREATE TABLE "preparos_escola" (
    "id" TEXT NOT NULL,
    "escolaId" TEXT NOT NULL,
    "fichaTecnicaId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "preparos_escola_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "preparo_ingredientes" (
    "id" TEXT NOT NULL,
    "preparoEscolaId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantidade" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "preparo_ingredientes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "preparos_escola_escolaId_fichaTecnicaId_key" ON "preparos_escola"("escolaId", "fichaTecnicaId");

-- AddForeignKey
ALTER TABLE "preparos_escola" ADD CONSTRAINT "preparos_escola_escolaId_fkey" FOREIGN KEY ("escolaId") REFERENCES "escolas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preparos_escola" ADD CONSTRAINT "preparos_escola_fichaTecnicaId_fkey" FOREIGN KEY ("fichaTecnicaId") REFERENCES "fichas_tecnicas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preparo_ingredientes" ADD CONSTRAINT "preparo_ingredientes_preparoEscolaId_fkey" FOREIGN KEY ("preparoEscolaId") REFERENCES "preparos_escola"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preparo_ingredientes" ADD CONSTRAINT "preparo_ingredientes_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "itens"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
