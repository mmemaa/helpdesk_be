-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "slaBreached" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "slaNotified" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "SLAHistory" (
    "id" SERIAL NOT NULL,
    "ticketId" INTEGER NOT NULL,
    "breachedAt" TIMESTAMP(3) NOT NULL,
    "notifiedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SLAHistory_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "SLAHistory" ADD CONSTRAINT "SLAHistory_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
