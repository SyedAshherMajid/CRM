export function formatPKR(amount: number | string): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount
  if (isNaN(num)) return "PKR 0"

  if (num >= 10_000_000) {
    const crore = num / 10_000_000
    return `PKR ${crore % 1 === 0 ? crore : crore.toFixed(2)} Crore`
  }
  if (num >= 100_000) {
    const lakh = num / 100_000
    return `PKR ${lakh % 1 === 0 ? lakh : lakh.toFixed(2)} Lakh`
  }
  return `PKR ${num.toLocaleString("en-PK")}`
}

export function formatPKRShort(amount: number | string): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount
  if (isNaN(num)) return "0"

  if (num >= 10_000_000) {
    const crore = num / 10_000_000
    return `${crore % 1 === 0 ? crore : crore.toFixed(1)}Cr`
  }
  if (num >= 100_000) {
    const lakh = num / 100_000
    return `${lakh % 1 === 0 ? lakh : lakh.toFixed(1)}L`
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(0)}K`
  }
  return num.toLocaleString("en-PK")
}

export function parsePKR(value: string): number {
  return parseFloat(value.replace(/[^0-9.]/g, "")) || 0
}
