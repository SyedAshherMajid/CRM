// ─── Input mappers: frontend display string → Prisma enum key ───────────────
// Prisma uses the key name (e.g. "GooglePixel"), not the @map db value ("Google Pixel")

export function toBrand(v: string) {
  return v === "Google Pixel" ? "GooglePixel" : "iPhone"
}

export function toStorage(v: string) {
  const map: Record<string, string> = {
    "64GB": "GB64",
    "128GB": "GB128",
    "256GB": "GB256",
    "512GB": "GB512",
    "1TB": "TB1",
  }
  return map[v] ?? v
}

export function toCondition(v: string) {
  return v === "Like New" ? "LikeNew" : v
}

export function toPtaStatus(v: string | undefined | null) {
  if (!v) return null
  return v === "Non-PTA" ? "NonPTA" : v
}

// ─── Output mappers: Prisma enum key → friendly display string ───────────────

export function fromBrand(v: string) {
  return v === "GooglePixel" ? "Google Pixel" : v
}

export function fromStorage(v: string) {
  const map: Record<string, string> = {
    GB64: "64GB",
    GB128: "128GB",
    GB256: "256GB",
    GB512: "512GB",
    TB1: "1TB",
  }
  return map[v] ?? v
}

export function fromCondition(v: string) {
  return v === "LikeNew" ? "Like New" : v
}

export function fromPtaStatus(v: string | null | undefined) {
  if (!v) return null
  return v === "NonPTA" ? "Non-PTA" : v
}
