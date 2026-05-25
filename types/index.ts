export type Brand = "iPhone" | "Google Pixel"
export type PhoneStatus = "available" | "sold" | "defective" | "returned"
export type SaleType = "customer" | "shop"
export type Storage = "64GB" | "128GB" | "256GB" | "512GB" | "1TB"
export type Condition = "New" | "Like New" | "Good" | "Fair" | "Poor" | "Refurbished"

export interface User {
  id: string
  name: string
  email: string
  createdAt: Date
}

export interface Supplier {
  id: string
  name: string
  phone?: string | null
  notes?: string | null
  createdAt: Date
}

export interface PurchaseLot {
  id: string
  name: string
  supplierId?: string | null
  totalAmount: number
  amountPaid: number
  notes?: string | null
  createdBy: string
  createdAt: Date
  supplier?: Supplier | null
  phones?: Phone[]
  payments?: LotPayment[]
  _count?: { phones: number }
}

export interface LotPayment {
  id: string
  lotId: string
  amount: number
  paidAt: Date
  notes?: string | null
  recordedBy: string
}

export interface Phone {
  id: string
  lotId: string
  brand: Brand
  model: string
  storage: Storage
  color: string
  imei: string
  condition: Condition
  batteryHealth?: number | null
  costPrice: number
  status: PhoneStatus
  notes?: string | null
  addedBy: string
  createdAt: Date
  lot?: PurchaseLot
  sale?: Sale | null
}

export interface ShopBuyer {
  id: string
  name: string
  phone?: string | null
  address?: string | null
  notes?: string | null
  createdAt: Date
  sales?: Sale[]
}

export interface Sale {
  id: string
  phoneId: string
  saleType: SaleType
  shopBuyerId?: string | null
  customerName?: string | null
  sellingPrice: number
  amountReceived: number
  soldAt: Date
  notes?: string | null
  soldBy: string
  phone?: Phone
  shopBuyer?: ShopBuyer | null
  payments?: SalePayment[]
}

export interface SalePayment {
  id: string
  saleId: string
  amount: number
  receivedAt: Date
  notes?: string | null
  recordedBy: string
}

// Computed helpers
export const remaining = (lot: PurchaseLot) =>
  lot.totalAmount - lot.amountPaid

export const salePending = (sale: Sale) =>
  sale.sellingPrice - sale.amountReceived

export const saleProfit = (sale: Sale, phone: Phone) =>
  sale.sellingPrice - phone.costPrice
