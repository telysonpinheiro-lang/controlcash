import { useState, useRef } from 'react'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import Modal from '../components/Modal'
import Pagination, { usePagination } from '../components/Pagination'
import { contratosApi } from '../services/api'
import { empresaContratante } from '../db/contratos'

const PLACEHOLDERS = [
  ['{{cliente}}','Cliente'],['{{cpf}}','CPF'],['{{telefone}}','Telefone'],['{{endereco}}','Endereço'],
  ['{{empresa}}','Empresa'],['{{cnpj}}','CNPJ'],['{{objeto}}','Objeto'],
  ['{{valor}}','Valor'],['{{parcelas}}','Parcelas'],['{{prazo}}','Prazo'],['{{garantia}}','Garantia'],
]

const WaIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 11, height: 11 }}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347"/>
  </svg>
)

const TEMPLATE_KEY = 'vc_contrato_template'

const TEMPLATE_PADRAO = `CONTRATO DE PRESTAÇÃO DE SERVIÇOS

CONTRATANTE: {{cliente}}{{cpf}}{{endereco}}.
CONTRATADA: {{empresa}}, CNPJ {{cnpj}}.

OBJETO: {{objeto}}

VALOR: R$ {{valor}}{{parcelas}}

{{prazo}}{{garantia}}

Ambas as partes concordam com os termos acima mediante aceite eletrônico registrado.

Aceito eletronicamente em: _________ · IP: xxx.xxx.x.x · ControlCash Gestão v1.0`

function renderTemplate(template, contrato, clientesList) {
  const valor = Number(contrato.valor ?? 0).toFixed(2).replace('.', ',')
  const parcelas = contrato.parcelas > 1
    ? `, em ${contrato.parcelas} parcelas de R$ ${Number(contrato.valor_parcela ?? contrato.valorParcela ?? 0).toFixed(2).replace('.', ',')}`
    : ''
  const clienteCad = (clientesList ?? []).find(c => c.nome === contrato.cliente)
  const telefone = contrato.telefone ?? clienteCad?.telefone ?? ''

  return template
    .replace('{{cliente}}', contrato.cliente ?? '')
    .replace('{{cpf}}', contrato.cpf ? `, CPF ${contrato.cpf}` : '')
    .replace('{{telefone}}', telefone ? `, Tel: ${telefone}` : '')
    .replace('{{endereco}}', contrato.endereco ? `, residente em ${contrato.endereco}` : '')
    .replace('{{empresa}}', empresaContratante.nome)
    .replace('{{cnpj}}', empresaContratante.cnpj)
    .replace('{{objeto}}', contrato.descricao_servico ?? contrato.descricaoServico ?? contrato.servico ?? '')
    .replace('{{valor}}', valor)
    .replace('{{parcelas}}', parcelas ? `${parcelas}.` : '.')
    .replace('{{prazo}}', contrato.prazo ? `PRAZO: ${contrato.prazo}.\n\n` : '')
    .replace('{{garantia}}', contrato.garantia ? `GARANTIA: ${contrato.garantia}\n\n` : '')
}

