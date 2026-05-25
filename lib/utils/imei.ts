// Validates IMEI using the Luhn algorithm
export function validateIMEI(imei: string): boolean {
  const cleaned = imei.replace(/\D/g, "")
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
  const cleaned = imei.replace(/\D/g, "").slice(0, 15)
  return cleaned
}

export function maskIMEI(imei: string): string {
  if (!imei || imei.length < 6) return imei
  return `••••••••• ${imei.slice(-6)}`
}
