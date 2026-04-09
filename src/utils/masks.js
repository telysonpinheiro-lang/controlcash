// Máscaras de formatação para inputs

export function maskTelefone(v) {
  const n = v.replace(/\D/g, '').slice(0, 11)
  if (n.length <= 2) return n.length ? `(${n}` : ''
  if (n.length <= 7) return `(${n.slice(0, 2)}) ${n.slice(2)}`
  return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`
}

export function maskCEP(v) {
  const n = v.replace(/\D/g, '').slice(0, 8)
  if (n.length <= 5) return n
  return `${n.slice(0, 5)}-${n.slice(5)}`
}

export function maskCPF_CNPJ(v) {
  const n = v.replace(/\D/g, '')
  if (n.length <= 11) {
    // CPF: 000.000.000-00
    if (n.length <= 3) return n
    if (n.length <= 6) return `${n.slice(0, 3)}.${n.slice(3)}`
    if (n.length <= 9) return `${n.slice(0, 3)}.${n.slice(3, 6)}.${n.slice(6)}`
    return `${n.slice(0, 3)}.${n.slice(3, 6)}.${n.slice(6, 9)}-${n.slice(9, 11)}`
  }
  // CNPJ: 00.000.000/0000-00
  const c = n.slice(0, 14)
  if (c.length <= 2) return c
  if (c.length <= 5) return `${c.slice(0, 2)}.${c.slice(2)}`
  if (c.length <= 8) return `${c.slice(0, 2)}.${c.slice(2, 5)}.${c.slice(5)}`
  if (c.length <= 12) return `${c.slice(0, 2)}.${c.slice(2, 5)}.${c.slice(5, 8)}/${c.slice(8)}`
  return `${c.slice(0, 2)}.${c.slice(2, 5)}.${c.slice(5, 8)}/${c.slice(8, 12)}-${c.slice(12)}`
}

export function maskValor(v) {
  const n = v.replace(/\D/g, '')
  if (!n) return ''
  const num = (parseInt(n) / 100).toFixed(2)
  return num.replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

export function parseMaskedValor(v) {
  return parseFloat((v || '').toString().replace(/\./g, '').replace(',', '.')) || 0
}

export function numToMasked(n) {
  return maskValor(String(Math.round(Number(n || 0) * 100)))
}