async function gerarPDF(contrato, template, clientesList) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const margin = 20
  const pageW = 210
  const maxW = pageW - margin * 2
  let y = 20

  // Cabeçalho
  doc.setFontSize(10)
  doc.setTextColor(124, 58, 237)
  doc.setFont('helvetica', 'bold')
  doc.text(empresaContratante.nome.toUpperCase(), margin, y)
  doc.setFontSize(8)
  doc.setTextColor(120, 120, 120)
  doc.setFont('helvetica', 'normal')
  doc.text(`CNPJ: ${empresaContratante.cnpj}`, margin, y + 5)
  doc.line(margin, y + 8, pageW - margin, y + 8)
  y += 16

  // Título
  doc.setFontSize(13)
  doc.setTextColor(30, 30, 30)
  doc.setFont('helvetica', 'bold')
  doc.text('CONTRATO DE PRESTAÇÃO DE SERVIÇOS', pageW / 2, y, { align: 'center' })
  y += 10

  // Corpo
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(40, 40, 40)

  const texto = renderTemplate(template, contrato, clientesList)
  const linhas = doc.splitTextToSize(texto, maxW)
  linhas.forEach(linha => {
    if (y > 270) { doc.addPage(); y = 20 }
    doc.text(linha, margin, y)
    y += 6
  })

  // Rodapé
  y += 10
  doc.line(margin, y, pageW / 2 - 10, y)
  doc.line(pageW / 2 + 10, y, pageW - margin, y)
  doc.setFontSize(8)
  doc.setTextColor(120)
  doc.text('Contratante', margin, y + 4)
  doc.text('Contratada', pageW / 2 + 10, y + 4)

  doc.save(`contrato_${(contrato.cliente ?? 'contrato').replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`)
}

