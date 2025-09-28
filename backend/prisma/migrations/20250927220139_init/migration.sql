-- CreateTable
CREATE TABLE "public"."User" (
    "id" SERIAL NOT NULL,
    "publicKey" TEXT NOT NULL,
    "hashedData" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_publicKey_key" ON "public"."User"("publicKey");
