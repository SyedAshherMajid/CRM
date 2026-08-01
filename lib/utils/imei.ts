// Strip the re-purchase suffix (#2, #3 …) from a stored IMEI before display
export function stripImeiSuffix(imei: string): string {
  return imei.split("#")[0]
}

// Validates IMEI using the Luhn algorithm
export function validateIMEI(imei: string): boolean {
  const cleaned = stripImeiSuffix(imei).replace(/\D/g, "")
  if (cleaned.length !== 15) return false

  let sum = 0
  for (let i = 0; i < 15; i++) {
    let digit = parseInt(cleaned[i])
    if (i % 2 === 1) {
      digit *= 2
      if (digit > 9) digit -= 9
    }
    sum += digit
  }
  return sum % 10 === 0
}

export function formatIMEI(imei: string): string {
  const cleaned = stripImeiSuffix(imei).replace(/\D/g, "").slice(0, 15)
  return cleaned
}

export function maskIMEI(imei: string): string {
  const base = stripImeiSuffix(imei)
  if (!base || base.length < 6) return base
  return `••••••••• ${base.slice(-6)}`
}
