export const IPHONE_MODELS = [
  "iPhone 11",
  "iPhone 11 Pro",
  "iPhone 11 Pro Max",
  "iPhone 12",
  "iPhone 12 Mini",
  "iPhone 12 Pro",
  "iPhone 12 Pro Max",
  "iPhone 13",
  "iPhone 13 Mini",
  "iPhone 13 Pro",
  "iPhone 13 Pro Max",
  "iPhone 14",
  "iPhone 14 Plus",
  "iPhone 14 Pro",
  "iPhone 14 Pro Max",
  "iPhone 15",
  "iPhone 15 Plus",
  "iPhone 15 Pro",
  "iPhone 15 Pro Max",
  "iPhone 16",
  "iPhone 16 Plus",
  "iPhone 16 Pro",
  "iPhone 16 Pro Max",
  "iPhone 17",
  "iPhone 17 Air",
  "iPhone 17 Pro",
  "iPhone 17 Pro Max",
] as const

export const PIXEL_MODELS = [
  "Pixel 6",
  "Pixel 6 Pro",
  "Pixel 6a",
  "Pixel 7",
  "Pixel 7 Pro",
  "Pixel 7a",
  "Pixel 8",
  "Pixel 8 Pro",
  "Pixel 8a",
  "Pixel 9",
  "Pixel 9 Pro",
  "Pixel 9 Pro XL",
  "Pixel 9 Pro Fold",
  "Pixel 9a",
] as const

export const ALL_MODELS = {
  iPhone: IPHONE_MODELS,
  "Google Pixel": PIXEL_MODELS,
} as const

export const STORAGE_OPTIONS = ["64GB", "128GB", "256GB", "512GB", "1TB"] as const

export const CONDITION_OPTIONS = [
  "New",
  "Like New",
  "Good",
  "Fair",
  "Poor",
  "Refurbished",
] as const

export type IPhoneModel = (typeof IPHONE_MODELS)[number]
export type PixelModel = (typeof PIXEL_MODELS)[number]
export type StorageOption = (typeof STORAGE_OPTIONS)[number]
export type ConditionOption = (typeof CONDITION_OPTIONS)[number]