export default function Contratos() {
  const { contratos, addContrato, updateContrato, removeContrato, clientes, servicos } = useData()
  const { showToast } = useToast()
  const [modalOpen, setModalOpen] = useState(false)
  const [modalTemplate, setModalTemplate] = useState(false)
  const [editando, setEditando] = useState(null)
  const [preview, setPreview] = useState(null)
  const [form, setForm] = useState({ cliente: '', servico: '', valor: '', parcelas: '1', prazo: '', garantia: '' })
  const [template, setTemplate] = useState(() => localStorage.getItem(TEMPLATE_KEY) ?? TEMPLATE_PADRAO)
  const [templateEdit, setTemplateEdit] = useState(template)
  const [templateImagem, setTemplateImagem] = useState(null)
  const importRef = useRef()
  const textareaRef = useRef()

  const pgContratos = usePagination(contratos)
  const contratoPreviewed = preview ?? contratos[0]
  const [autentiqueLoading, setAutentiqueLoading] = useState(false)
  const [autentiqueModal, setAutentiqueModal] = useState(null) // { contrato, email }

  async function enviarParaAutentique() {
    if (!autentiqueModal) return
    const { contrato, email } = autentiqueModal
    if (!email) return showToast('E-mail do cliente é obrigatório', 'danger')
    setAutentiqueLoading(true)
    try {
      const res = await contratosApi.enviarAutentique(contrato.id, email)
      showToast('Contrato enviado para assinatura na Autentique!', 'success')
      if (res.autentique_link) {
        window.open(res.autentique_link, '_blank')
      }
      setAutentiqueModal(null)
      // Atualiza contrato local
      updateContrato(contrato.id, { ...contrato, autentique_id: res.autentique_id, autentique_link: res.autentique_link, status: 'aguardando' })
    } catch (e) {
      showToast(e.message, 'danger')
    } finally {
      setAutentiqueLoading(false)
    }
  }

  async function verificarAssinatura(c) {
    try {
      const res = await contratosApi.statusAutentique(c.id)
      if (res.assinado) {
        showToast(`Contrato de ${c.cliente} foi ASSINADO!`, 'success')
      } else {
        showToast('Aguardando assinatura do cliente...', 'info')
      }
    } catch (e) {
      showToast(e.message, 'danger')
    }
  }

  function abrirEdicao(c) {
    setEditando(c)
    setForm({ cliente: c.cliente, servico: c.servico, valor: c.valor, parcelas: String(c.parcelas), prazo: c.prazo || '', garantia: c.garantia || '' })
    setModalOpen(true)
  }

  async function handleSubmit() {
    if (!form.cliente || !form.servico) return showToast('Preencha os campos obrigatórios', 'danger')
    try {
      const payload = {
        cliente: form.cliente,
        servico: form.servico,
        descricao_servico: form.servico,
        valor: parseFloat(form.valor) || 0,
        parcelas: parseInt(form.parcelas),
        prazo: form.prazo,
        garantia: form.garantia,
      }
      if (editando) {
        const atualizado = await updateContrato(editando.id, payload)
        setPreview(atualizado ?? { ...editando, ...payload })
        showToast('Contrato atualizado!', 'success')
      } else {
        const novo = await addContrato({ ...payload, status: 'aguardando' })
        setPreview(novo)
        showToast('Contrato gerado com sucesso!', 'success')
      }
      setModalOpen(false)
      setEditando(null)
      setForm({ cliente: '', servico: '', valor: '', parcelas: '1', prazo: '', garantia: '' })
    } catch (e) { showToast(e.message, 'danger') }
  }

  function copiarLink(c) {
    const token = c.token_aceite ?? c.id
    const link = `${window.location.origin}/aceite/${token}`
    navigator.clipboard.writeText(link)
      .then(() => showToast('Link de aceite copiado!', 'success'))
      .catch(() => showToast('Não foi possível copiar o link', 'danger'))
  }

  function imprimir() {
    if (!contratoPreviewed) return
    const conteudo = document.getElementById('contract-print-area')?.innerHTML
    if (!conteudo) return
    const w = window.open('', '_blank')
    w.document.write(`<html><head><title>Contrato</title><style>
      body { font-family: Arial, sans-serif; font-size: 12px; margin: 40px; color: #222; }
      h3 { text-align: center; text-transform: uppercase; margin-bottom: 20px; }
      p { margin-bottom: 10px; line-height: 1.6; }
      .sig-line { margin-top: 40px; border-top: 1px solid #999; padding-top: 8px; font-size: 10px; color: #666; }
    </style></head><body>${conteudo}</body></html>`)
    w.document.close()
    w.focus()
    w.print()
  }

  function salvarTemplate() {
    setTemplate(templateEdit)
    localStorage.setItem(TEMPLATE_KEY, templateEdit)
    setModalTemplate(false)
    showToast('Template salvo!', 'success')
  }

  async function importarArquivo(e) {
    const file = e.target.files[0]
    if (!file) return
    const ext = file.name.split('.').pop().toLowerCase()
    e.target.value = ''

    try {
      if (['png','jpg','jpeg','webp','gif'].includes(ext)) {
        const reader = new FileReader()
        reader.onload = ev => {
          setTemplateImagem(ev.target.result)
          showToast(`Imagem "${file.name}" carregada como referência.`, 'info')
        }
        reader.readAsDataURL(file)
        return
      }

      if (ext === 'docx') {
        const mammoth = (await import('mammoth')).default
        const buf = await file.arrayBuffer()
        const result = await mammoth.extractRawText({ arrayBuffer: buf })
        setTemplateEdit(result.value)
        showToast(`Word "${file.name}" importado com sucesso.`, 'success')
        return
      }

      if (ext === 'pdf') {
        const pdfjsLib = await import('pdfjs-dist')
        pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
          'pdfjs-dist/build/pdf.worker.mjs',
          import.meta.url
        ).href
        const buf = await file.arrayBuffer()
        const pdf = await pdfjsLib.getDocument({ data: buf }).promise
        let texto = ''
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i)
          const content = await page.getTextContent()
          texto += content.items.map(it => it.str).join(' ') + '\n'
        }
        setTemplateEdit(texto.trim())
        showToast(`PDF "${file.name}" importado com sucesso.`, 'success')
        return
      }

      // txt / html e outros textos
      const reader = new FileReader()
      reader.onload = ev => {
        setTemplateEdit(ev.target.result)
        showToast(`Arquivo "${file.name}" carregado. Salve para aplicar.`, 'info')
      }
      reader.readAsText(file)
    } catch (err) {
      showToast(`Erro ao importar: ${err.message}`, 'danger')
    }
  }

  function inserirPlaceholder(ph) {
    const ta = textareaRef.current
    if (!ta) return
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const novo = templateEdit.slice(0, start) + ph + templateEdit.slice(end)
    setTemplateEdit(novo)
    requestAnimationFrame(() => {
      ta.focus()
      ta.setSelectionRange(start + ph.length, start + ph.length)
    })
  }

  function resetarTemplate() {
    setTemplateEdit(TEMPLATE_PADRAO)
  }

  const textoPreview = contratoPreviewed ? renderTemplate(template, contratoPreviewed, clientes) : ''

  return (
    <div id="page-contratos">
      <div className="topbar">
        <div>
          <div className="topbar-title">Contratos</div>
          <div className="topbar-sub">Gere contratos a partir dos serviços</div>
        </div>
        <div className="topbar-actions">
          <button className="btn btn-sm btn-outline" onClick={() => { setTemplateEdit(template); setModalTemplate(true) }}>📄 Template</button>
          <button className="btn btn-primary btn-sm" onClick={() => setModalOpen(true)}>+ Novo Contrato</button>
        </div>
      </div>

      <div className="content">
        <div className="alert-box info mb-16">
          <svg className="alert-icon" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <div>
            <div className="alert-title">⚠ Validade jurídica do aceite eletrônico</div>
            <div className="alert-text">
              O aceite registra <strong>IP + data/hora + hash SHA-256</strong> (Art. 10, MP 2.200-2/2001) — válido como evidência em disputas simples.
              {' '}<strong>Não possui validade jurídica plena.</strong>{' '}
              Para contratos formais, use ICP-Brasil (DocuSign, Autentique, BirdSign).
            </div>
          </div>
        </div>

        <div className="grid-2 mb-16">
          {/* Prévia */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">Prévia do Contrato</div>
              <div className="flex gap-8">
                <button
                  className="btn btn-sm btn-outline"
                  onClick={() => contratoPreviewed ? gerarPDF(contratoPreviewed, template, clientes).catch(e => showToast(e.message, 'danger')) : showToast('Selecione um contrato', 'info')}
                >⬇ PDF</button>
                <button className="btn btn-sm btn-outline" onClick={imprimir}>🖨 Imprimir</button>
                <button
                  className="btn btn-sm btn-outline"
                  onClick={() => contratoPreviewed ? copiarLink(contratoPreviewed) : showToast('Selecione um contrato', 'info')}
                >🔗 Link aceite</button>
              </div>
            </div>
            {contratoPreviewed ? (
              <div className="contract-preview" id="contract-print-area">
                <h3>CONTRATO DE PRESTAÇÃO DE SERVIÇOS</h3>
                {textoPreview.split('\n').map((linha, i) =>
                  linha.trim() === ''
                    ? <br key={i} />
                    : <p key={i} style={{ margin: '4px 0', lineHeight: 1.6 }}>{linha}</p>
                )}
              </div>
            ) : (
              <p style={{ padding: 16, color: 'var(--text-s)', fontSize: 13 }}>Selecione um contrato na lista para visualizar.</p>
            )}
          </div>

          {/* Lista */}
          <div className="card">
            <div className="card-header"><div className="card-title">Contratos Gerados</div></div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Cliente</th><th>Serviço</th><th>Status</th><th>Ações</th></tr>
                </thead>
                <tbody>
                  {pgContratos.paginated.map(c => (
                    <tr key={c.id} style={{ cursor: 'pointer', background: contratoPreviewed?.id === c.id ? 'var(--purple-light, #f5f3ff)' : '' }} onClick={() => setPreview(c)}>
                      <td>{c.cliente}</td>
                      <td>{c.servico}</td>
                      <td>
                        <span className={`status ${c.status === 'aceito' ? 'status-concluido' : 'status-pendente'}`}>
                          {c.status === 'aceito' ? 'Aceito' : 'Aguardando'}
                        </span>
                      </td>
                      <td>
                        <div className="flex gap-8">
                          <button title="Baixar PDF" className="btn-icon" onClick={e => { e.stopPropagation(); gerarPDF(c, template, clientes).catch(err => showToast(err.message, 'danger')) }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{width:14,height:14}}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                          </button>
                          <button title="Editar" className="btn-icon" onClick={e => { e.stopPropagation(); abrirEdicao(c) }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{width:14,height:14}}><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                          </button>
                          <button title="Excluir" className="btn-icon btn-danger" onClick={e => { e.stopPropagation(); if (confirm(`Excluir contrato de ${c.cliente}?`)) removeContrato(c.id).catch(err => showToast(err.message, 'danger')) }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{width:14,height:14}}><polyline points="3,6 5,6 21,6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
                          </button>
                          {c.status !== 'aceito' && (
                            <span className="wa-chip" onClick={e => { e.stopPropagation(); copiarLink(c) }}>
                              <WaIcon /> Link
                            </span>
                          )}
                          {c.status !== 'aceito' && !c.autentique_id && (
                            <button title="Enviar para Autentique" className="btn btn-sm btn-outline" style={{ fontSize: 10, padding: '2px 8px' }}
                              onClick={e => { e.stopPropagation(); const cl = clientes.find(x => x.nome === c.cliente); setAutentiqueModal({ contrato: c, email: cl?.email || '' }) }}>
                              Autentique
                            </button>
                          )}
                          {c.autentique_id && c.status !== 'aceito' && (
                            <button title="Verificar assinatura" className="btn btn-sm btn-success" style={{ fontSize: 10, padding: '2px 8px' }}
                              onClick={e => { e.stopPropagation(); verificarAssinatura(c) }}>
                              Verificar
                            </button>
                          )}
                          {c.autentique_link && (
                            <a href={c.autentique_link} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline" style={{ fontSize: 10, padding: '2px 8px' }}
                              onClick={e => e.stopPropagation()}>
                              Assinar
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={pgContratos.page} totalPages={pgContratos.totalPages} total={pgContratos.total} perPage={pgContratos.perPage} onPageChange={pgContratos.goTo} onPerPageChange={pgContratos.changePerPage} />
          </div>
        </div>
      </div>

      {/* Modal Contrato */}
      <Modal title={editando ? 'Editar Contrato' : 'Gerar Contrato'} open={modalOpen} onClose={() => { setModalOpen(false); setEditando(null); setForm({ cliente: '', servico: '', valor: '', parcelas: '1', prazo: '', garantia: '' }) }}>
        <div className="form-row">
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Cliente</label>
            <select className="form-input" value={form.cliente} onChange={e => setForm({ ...form, cliente: e.target.value })}>
              <option value="">Selecione...</option>
              {clientes.map(c => <option key={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Serviço</label>
            <select className="form-input" value={form.servico} onChange={e => setForm({ ...form, servico: e.target.value })}>
              <option value="">Selecione...</option>
              {servicos.map(s => <option key={s.id}>{s.nome}</option>)}
            </select>
          </div>
        </div>
        <div className="form-row" style={{ marginTop: 14 }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Valor (R$)</label>
            <input className="form-input" type="number" value={form.valor} onChange={e => setForm({ ...form, valor: e.target.value })} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Parcelas</label>
            <select className="form-input" value={form.parcelas} onChange={e => setForm({ ...form, parcelas: e.target.value })}>
              <option value="1">À vista</option><option value="2">2×</option><option value="3">3×</option>
              <option value="6">6×</option><option value="12">12×</option>
            </select>
          </div>
        </div>
        <div className="form-row" style={{ marginTop: 14 }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Prazo</label>
            <input className="form-input" value={form.prazo} onChange={e => setForm({ ...form, prazo: e.target.value })} placeholder="Ex: 30 de junho de 2025" />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Garantia</label>
            <input className="form-input" value={form.garantia} onChange={e => setForm({ ...form, garantia: e.target.value })} placeholder="Ex: 90 dias" />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline btn-sm" onClick={() => setModalOpen(false)}>Cancelar</button>
          <button className="btn btn-primary btn-sm" onClick={handleSubmit}>Gerar Contrato</button>
        </div>
      </Modal>

      {/* Modal Template */}
      <Modal title="Template do Contrato" open={modalTemplate} onClose={() => setModalTemplate(false)}>
        {/* Toolbar de placeholders */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
          {PLACEHOLDERS.map(([ph, label]) => (
            <button key={ph} onClick={() => inserirPlaceholder(ph)}
              style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, border: '1px solid var(--border)', background: 'var(--bg3)', cursor: 'pointer', color: 'var(--purple)' }}>
              {label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
          <textarea
            ref={textareaRef}
            className="form-input"
            style={{ flex: 1, height: 280, fontFamily: 'monospace', fontSize: 12, resize: 'vertical' }}
            value={templateEdit}
            onChange={e => setTemplateEdit(e.target.value)}
          />
          {templateImagem && (
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <img src={templateImagem} alt="Referência" style={{ width: 180, maxHeight: 280, objectFit: 'contain', border: '1px solid var(--border)', borderRadius: 6 }} />
              <button onClick={() => setTemplateImagem(null)}
                style={{ position: 'absolute', top: 4, right: 4, background: 'var(--red)', color: '#fff', border: 'none', borderRadius: '50%', width: 18, height: 18, cursor: 'pointer', fontSize: 11, lineHeight: 1 }}>
                ×
              </button>
              <div style={{ fontSize: 9, color: 'var(--text-xs)', textAlign: 'center', marginTop: 4 }}>Referência visual</div>
            </div>
          )}
        </div>

        <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
          <div className="flex gap-8">
            <input ref={importRef} type="file" accept=".txt,.html,.docx,.pdf,.png,.jpg,.jpeg,.webp" style={{ display: 'none' }} onChange={importarArquivo} />
            <button className="btn btn-outline btn-sm" onClick={() => importRef.current.click()}>📁 Importar (Word/PDF/TXT/Imagem)</button>
            <button className="btn btn-outline btn-sm" onClick={resetarTemplate}>↺ Padrão</button>
          </div>
          <div className="flex gap-8">
            <button className="btn btn-outline btn-sm" onClick={() => setModalTemplate(false)}>Cancelar</button>
            <button className="btn btn-primary btn-sm" onClick={salvarTemplate}>Salvar template</button>
          </div>
        </div>
      </Modal>

      {/* Modal Autentique */}
      <Modal title="Enviar para Autentique" open={!!autentiqueModal} onClose={() => setAutentiqueModal(null)}>
        {autentiqueModal && (
          <>
            <div style={{ marginBottom: 12, padding: '10px 14px', background: 'var(--bg4)', borderRadius: 'var(--radius)', fontSize: 13 }}>
              Contrato: <strong>{autentiqueModal.contrato.cliente}</strong> — {autentiqueModal.contrato.servico}
            </div>
            <div className="form-group">
              <label className="form-label">E-mail do cliente (para receber o link de assinatura)</label>
              <input
                className="form-input"
                type="email"
                placeholder="cliente@email.com"
                value={autentiqueModal.email}
                onChange={e => setAutentiqueModal({ ...autentiqueModal, email: e.target.value })}
              />
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-s)', marginBottom: 12 }}>
              O cliente receberá um e-mail da Autentique com o link para assinar o contrato eletronicamente.
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline btn-sm" onClick={() => setAutentiqueModal(null)}>Cancelar</button>
              <button className="btn btn-primary btn-sm" disabled={autentiqueLoading} onClick={enviarParaAutentique}>
                {autentiqueLoading ? 'Enviando...' : 'Enviar para Assinatura'}
              </button>
            </div>
          </>
        )}
      </Modal>
    </div>
  )
}
