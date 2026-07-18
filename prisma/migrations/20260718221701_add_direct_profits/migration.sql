-- CreateTable
CREATE TABLE "direct_profits" (
    "id" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "description" VARCHAR(150) NOT NULL,
    "profit_date" TIMESTAMP(3) NOT NULL,
    "recorded_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "direct_profits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "direct_profits_profit_date_idx" ON "direct_profits"("profit_date");

-- AddForeignKey
ALTER TABLE "direct_profits" ADD CONSTRAINT "direct_profits_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
