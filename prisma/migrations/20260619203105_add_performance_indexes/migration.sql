-- CreateIndex
CREATE INDEX "lot_payments_lot_id_idx" ON "lot_payments"("lot_id");

-- CreateIndex
CREATE INDEX "phones_status_idx" ON "phones"("status");

-- CreateIndex
CREATE INDEX "phones_lot_id_status_idx" ON "phones"("lot_id", "status");

-- CreateIndex
CREATE INDEX "phones_brand_idx" ON "phones"("brand");

-- CreateIndex
CREATE INDEX "phones_created_at_idx" ON "phones"("created_at");

-- CreateIndex
CREATE INDEX "purchase_lots_supplier_id_idx" ON "purchase_lots"("supplier_id");

-- CreateIndex
CREATE INDEX "purchase_lots_created_at_idx" ON "purchase_lots"("created_at");

-- CreateIndex
CREATE INDEX "sale_payments_sale_id_idx" ON "sale_payments"("sale_id");

-- CreateIndex
CREATE INDEX "sale_payments_received_at_idx" ON "sale_payments"("received_at");

-- CreateIndex
CREATE INDEX "sales_sold_at_idx" ON "sales"("sold_at");

-- CreateIndex
CREATE INDEX "sales_sale_type_idx" ON "sales"("sale_type");

-- CreateIndex
CREATE INDEX "sales_shop_buyer_id_idx" ON "sales"("shop_buyer_id");

-- CreateIndex
CREATE INDEX "supplier_payments_supplier_id_idx" ON "supplier_payments"("supplier_id");
