import { useState } from 'react'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import Modal from '../components/Modal'
import Pagination, { usePagination } from '../components/Pagination'
import WaButton, { abrirWhatsApp } from '../components/WaButton'
import { maskTelefone } from '../utils/masks'
import { kanbanColunas, statusLabels, transicoesPermitidas } from '../db/vendas'
import { exportCSV } from '../utils/exportCSV'


const WaIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 11, height: 11, flexShrink: 0 }}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
)

function montarMensagem(v) {
  const tipo  = v.kanban_status === 'orcamento' ? 'orçamento' : 'proposta de serviço'
  const valor = `R$ ${Number(v.valor).toFixed(2).replace('.', ',')}`
  const linhas = [
    `Olá ${v.cliente_nome.split(' ')[0]}! 👋`,
    ``,
    `Segue o ${tipo} para o serviço solicitado:`,
    ``,
    `📋 *Serviço:* ${v.servico}`,
    `💰 *Valor:* ${valor}`,
    v.pagamento ? `💳 *Pagamento:* ${v.pagamento}` : null,
    v.prazo     ? `📅 *Prazo de execução:* ${v.prazo}` : null,
    ``,
    `Qualquer dúvida, estou à disposição! 😊`,
  ].filter(l => l !== null)
  return linhas.join('\n')
}

const kanbanColors = {
  orcamento: 'var(--purple)',
  aprovado: 'var(--blue)',
  andamento: 'var(--amber)',
  concluido: 'var(--green)',
  recebido: '#7c3aed',
}

