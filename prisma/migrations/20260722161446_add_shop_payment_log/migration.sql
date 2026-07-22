-- CreateTable
CREATE TABLE "shop_payment_logs" (
    "id" TEXT NOT NULL,
    "shop_buyer_id" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "recorded_by" TEXT NOT NULL,

    CONSTRAINT "shop_payment_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "shop_payment_logs_shop_buyer_id_idx" ON "shop_payment_logs"("shop_buyer_id");

-- AddForeignKey
ALTER TABLE "shop_payment_logs" ADD CONSTRAINT "shop_payment_logs_shop_buyer_id_fkey" FOREIGN KEY ("shop_buyer_id") REFERENCES "shop_buyers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_payment_logs" ADD CONSTRAINT "shop_payment_logs_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
