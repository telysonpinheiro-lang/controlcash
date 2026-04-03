import { useState } from 'react'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'
import Modal from '../components/Modal'
import Pagination, { usePagination } from '../components/Pagination'
import WaButton from '../components/WaButton'
import { exportCSV } from '../utils/exportCSV'

export default function Receber() {
  const { contasReceber, addContaReceber, updateContaReceber, removeContaReceber, confirmarRecebimento, clientes, vendas, updateVenda } = useData()
  const { showToast } = useToast()
  const { currentUser } = useAuth()
  const [modalOpen, setModalOpen] = useState(false)
  const [editando, setEditando] = useState(null)
  const [form, setForm] = useState({ cliente: '', referente: '', valor: '', vencimento: '', tipo: 'À vista' })

  const [mostrarArquivados, setMostrarArquivados] = useState(false)

  const contasVisiveis = contasReceber.filter(c =>
    mostrarArquivados ? Number(c.arquivado) : !Number(c.arquivado)
  )
  const pgReceber = usePagination(contasVisiveis)
  const vencidos = contasVisiveis.filter(c => c.status === 'vencido')
  const totalReceber = contasVisiveis.filter(c => c.status !== 'pago').reduce((s, c) => s + Number(c.valor), 0)
  const totalVencido = vencidos.reduce((s, c) => s + Number(c.valor), 0)
  const totalRecebido = contasVisiveis.filter(c => c.status === 'pago').reduce((s, c) => s + Number(c.valor), 0)

  async function arquivarConta(c) {
    try {
      await updateContaReceber(c.id, { arquivado: 1 })
      showToast(`${c.cliente_nome} arquivada`, 'success')
    } catch (e) { showToast(e.message, 'danger') }
  }

  async function desarquivarConta(c) {
    try {
      await updateContaReceber(c.id, { arquivado: 0 })
      showToast(`${c.cliente_nome} desarquivada`, 'success')
    } catch (e) { showToast(e.message, 'danger') }
  }

  function abrirEdicao(c) {
    setEditando(c)
    setForm({ cliente: c.cliente_nome, referente: c.referente || '', valor: c.valor, vencimento: '', tipo: c.tipo || 'À vista' })
    setModalOpen(true)
  }

  async function handleSubmit() {
    if (!form.cliente || !form.valor) return showToast('Preencha os campos obrigatórios', 'danger')
    if (!editando && !form.vencimento) return showToast('Informe a data de vencimento', 'danger')
    try {
      if (editando) {
        await updateContaReceber(editando.id, {
          cliente_nome: form.cliente,
          referente:    form.referente,
          valor:        parseFloat(form.valor),
          vencimento:   form.vencimento || editando.vencimento,
          tipo:         form.tipo,
        })
        showToast('Recebimento atualizado!', 'success')
      } else {
        const clienteObj = clientes.find(c => c.nome === form.cliente)
        await addContaReceber({
          cliente_id:   clienteObj?.id ?? null,
          cliente_nome: form.cliente,
          referente:    form.referente,
          valor:        parseFloat(form.valor),
          vencimento:   form.vencimento,
          tipo:         form.tipo,
          status:       'pendente',
          dias_atraso:  0,
          initials:     form.cliente.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase(),
        })
        showToast('Recebimento lançado!', 'success')
      }
      setModalOpen(false)
      setEditando(null)
      setForm({ cliente: '', referente: '', valor: '', vencimento: '', tipo: 'À vista' })
    } catch (e) {
      showToast(e.message, 'danger')
    }
  }

  async function handleConfirmar(id, clienteNome, referente) {
    try {
      await confirmarRecebimento(id)
      showToast(`Pagamento de ${clienteNome} confirmado!`, 'success')

      // Move a venda correspondente para "recebido" no kanban
      const venda = (vendas ?? []).find(v =>
        v.cliente_nome === clienteNome &&
        v.servico === referente &&
        v.kanban_status !== 'recebido'
      )
      if (venda) {
        try {
          await updateVenda(venda.id, {
            cliente_nome: venda.cliente_nome,
            servico: venda.servico,
            valor: venda.valor,
            material: venda.material,
            pagamento: venda.pagamento,
            prazo: venda.prazo,
            prazo_pagamento: venda.prazo_pagamento,
            status: 'recebido',
            kanban_status: 'recebido',
          })
          showToast(`${clienteNome} movido para Recebido no kanban`, 'info')
        } catch {
          showToast('Pagamento confirmado, mas erro ao atualizar o kanban. Atualize a página.', 'warning')
        }
      }
    } catch (e) {
      showToast(e.message, 'danger')
    }
  }

  return (
    <div id="page-receber">
      <div className="topbar">
        <div>
          <div className="topbar-title">Contas a Receber</div>
          <div className="topbar-sub">Pagamentos de clientes</div>
        </div>
        <div className="topbar-actions">
          <button className="btn btn-sm btn-outline" onClick={() => exportCSV(contasReceber, 'contas_receber')}>⬇ CSV</button>
          <button className="btn btn-primary btn-sm" onClick={() => setModalOpen(true)}>+ Lançar Recebimento</button>
        </div>
      </div>

      <div className="content">
        <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
          <div className="metric-card green">
            <div className="metric-label">A Receber</div>
            <div className="metric-value green">R$ {totalReceber.toFixed(2).replace('.', ',')}</div>
            <div className="metric-delta">{contasReceber.filter(c => c.status !== 'pago').length} pendências</div>
          </div>
          <div className="metric-card red">
            <div className="metric-label">Em Atraso</div>
            <div className="metric-value red">R$ {totalVencido.toFixed(2).replace('.', ',')}</div>
            <div className="metric-delta">{vencidos.length} clientes</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Recebido no Mês</div>
            <div className="metric-value">R$ {totalRecebido.toFixed(2).replace('.', ',')}</div>
            <div className="metric-delta">{contasReceber.filter(c => c.status === 'pago').length} pagamentos</div>
          </div>
        </div>

        {vencidos.length > 0 && (
          <div className="alert-box danger mb-16">
            <svg className="alert-icon" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <div style={{ flex: 1 }}>
              <div className="alert-title">{vencidos.length} pagamento(s) em atraso</div>
              <div className="alert-text">Total de R$ {totalVencido.toFixed(2).replace('.', ',')} vencidos. Envie cobranças pelo WhatsApp agora.</div>
              <div className="alert-actions">
                {vencidos.map(v => (
                  <WaButton
                    key={v.id}
                    nome={v.cliente_nome}
                    telefone={v.telefone}
                    userId={currentUser?.id}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="card">
          <div className="card-header">
            <div className="card-title">Recebimentos</div>
            <button className={`btn btn-sm ${mostrarArquivados ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setMostrarArquivados(!mostrarArquivados)}>
              {mostrarArquivados ? 'Ver ativos' : 'Arquivados'}
            </button>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Cliente</th><th>Referente</th><th>Valor</th><th>Vencimento</th>
                  <th>Tipo</th><th>Status</th><th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {pgReceber.paginated.map(c => (
                  <tr key={c.id}>
                    <td>
                      <div className="flex items-center gap-8">
                        <div className="avatar">{c.initials}</div>
                        {c.cliente_nome}
                      </div>
                    </td>
                    <td>{c.referente}</td>
                    <td className="td-bold">R$ {Number(c.valor).toFixed(2).replace('.', ',')}</td>
                    <td>{c.vencimento}</td>
                    <td><span className="tag">{c.tipo}</span></td>
                    <td>
                      <span className={`status status-${c.status}`}>
                        {c.status === 'vencido'
                          ? `Vencido ${c.dias_atraso}d`
                          : c.status === 'pago' ? 'Recebido' : 'Pendente'}
                      </span>
                    </td>
                    <td>
                      <div className="flex gap-8">
                        {Number(c.arquivado) ? (
                          <button className="btn-icon" title="Desarquivar" onClick={() => desarquivarConta(c)}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{width:14,height:14}}>
                              <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
                            </svg>
                          </button>
                        ) : c.status === 'pago' ? (
                          <button className="btn-icon" title="Arquivar" style={{color:'var(--amber)'}} onClick={() => arquivarConta(c)}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{width:14,height:14}}>
                              <path d="M21 8v13H3V8"/><path d="M1 3h22v5H1z"/><path d="M10 12h4"/>
                            </svg>
                          </button>
                        ) : (
                          <button className="btn-icon btn-danger" title="Excluir" onClick={() => { if (confirm(`Excluir conta de ${c.cliente_nome}?`)) removeContaReceber(c.id).catch(e => showToast(e.message, 'danger')) }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{width:14,height:14}}><polyline points="3,6 5,6 21,6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
                          </button>
                        )}
                        {c.status !== 'pago' && (
                          <button className="btn-icon" onClick={() => abrirEdicao(c)}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{width:14,height:14}}><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                          </button>
                        )}
                        {c.status === 'vencido' && (
                          <WaButton nome={c.cliente_nome} telefone={c.telefone || (clientes.find(cl => cl.nome === c.cliente_nome))?.telefone} userId={currentUser?.id} label="Cobrar" />
                        )}
                        {c.status === 'pendente' && (
                          <button className="btn btn-sm btn-success" onClick={() => handleConfirmar(c.id, c.cliente_nome, c.referente)}>
                            Confirmar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={pgReceber.page} totalPages={pgReceber.totalPages} total={pgReceber.total} perPage={pgReceber.perPage} onPageChange={pgReceber.goTo} onPerPageChange={pgReceber.changePerPage} />
        </div>
      </div>

      <Modal title={editando ? 'Editar Recebimento' : 'Lançar Recebimento'} open={modalOpen} onClose={() => { setModalOpen(false); setEditando(null); setForm({ cliente: '', referente: '', valor: '', vencimento: '', tipo: 'À vista' }) }}>
        <div className="form-row">
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Cliente</label>
            <select className="form-input" value={form.cliente} onChange={e => setForm({ ...form, cliente: e.target.value })}>
              <option value="">Selecione...</option>
              {clientes.map(c => <option key={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Valor (R$)</label>
            <input className="form-input" type="number" value={form.valor} onChange={e => setForm({ ...form, valor: e.target.value })} />
          </div>
        </div>
        <div className="form-row" style={{ marginTop: 14 }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Referente</label>
            <input className="form-input" value={form.referente} onChange={e => setForm({ ...form, referente: e.target.value })} placeholder="Ex: Parcela 1/3" />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Vencimento</label>
            <input className="form-input" type="date" value={form.vencimento} onChange={e => setForm({ ...form, vencimento: e.target.value })} />
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
