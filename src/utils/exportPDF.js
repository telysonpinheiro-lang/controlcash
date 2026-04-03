/**
 * Exporta dados para PDF usando jsPDF + autotable.
 * @param {object[]} rows        - Array de objetos a exportar
 * @param {string}   nome        - Nome base do arquivo (sem extensão)
 * @param {string[]} colunas     - Chaves das colunas a incluir
 * @param {string[]} cabecalhos  - Rótulos das colunas no cabeçalho
 * @param {string}   [titulo]    - Título exibido no topo do PDF
 */
export async function exportPDF(rows, nome = 'exportacao', colunas, cabecalhos, titulo = '') {
  if (!rows || rows.length === 0) return

  const { jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

  // Cabeçalho do documento
  doc.setFontSize(14)
  doc.setTextColor(124, 58, 237) // purple
  doc.text('ControlCash Gestão', 14, 15)

  doc.setFontSize(11)
  doc.setTextColor(60, 60, 60)
  if (titulo) doc.text(titulo, 14, 23)

  doc.setFontSize(9)
  doc.setTextColor(120, 120, 120)
  doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}`, 14, titulo ? 30 : 23)

  const body = rows.map(row =>
    colunas.map(c => {
      const val = row[c] ?? ''
      return String(val)
    })
  )

  autoTable(doc, {
    head: [cabecalhos],
    body,
    startY: titulo ? 35 : 28,
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [124, 58, 237], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 243, 255] },
    margin: { left: 14, right: 14 },
  })

  doc.save(`${nome}_${new Date().toISOString().slice(0, 10)}.pdf`)
}
