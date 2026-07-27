-- CreateEnum
CREATE TYPE "AccessoryCategory" AS ENUM ('Charger', 'Cover', 'Screen Protector', 'Cable', 'Earphones', 'Other');

-- CreateTable
CREATE TABLE "accessory_lots" (
    "id" TEXT NOT NULL,
    "supplier_id" TEXT,
    "name" TEXT NOT NULL,
    "category" "AccessoryCategory" NOT NULL,
    "total_pieces" INTEGER NOT NULL,
    "total_cost" DECIMAL(12,2) NOT NULL,
    "amount_paid" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "accessory_lots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accessory_lot_payments" (
    "id" TEXT NOT NULL,
    "lot_id" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "paid_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "recorded_by" TEXT NOT NULL,

    CONSTRAINT "accessory_lot_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accessory_sales" (
    "id" TEXT NOT NULL,
    "lot_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "selling_price_per_piece" DECIMAL(12,2) NOT NULL,
    "total_selling_price" DECIMAL(12,2) NOT NULL,
    "amount_received" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "sale_type" "SaleType" NOT NULL,
    "shop_buyer_id" TEXT,
    "customer_name" TEXT,
    "sold_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "sold_by" TEXT NOT NULL,

    CONSTRAINT "accessory_sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accessory_sale_payments" (
    "id" TEXT NOT NULL,
    "sale_id" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "recorded_by" TEXT NOT NULL,

    CONSTRAINT "accessory_sale_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "accessory_lots_supplier_id_idx" ON "accessory_lots"("supplier_id");

-- CreateIndex
CREATE INDEX "accessory_lots_created_at_idx" ON "accessory_lots"("created_at");

-- CreateIndex
CREATE INDEX "accessory_lot_payments_lot_id_idx" ON "accessory_lot_payments"("lot_id");

-- CreateIndex
CREATE INDEX "accessory_sales_sold_at_idx" ON "accessory_sales"("sold_at");

-- CreateIndex
CREATE INDEX "accessory_sales_sale_type_idx" ON "accessory_sales"("sale_type");

-- CreateIndex
CREATE INDEX "accessory_sales_shop_buyer_id_idx" ON "accessory_sales"("shop_buyer_id");

-- CreateIndex
CREATE INDEX "accessory_sale_payments_sale_id_idx" ON "accessory_sale_payments"("sale_id");

-- AddForeignKey
ALTER TABLE "accessory_lots" ADD CONSTRAINT "accessory_lots_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accessory_lots" ADD CONSTRAINT "accessory_lots_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accessory_lot_payments" ADD CONSTRAINT "accessory_lot_payments_lot_id_fkey" FOREIGN KEY ("lot_id") REFERENCES "accessory_lots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accessory_lot_payments" ADD CONSTRAINT "accessory_lot_payments_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accessory_sales" ADD CONSTRAINT "accessory_sales_lot_id_fkey" FOREIGN KEY ("lot_id") REFERENCES "accessory_lots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accessory_sales" ADD CONSTRAINT "accessory_sales_shop_buyer_id_fkey" FOREIGN KEY ("shop_buyer_id") REFERENCES "shop_buyers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accessory_sales" ADD CONSTRAINT "accessory_sales_sold_by_fkey" FOREIGN KEY ("sold_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accessory_sale_payments" ADD CONSTRAINT "accessory_sale_payments_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "accessory_sales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accessory_sale_payments" ADD CONSTRAINT "accessory_sale_payments_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
