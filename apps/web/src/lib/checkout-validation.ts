export const CHECKOUT_RFC_ERROR = 'Revisa tu RFC: debe tener 13 caracteres para persona física o 12 para persona moral, con letras, fecha y homoclave, sin espacios ni guiones.'

export function normalizeCheckoutRfc(value: string): string {
  return value.trim().toUpperCase()
}

// Checks the input format only; this does not verify registration with SAT.
export function isValidCheckoutRfc(value: string): boolean {
  return /^[A-Z&Ñ]{3,4}\d{6}[A-Z0-9]{3}$/.test(normalizeCheckoutRfc(value))
}
