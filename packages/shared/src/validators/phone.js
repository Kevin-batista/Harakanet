export function formatKenyanPhone(value = '') {
  return value.trim()
}

export function isValidKenyanPhone(value = '') {
  return /^2547\d{8}$/.test(value.trim())
}
