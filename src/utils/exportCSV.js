/**
 * Exporta um array de objetos para CSV e dispara o download no browser.
 * @param {object[]} rows   - Array de objetos a exportar
 * @param {string}   nome   - Nome base do arquivo (sem extensão)
 * @param {string[]} [cols] - Colunas a incluir (opcional; padrão: todas)
 */
export function exportCSV(rows, nome = 'exportacao', cols = null) {
  if (!rows || rows.length === 0) return

  const colunas = cols ?? Object.keys(rows[0])

  // Header
  const header = colunas.map(c => `"${c}"`).join(';')

  // Linhas
  const linhas = rows.map(row =>
    colunas.map(c => {
      const val = row[c] ?? ''
      // Escapa aspas duplas e envolve em aspas
      return `"${String(val).replace(/"/g, '""')}"`
    }).join(';')
  )

  const csv = '\uFEFF' + [header, ...linhas].join('\r\n')  // BOM para Excel PT-BR

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href     = url
  link.download = `${nome}_${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
