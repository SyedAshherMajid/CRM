-- CreateEnum
CREATE TYPE "Brand" AS ENUM ('iPhone', 'Google Pixel');

-- CreateEnum
CREATE TYPE "PtaStatus" AS ENUM ('JV', 'PTA', 'Non-PTA', 'Patched', 'CPID');

-- CreateEnum
CREATE TYPE "Storage" AS ENUM ('64GB', '128GB', '256GB', '512GB', '1TB');

-- CreateEnum
CREATE TYPE "Condition" AS ENUM ('New', 'Like New', 'Good', 'Fair', 'Poor', 'Refurbished');

-- CreateEnum
CREATE TYPE "PhoneStatus" AS ENUM ('available', 'sold', 'defective', 'returned');

-- CreateEnum
CREATE TYPE "SaleType" AS ENUM ('customer', 'shop');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_lots" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "supplier_id" TEXT,
    "total_amount" DECIMAL(12,2) NOT NULL,
    "amount_paid" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "purchase_lots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lot_payments" (
    "id" TEXT NOT NULL,
    "lot_id" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "paid_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "recorded_by" TEXT NOT NULL,

    CONSTRAINT "lot_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "phones" (
    "id" TEXT NOT NULL,
    "lot_id" TEXT NOT NULL,
    "brand" "Brand" NOT NULL,
    "model" TEXT NOT NULL,
    "storage" "Storage" NOT NULL,
    "color" TEXT NOT NULL,
    "imei" TEXT NOT NULL,
    "condition" "Condition" NOT NULL,
    "battery_health" INTEGER,
    "cost_price" DECIMAL(12,2) NOT NULL,
    "pta_status" "PtaStatus",
    "status" "PhoneStatus" NOT NULL DEFAULT 'available',
    "notes" TEXT,
    "added_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "phones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shop_buyers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shop_buyers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales" (
    "id" TEXT NOT NULL,
    "phone_id" TEXT NOT NULL,
    "sale_type" "SaleType" NOT NULL,
    "shop_buyer_id" TEXT,
    "customer_name" TEXT,
    "selling_price" DECIMAL(12,2) NOT NULL,
    "amount_received" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "sold_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "sold_by" TEXT NOT NULL,

    CONSTRAINT "sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_payments" (
    "id" TEXT NOT NULL,
    "sale_id" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "recorded_by" TEXT NOT NULL,

    CONSTRAINT "sale_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_payments" (
    "id" TEXT NOT NULL,
    "supplier_id" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "paid_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "recorded_by" TEXT NOT NULL,

    CONSTRAINT "supplier_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "phones_imei_key" ON "phones"("imei");

-- CreateIndex
CREATE UNIQUE INDEX "sales_phone_id_key" ON "sales"("phone_id");

-- AddForeignKey
ALTER TABLE "purchase_lots" ADD CONSTRAINT "purchase_lots_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_lots" ADD CONSTRAINT "purchase_lots_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lot_payments" ADD CONSTRAINT "lot_payments_lot_id_fkey" FOREIGN KEY ("lot_id") REFERENCES "purchase_lots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lot_payments" ADD CONSTRAINT "lot_payments_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "phones" ADD CONSTRAINT "phones_lot_id_fkey" FOREIGN KEY ("lot_id") REFERENCES "purchase_lots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "phones" ADD CONSTRAINT "phones_added_by_fkey" FOREIGN KEY ("added_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_phone_id_fkey" FOREIGN KEY ("phone_id") REFERENCES "phones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_shop_buyer_id_fkey" FOREIGN KEY ("shop_buyer_id") REFERENCES "shop_buyers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_sold_by_fkey" FOREIGN KEY ("sold_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_payments" ADD CONSTRAINT "sale_payments_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_payments" ADD CONSTRAINT "sale_payments_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_payments" ADD CONSTRAINT "supplier_payments_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_payments" ADD CONSTRAINT "supplier_payments_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
