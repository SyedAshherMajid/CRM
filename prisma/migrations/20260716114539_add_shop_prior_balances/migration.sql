-- CreateTable
CREATE TABLE "shop_prior_balances" (
    "id" TEXT NOT NULL,
    "shop_buyer_id" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "amount_paid" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "description" TEXT NOT NULL,
    "recorded_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shop_prior_balances_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "shop_prior_balances_shop_buyer_id_idx" ON "shop_prior_balances"("shop_buyer_id");

-- AddForeignKey
ALTER TABLE "shop_prior_balances" ADD CONSTRAINT "shop_prior_balances_shop_buyer_id_fkey" FOREIGN KEY ("shop_buyer_id") REFERENCES "shop_buyers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_prior_balances" ADD CONSTRAINT "shop_prior_balances_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