export default function Vendas() {
  const { vendas, servicos, clientes, contasReceber, addVenda, updateVenda, removeVenda, addContaReceber, removeContaReceber, confirmarRecebimento } = useData()
  const { showToast } = useToast()
  const [editando, setEditando] = useState(null)
  const [dragItem, setDragItem] = useState(null)
  const [dragOver, setDragOver] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [waModal, setWaModal] = useState(null)
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')
  const [mostrarArquivados, setMostrarArquivados] = useState(false)
  const [kanbanPage, setKanbanPage] = useState({})
  const [form, setForm] = useState({
    cliente: '', tipo: 'Venda', servico: '', valor: '', pagamento: 'À vista',
    prazo_pagamento: '', prazo: '', material: '',
  })

  const KANBAN_PER_PAGE = 5

  const vendaFiltrada = vendas.filter(v => {
    if (!mostrarArquivados && Number(v.arquivado)) return false
    if (mostrarArquivados && !Number(v.arquivado)) return false
    const matchBusca = (v.cliente_nome ?? '').toLowerCase().includes(busca.toLowerCase())
    const matchStatus = !filtroStatus || v.kanban_status === filtroStatus
    return matchBusca && matchStatus
  })

  const pgVendas = usePagination(vendaFiltrada)

  function abrirWa(v) {
    // tenta pegar telefone do cliente cadastrado
    const clienteCad = clientes.find(c => c.nome === v.cliente_nome)
    const tel = v.telefone || clienteCad?.telefone || ''
    setWaModal({ venda: v, telefone: tel, mensagem: montarMensagem(v) })
  }

  function enviarWa() {
    if (!waModal) return
    const tel = waModal.telefone?.replace(/\D/g, '')
    if (!tel) {
      showToast('Telefone não cadastrado para este cliente', 'danger')
      return
    }
    abrirWhatsApp(tel, waModal.mensagem)
    setWaModal(null)
  }

  async function gerarContaReceber(v) {
    // Verifica se já existe conta a receber NÃO paga para esta venda (mesmo cliente + serviço)
    const jaExiste = (contasReceber ?? []).some(c =>
      c.cliente_nome === v.cliente_nome &&
      c.referente === v.servico &&
      c.status !== 'pago'
    )
    if (jaExiste) return

    // Prazo de pagamento: usa prazo_pagamento da venda, ou 30 dias a partir de hoje
    const vencimento = v.prazo_pagamento || new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)
    try {
      await addContaReceber({
        cliente_id:      v.cliente_id ?? null,
        cliente_nome:    v.cliente_nome,
        referente:       v.servico,
        valor:           Number(v.valor),
        valor_material:  Number(v.material || 0),
        vencimento:      vencimento,
        tipo:            v.pagamento ?? 'À vista',
      })
      showToast(`Conta a receber criada para ${v.cliente_nome} — vence em ${new Date(vencimento + 'T00:00').toLocaleDateString('pt-BR')}`, 'info')
    } catch (e) {
      showToast(`Erro ao criar conta a receber: ${e.message}`, 'danger')
    }
  }

  async function handleDrop(novoStatus) {
    if (!dragItem || dragItem.kanban_status === novoStatus) return
    // Valida transição permitida
    const permitidas = transicoesPermitidas[dragItem.kanban_status] ?? []
    if (!permitidas.includes(novoStatus)) {
      showToast(`Não é possível mover de "${statusLabels[dragItem.kanban_status]}" para "${statusLabels[novoStatus]}"`, 'danger')
      setDragItem(null)
      return
    }
    try {
      const atualizada = await updateVenda(dragItem.id, {
        cliente_nome:    dragItem.cliente_nome,
        servico:         dragItem.servico,
        valor:           dragItem.valor,
        material:        dragItem.material,
        pagamento:       dragItem.pagamento,
        prazo:           dragItem.prazo,
        prazo_pagamento: dragItem.prazo_pagamento,
        status:          novoStatus,
        kanban_status:   novoStatus,
      })
      showToast(`${dragItem.cliente_nome} → ${statusLabels[novoStatus]}`, 'success')

      const vendaRef = atualizada ?? { ...dragItem, kanban_status: novoStatus }

      // Busca conta a receber pendente/vencida desta venda
      const contaExistente = (contasReceber ?? []).find(c =>
        c.cliente_nome === dragItem.cliente_nome &&
        c.referente === dragItem.servico &&
        c.status !== 'pago'
      )

      if (novoStatus === 'concluido') {
        // CONCLUÍDO → gera conta a receber (cobrança)
        await gerarContaReceber(vendaRef)

      } else if (novoStatus === 'recebido') {
        // RECEBIDO → garante que conta existe e marca como paga
        if (!contaExistente) await gerarContaReceber(vendaRef)
        // Re-busca após possível criação
        const conta = contaExistente ?? (contasReceber ?? []).find(c =>
          c.cliente_nome === dragItem.cliente_nome &&
          c.referente === dragItem.servico &&
          c.status !== 'pago'
        )
        if (conta) {
          await confirmarRecebimento(conta.id)
          showToast(`Pagamento de ${dragItem.cliente_nome} confirmado`, 'info')
        }

      } else {
        // QUALQUER OUTRA COLUNA → remove conta pendente/vencida (cancela cobrança)
        if (contaExistente) {
          try {
            await removeContaReceber(contaExistente.id)
            showToast(`Cobrança de ${dragItem.cliente_nome} removida`, 'info')
          } catch (e) {
            console.warn('Erro ao remover conta:', e.message)
          }
        }
      }
    } catch (e) { showToast(e.message, 'danger') }
    setDragItem(null)
  }

  async function arquivarVenda(v) {
    try {
      await updateVenda(v.id, {
        cliente_nome: v.cliente_nome, servico: v.servico, valor: v.valor,
        material: v.material, pagamento: v.pagamento, prazo: v.prazo,
        prazo_pagamento: v.prazo_pagamento,
        status: v.status, kanban_status: v.kanban_status,
        arquivado: 1,
      })
      showToast(`${v.cliente_nome} arquivada`, 'success')
    } catch (e) { showToast(e.message, 'danger') }
  }

  async function desarquivarVenda(v) {
    try {
      await updateVenda(v.id, {
        cliente_nome: v.cliente_nome, servico: v.servico, valor: v.valor,
        material: v.material, pagamento: v.pagamento, prazo: v.prazo,
        prazo_pagamento: v.prazo_pagamento,
        status: v.status, kanban_status: v.kanban_status,
        arquivado: 0,
      })
      showToast(`${v.cliente_nome} desarquivada`, 'success')
    } catch (e) { showToast(e.message, 'danger') }
  }

  function abrirEdicao(v) {
    setEditando(v)
    setForm({
      cliente: v.cliente_nome, tipo: 'Venda', servico: v.servico,
      valor: v.valor, pagamento: v.pagamento || 'À vista',
      prazo_pagamento: v.prazo_pagamento || '', prazo: v.prazo || '',
      prazo_qtd: (v.prazo ?? '').split(' ')[0] || '', prazo_tipo: (v.prazo ?? '').split(' ').slice(1).join(' ') || 'dias',
      material: v.material || '',
    })
    setModalOpen(true)
  }

  const FORM_VAZIO = { cliente: '', tipo: 'Venda', servico: '', valor: '', pagamento: 'À vista', prazo_pagamento: '', prazo: '', prazo_qtd: '', prazo_tipo: 'dias', material: '' }

  async function handleSubmit() {
    if (!form.cliente || !form.servico) return showToast('Preencha os campos obrigatórios', 'danger')
    try {
      if (editando) {
        const atualizada = await updateVenda(editando.id, {
          cliente_nome:    form.cliente,
          servico:         form.servico,
          valor:           parseFloat(form.valor) || 0,
          material:        parseFloat(form.material) || null,
          pagamento:       form.pagamento,
          prazo_pagamento: form.prazo_pagamento || null,
          prazo:           form.prazo,
          status:          editando.status,
          kanban_status:   editando.kanban_status,
        })
        showToast('Venda atualizada!', 'success')
        if (editando.kanban_status !== 'concluido' && editando.status === 'concluido') {
          await gerarContaReceber(atualizada ?? editando)
        }
      } else {
        const clienteObj = clientes.find(c => c.nome === form.cliente)
        await addVenda({
          cliente_id:      clienteObj?.id ?? null,
          cliente_nome:    form.cliente,
          servico:         form.servico,
          valor:           parseFloat(form.valor) || 0,
          material:        parseFloat(form.material) || null,
          pagamento:       form.pagamento,
          prazo_pagamento: form.prazo_pagamento || null,
          prazo:           form.prazo,
          status:          'orcamento',
          kanban_status:   'orcamento',
        })
        showToast('Venda cadastrada com sucesso!', 'success')
      }
      setModalOpen(false)
      setEditando(null)
      setForm(FORM_VAZIO)
    } catch (e) {
      showToast(e.message, 'danger')
    }
  }

  return (
    <div id="page-vendas">
      <div className="topbar">
        <div>
          <div className="topbar-title">Vendas / Orçamentos</div>
          <div className="topbar-sub">Gerencie seus serviços e propostas</div>
        </div>
        <div className="topbar-actions">
          <button className="btn btn-sm btn-outline" onClick={() => exportCSV(vendaFiltrada, 'vendas')}>⬇ CSV</button>
          <button className="btn btn-primary btn-sm" onClick={() => { setEditando(null); setForm(FORM_VAZIO); setModalOpen(true) }}>
            + Nova Venda / Orçamento
          </button>
        </div>
      </div>

      <div className="content">
        {/* Kanban com drag & drop */}
        <div className="card mb-16">
          <div className="card-header">
            <div className="card-title">Painel de Status</div>
            <span style={{ fontSize: 12, color: 'var(--text-s)' }}>Arraste os cards para mudar o status</span>
          </div>
          <div className="kanban">
            {(() => { const umMesAtras = new Date(); umMesAtras.setMonth(umMesAtras.getMonth() - 1); return kanbanColunas.map(col => {
              const cards = vendas.filter(v => {
                if (v.kanban_status !== col) return false
                if (Number(v.arquivado)) return false
                if (col === 'recebido') {
                  const d = new Date(v.criado_em ?? v.created_at ?? 0)
                  return d >= umMesAtras
                }
                return true
              })
              const pg = kanbanPage[col] || 1
              const totalPgs = Math.max(1, Math.ceil(cards.length / KANBAN_PER_PAGE))
              const safePg = Math.min(pg, totalPgs)
              const cardsVisiveis = cards.slice((safePg - 1) * KANBAN_PER_PAGE, safePg * KANBAN_PER_PAGE)
              const canDrop = dragItem ? (transicoesPermitidas[dragItem.kanban_status] ?? []).includes(col) : false
              return (
                <div
                  key={col}
                  className={`kanban-col${dragOver === col ? (canDrop ? ' kanban-col-over' : ' kanban-col-blocked') : ''}`}
                  onDragOver={e => { e.preventDefault(); setDragOver(col) }}
                  onDragLeave={() => setDragOver(null)}
                  onDrop={e => { e.preventDefault(); handleDrop(col); setDragOver(null) }}
                >
                  <div className="kanban-col-header">
                    {statusLabels[col]}
                    <span className="kanban-col-count">{cards.length}</span>
                  </div>
                  {cardsVisiveis.map(v => (
                    <div
                      key={v.id}
                      className="kanban-card"
                      style={{ borderLeftColor: kanbanColors[col] }}
                      draggable
                      onDragStart={() => setDragItem(v)}
                      onDragEnd={() => { setDragItem(null); setDragOver(null) }}
                    >
                      <div className="kanban-card-name">{v.cliente_nome}</div>
                      <div className="kanban-card-service">{v.servico}</div>
                      <div className="kanban-card-value">
                        R$ {(Number(v.valor) + Number(v.material || 0)).toFixed(2).replace('.', ',')}
                        {v.material > 0 && (
                          <span style={{ fontSize: 10, fontWeight: 400, color: 'var(--text-s)', marginLeft: 4 }}>
                            (mat: R$ {Number(v.material).toFixed(2).replace('.', ',')})
                          </span>
                        )}
                      </div>
                      {v.data_envio && <div className="kanban-card-date">Enviado {v.data_envio}</div>}
                    </div>
                  ))}
                  {cards.length === 0 && (
                    <div style={{ padding: '12px 8px', textAlign: 'center', fontSize: 11, color: 'var(--text-xs)', fontStyle: 'italic' }}>
                      {dragItem ? 'Solte aqui' : 'Nenhum serviço'}
                    </div>
                  )}
                  {totalPgs > 1 && (
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 4, padding: '6px 0', fontSize: 11 }}>
                      <button className="pagination-btn" style={{ width: 24, height: 24, fontSize: 11 }}
                        disabled={safePg <= 1} onClick={() => setKanbanPage(p => ({ ...p, [col]: safePg - 1 }))}>‹</button>
                      <span style={{ lineHeight: '24px', color: 'var(--text-s)' }}>{safePg}/{totalPgs}</span>
                      <button className="pagination-btn" style={{ width: 24, height: 24, fontSize: 11 }}
                        disabled={safePg >= totalPgs} onClick={() => setKanbanPage(p => ({ ...p, [col]: safePg + 1 }))}>›</button>
                    </div>
                  )}
                </div>
              )
            }) })()}
          </div>
        </div>

        {/* Resumo de totais */}
        {(() => {
          const ativos = vendas.filter(v => !Number(v.arquivado))
          const totalValor    = ativos.reduce((s, v) => s + Number(v.valor || 0), 0)
          const totalMaterial = ativos.reduce((s, v) => s + Number(v.material || 0), 0)
          const totalGeral    = totalValor + totalMaterial
          const fmt = n => `R$ ${n.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`
          return (
            <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
              {[
                { label: 'Total Serviços', value: fmt(totalValor), color: 'var(--blue)' },
                { label: 'Total Materiais', value: fmt(totalMaterial), color: 'var(--amber)' },
                { label: 'Total Geral', value: fmt(totalGeral), color: 'var(--green)' },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ flex: 1, minWidth: 160, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-s)', marginBottom: 4 }}>{label}</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color }}>{value}</div>
                </div>
              ))}
            </div>
          )
        })()}

        {/* Tabela */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Todos os Serviços</div>
            <div className="flex gap-8">
              <input
                className="form-input"
                style={{ width: 200, padding: '6px 12px', fontSize: 12 }}
                placeholder="Buscar cliente..."
                value={busca}
                onChange={e => setBusca(e.target.value)}
              />
              <select
                className="form-input"
                style={{ width: 140, padding: '6px 12px', fontSize: 12 }}
                value={filtroStatus}
                onChange={e => setFiltroStatus(e.target.value)}
              >
                <option value="">Todos status</option>
                {kanbanColunas.map(c => <option key={c} value={c}>{statusLabels[c]}</option>)}
              </select>
              <button
                className={`btn btn-sm ${mostrarArquivados ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setMostrarArquivados(!mostrarArquivados)}
              >
                {mostrarArquivados ? 'Ver ativos' : 'Arquivados'}
              </button>
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Cliente</th><th>Serviço</th><th>Valor</th><th>Material</th><th>Total</th>
                  <th>Pagamento</th><th>Prazo Pgto</th><th>Execução</th><th>Status</th><th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {pgVendas.paginated.map(v => (
                  <tr key={v.id}>
                    <td data-label="Cliente">
                      <div className="flex items-center gap-8">
                        <div className="avatar">{v.initials}</div>
                        {v.cliente_nome}
                      </div>
                    </td>
                    <td data-label="Serviço">{v.servico}</td>
                    <td data-label="Valor" className="td-bold">R$ {Number(v.valor).toFixed(2).replace('.', ',')}</td>
                    <td data-label="Material">
                      <span style={{ fontSize: 12, color: 'var(--text-s)' }}>
                        {v.material ? `R$ ${Number(v.material).toFixed(2).replace('.', ',')}` : '—'}
                      </span>
                    </td>
                    <td data-label="Total" className="td-bold" style={{ color: 'var(--green)' }}>
                      R$ {(Number(v.valor) + Number(v.material || 0)).toFixed(2).replace('.', ',')}
                    </td>
                    <td data-label="Pagamento">{v.pagamento}</td>
                    <td data-label="Prazo Pgto" style={{ fontSize: 12 }}>{v.prazo_pagamento ? new Date(v.prazo_pagamento + 'T00:00').toLocaleDateString('pt-BR') : '—'}</td>
                    <td data-label="Execução">{v.prazo || '—'}</td>
                    <td data-label="Status"><span className={`status status-${v.status}`}>{statusLabels[v.status] || v.status}</span></td>
                    <td data-label="Ações">
                      <div className="flex gap-8">
                        <button className="btn-icon" title="Editar" onClick={() => abrirEdicao(v)}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{width:14,height:14}}>
                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </button>
                        <span className="wa-chip" onClick={() => abrirWa(v)} title="Enviar via WhatsApp">
                          <WaIcon /> WhatsApp
                        </span>
                        {Number(v.arquivado) ? (
                          <button className="btn-icon" title="Desarquivar" onClick={() => desarquivarVenda(v)}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{width:14,height:14}}>
                              <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
                            </svg>
                          </button>
                        ) : v.kanban_status === 'recebido' ? (
                          <button className="btn-icon" title="Arquivar" style={{color:'var(--amber)'}} onClick={() => arquivarVenda(v)}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{width:14,height:14}}>
                              <path d="M21 8v13H3V8"/><path d="M1 3h22v5H1z"/><path d="M10 12h4"/>
                            </svg>
                          </button>
                        ) : (
                          <button className="btn-icon btn-danger" title="Excluir" onClick={() => { if (confirm(`Excluir venda de ${v.cliente_nome}?`)) removeVenda(v.id).catch(e => showToast(e.message, 'danger')) }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{width:14,height:14}}><polyline points="3,6 5,6 21,6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={pgVendas.page} totalPages={pgVendas.totalPages} total={pgVendas.total} perPage={pgVendas.perPage} onPageChange={pgVendas.goTo} onPerPageChange={pgVendas.changePerPage} />
        </div>
      </div>

      {/* Modal WhatsApp */}
      <Modal title="Enviar via WhatsApp" open={!!waModal} onClose={() => setWaModal(null)}>
        {waModal && (
          <>
            <div className="form-group">
              <label className="form-label">Telefone do cliente</label>
              <input
                className="form-input"
                placeholder="(00) 00000-0000"
                value={waModal.telefone}
                onChange={e => setWaModal({ ...waModal, telefone: maskTelefone(e.target.value) })}
              />
              <div style={{ fontSize: 11, color: 'var(--text-s)', marginTop: 4 }}>
                Somente números com DDD. Ex: 35999990001
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Mensagem</label>
              <textarea
                className="form-input"
                rows={8}
                style={{ resize: 'vertical', fontFamily: 'inherit', fontSize: 13 }}
                value={waModal.mensagem}
                onChange={e => setWaModal({ ...waModal, mensagem: e.target.value })}
              />
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline btn-sm" onClick={() => setWaModal(null)}>Cancelar</button>
              <button
                className="btn btn-primary btn-sm"
                style={{ background: '#25d366', borderColor: '#25d366' }}
                disabled={!waModal.telefone}
                onClick={enviarWa}
              >
                <WaIcon /> Abrir WhatsApp
              </button>
            </div>
          </>
        )}
      </Modal>

      <Modal title={editando ? 'Editar Venda / Orçamento' : 'Nova Venda / Orçamento'} open={modalOpen} onClose={() => { setModalOpen(false); setEditando(null); setForm(FORM_VAZIO) }}>
        <div className="form-row">
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Cliente</label>
            <select className="form-input" value={form.cliente} onChange={e => setForm({ ...form, cliente: e.target.value })}>
              <option value="">Selecione...</option>
              {clientes.map(c => <option key={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Tipo</label>
            <select className="form-input" value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}>
              <option>Venda</option><option>Orçamento</option>
            </select>
          </div>
        </div>
        <div className="form-row" style={{ marginTop: 14 }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Serviço</label>
            <select className="form-input" value={form.servico} onChange={e => setForm({ ...form, servico: e.target.value })}>
              <option value="">Selecione...</option>
              {servicos.map(s => <option key={s.id}>{s.nome}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Valor (R$)</label>
            <input className="form-input" type="number" value={form.valor} onChange={e => setForm({ ...form, valor: e.target.value })} />
          </div>
        </div>
        <div className="form-row" style={{ marginTop: 14 }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Condição de Pagamento</label>
            <select className="form-input" value={form.pagamento} onChange={e => setForm({ ...form, pagamento: e.target.value })}>
              <option>À vista</option><option>Parcelado 2×</option><option>Parcelado 3×</option>
              <option>Parcelado 6×</option><option>Parcelado 12×</option>
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Prazo de Pagamento</label>
            <input className="form-input" type="date" value={form.prazo_pagamento} onChange={e => setForm({ ...form, prazo_pagamento: e.target.value })} />
          </div>
        </div>
        <div className="form-row" style={{ marginTop: 14 }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Prazo de Execução</label>
            <div style={{ display: 'flex', gap: 6 }}>
              <input className="form-input" type="number" min="1" style={{ width: 80 }}
                value={form.prazo_qtd ?? ''} onChange={e => setForm({ ...form, prazo_qtd: e.target.value, prazo: `${e.target.value} ${form.prazo_tipo ?? 'dias'}` })} placeholder="Ex: 5" />
              <select className="form-input" style={{ flex: 1 }}
                value={form.prazo_tipo ?? 'dias'} onChange={e => setForm({ ...form, prazo_tipo: e.target.value, prazo: `${form.prazo_qtd ?? ''} ${e.target.value}` })}>
                <option value="dias">Dia(s)</option>
                <option value="dias úteis">Dia(s) úteis</option>
                <option value="semanas">Semana(s)</option>
                <option value="meses">Mês(es)</option>
              </select>
            </div>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Custo Material (R$)</label>
            <input className="form-input" type="number" value={form.material} onChange={e => setForm({ ...form, material: e.target.value })} placeholder="Opcional" />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline btn-sm" onClick={() => setModalOpen(false)}>Cancelar</button>
          <button className="btn btn-primary btn-sm" onClick={handleSubmit}>Salvar</button>
        </div>
      </Modal>
    </div>
  )
}
